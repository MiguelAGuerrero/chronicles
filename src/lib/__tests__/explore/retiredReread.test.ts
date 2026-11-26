// tend explore T65 (decision 0267, amending E4; decision 0254, HK9, HK10): an area whose checklist items hold a kind a
// split retired (`RETIRED`, `discovery/subtypes.ts`: `towers`) counts as stale on entry, beside `archiveStale`, so it is
// read again on the next walk there and its towers take their own kinds. Nothing is stored anew and nothing migrates.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import type { PlaceCandidate } from '../../areas/types';
import type { Kind, Place } from '../../discovery/types';
import { buildChecklists, checklistKey, readCentre, retiredAimed, retiredAreas, retiredToMark, type ChecklistArea, type ChecklistItem } from '../../explore/explore';

const ROOT = join(__dirname, '../../../..');
const src = (p: string) => readFileSync(join(ROOT, p), 'utf8');

const CENTRE: [number, number] = [-75.19, 40.69];
const fox: PlaceCandidate = { level: 'neighborhood', name: 'Fox', at: CENTRE, reachM: 1000 };
const FOX = checklistKey({ level: 'neighborhood', name: 'Fox', at: CENTRE });
const area: ChecklistArea = { key: FOX, level: 'neighborhood', name: 'Fox', at: CENTRE, build: 'b1', built_at: 1, count: 1, archive: 'v1' };
const item = (key: string, kind: Kind, area_key: string | null = FOX): ChecklistItem => ({
  key, area_key, name: key, category: 'history', kind, at: [CENTRE[0] + 0.001, CENTRE[1]], generic: false,
});
const reads = [{ centre: CENTRE, build: 'b1' }];

test('tend explore T65: an area whose items hold a retired kind counts as stale on entry; its own kinds, or none, do not', () => {
  assert.deepEqual([...retiredAreas([item('a', 'towers'), item('b', 'water_towers', 'other'), item('c', 'towers', null)])], [FOX], 'the area holding `towers`; an orphan has no area to read');
  assert.deepEqual([...retiredAreas([item('a', 'water_towers'), item('b', 'clock_towers'), item('c', 'monuments')])], [], 'the kinds that replaced it are current');
  assert.deepEqual([...retiredAreas([item('a', 'towers')], new Set([FOX]))], [], 'an area already read again for it on this screen is not asked twice');
  const at = { fix: CENTRE, candidates: [fox], areas: [area], reads, build: 'b1', archive: 'v1' };
  assert.equal(readCentre(at), null, 'built for this build and this archive: nothing to read');
  assert.deepEqual(readCentre({ ...at, retired: new Set([FOX]) }), CENTRE, 'its items hold a retired kind: read again around the area');
  assert.equal(readCentre({ ...at, retired: new Set(['another area']) }), null, 'another area\'s retired kind reads nothing here');
});

test('tend explore T65: read again, the towers take their own kinds and the area is no longer stale, so it is not read in a loop', () => {
  const tower = (name: string, kind: Kind, dx: number): Place => ({
    key: `${kind}:${name}`, name, category: 'history', at: [CENTRE[0] + dx, CENTRE[1]], generic: false, build: 'b1', markable: true, kind,
  });
  const places = [tower('Fox Water Tower', 'water_towers', 0.001), tower('Town Clock', 'clock_towers', -0.001)];
  // Kept as built, the area is skipped and its old items stay: that is why the read leaves it out of `built`.
  assert.equal(buildChecklists({ places, candidates: [fox], centre: CENTRE, build: 'b1', now: 2, archive: 'v1', built: [area] }).areas.length, 0);
  const again = buildChecklists({ places, candidates: [fox], centre: CENTRE, build: 'b1', now: 2, archive: 'v1', built: [] });
  assert.deepEqual(again.areas.map((a) => a.key), [FOX], 'the area is built again with the same key, so its old items are replaced');
  assert.deepEqual(again.items.map((i) => [i.name, i.kind, i.area_key]), [['Fox Water Tower', 'water_towers', FOX], ['Town Clock', 'clock_towers', FOX]]);
  assert.equal(again.areas[0].count, 2, 'the same places, the same count');
  const rebuilt = retiredAreas(again.items);
  assert.equal(rebuilt.size, 0);
  assert.equal(readCentre({ fix: CENTRE, candidates: [fox], areas: again.areas, reads, build: 'b1', archive: 'v1', retired: rebuilt }), null, 'read once, then left');
});

test('tend explore T65: the read leaves an area holding a retired kind out of what it keeps, and the walk asks once per area', () => {
  const run = src('src/lib/explore/exploreRun.ts');
  // Every item of an area the read sees whole lies within 1.5 km of the area's point, itself within 1.5 km of the centre.
  assert.match(run, /db\.checklistItemsIn\(boundsOf\(\[centre\], EXPLORE_RULES\.readM \* 2\)!\)/, 'the read looks at the items of every area it can see whole');
  assert.match(run, /built: done\.filter\(\(a\) => a\.build === build && !archiveStale\(a\.archive, archiveAt\(a\.at\)\) && !retired\.has\(a\.key\)\)/);
  const walk = src('src/lib/explore/useExplore.ts');
  const maybe = walk.slice(walk.indexOf('const maybeRead = useCallback'), walk.indexOf('const { here, places } = opts;'));
  assert.match(maybe, /const retired = retiredAreas\(held\.current, retiredTried\.current\);/, 'the items around you, less those already read again');
  assert.match(maybe, /const ask = \{ fix, candidates, areas: k\.areas, reads: k\.reads, build, archive: \(at: LngLat\) => placesArchive\.versionAt\(at\), retired \};\n\s*let centre = readCentre\(ask\);\n\s*aimed = retiredAimed\(ask, centre\);/);
  // tend explore audit 56: after the read and its items, only the area it was aimed at, if left as it was.
  assert.match(maybe, /if \(!read\) return;\n\s*await loadItems\(fix\);\n[^\n]*\n\s*const left = retiredToMark\(aimed, held\.current\);\n\s*if \(left\) retiredTried\.current\.add\(left\);/, 'an area a read left as it was is not read again for it on this screen');
  assert.match(walk, /if \(got\) held\.current = got;/, 'the items loaded around you are what the check reads');
});

test('tend explore audit 55: a town stale for a retired kind is read around its own stored point, so a read heals it', () => {
  // The town's z14 point (stored) and its z11 point (listed by the earliest read) 300 m apart: one area by `sameArea`.
  const p14: [number, number] = [CENTRE[0] + 0.004, CENTRE[1] + 0.0004];
  const town = (at: [number, number]): PlaceCandidate => ({ level: 'town', name: 'Ward Hill', at, reachM: 3000 });
  const KEY = checklistKey({ level: 'town', name: 'Ward Hill', at: p14 });
  const stored: ChecklistArea = { key: KEY, level: 'town', name: 'Ward Hill', at: p14, build: 'b1', built_at: 1, count: 1, archive: 'v1' };
  const at = { fix: CENTRE, candidates: [town(CENTRE)], areas: [stored], reads, build: 'b1', archive: 'v1' };
  assert.equal(readCentre(at), null, 'kept: nothing to read');
  assert.deepEqual(readCentre({ ...at, retired: new Set([KEY]) }), p14, 'read around the stored point, not the listed one');
  // A read around the listed point cannot build the town again (it sees it whole only from its own point); around p14 it can.
  const tower: Place = { key: 'water_towers:Ward Hill Tower', name: 'Ward Hill Tower', category: 'history', at: [p14[0] + 0.001, p14[1]], generic: false, build: 'b1', markable: true, kind: 'water_towers' };
  const from = (centre: [number, number]) => buildChecklists({ places: [tower], candidates: [town(p14)], centre, build: 'b1', now: 2, archive: 'v1', built: [] });
  assert.deepEqual(from(CENTRE).areas, []);
  assert.deepEqual(from(p14).areas.map((a) => a.key), [KEY], 'rebuilt under its own key, so its old items are replaced');
  // An area stale only for its archive keeps main's way: read around the point listed.
  assert.deepEqual(readCentre({ ...at, archive: 'v2' }), CENTRE);
});

test('tend explore audit 56: only the area a read was aimed at, and left as it was, is not asked again on this screen', () => {
  // Fox holds towers and the walker is in it; Elm, 1.2 km off, holds towers too but no read here aims at it.
  const elmAt: [number, number] = [CENTRE[0] + 0.0142, CENTRE[1]];
  const ELM = checklistKey({ level: 'neighborhood', name: 'Elm', at: elmAt });
  const elm: ChecklistArea = { ...area, key: ELM, name: 'Elm', at: elmAt };
  const at = { fix: CENTRE, candidates: [fox, { ...fox, name: 'Elm', at: elmAt }], areas: [area, elm], reads, build: 'b1', archive: 'v1', retired: new Set([FOX, ELM]) };
  const centre = readCentre(at);
  assert.deepEqual(centre, CENTRE);
  assert.equal(retiredAimed(at, centre), FOX, 'the read is aimed at Fox, the area the walker is in');
  const left = [item('a', 'towers'), item('e', 'towers', ELM)];
  assert.equal(retiredToMark(retiredAimed(at, centre), left), FOX, 'Fox left as it was: not asked again');
  assert.equal(retiredToMark(retiredAimed(at, centre), [item('a', 'water_towers'), item('e', 'towers', ELM)]), null, 'Fox healed: nothing to mark, and Elm, never aimed at, never marked');
  assert.equal(retiredAimed(at, null), null, 'no read, no aim');
  // A read around the fix for another reason (no read of this build within 1 km) is not aimed at the area.
  assert.equal(retiredAimed({ ...at, reads: [] }, readCentre({ ...at, reads: [] })), null);
});

test('tend explore audit 57: after a route\'s reads, the items around you that the check reads are loaded again', () => {
  const walk = src('src/lib/explore/useExplore.ts');
  const route = walk.slice(walk.indexOf('const routePath = places ? opts.routePath : null;'), walk.indexOf('// Named within 60 m'));
  assert.match(route, /if \(centre\) \{\n\s*if \(!\(await readAt\(centre, \(\) => !alive\)\)\) break;\n\s*readAny = true;\n\s*\}/, 'a route read that happened is noted');
  assert.match(route, /const at = itemsAt\.current;\n\s*if \(readAny && at && alive\) await loadItems\(at\)\.catch\(\(\) => \{\}\);/, 'then the items around you (held) are read again');
  assert.match(route, /\}, \[routePath, loadKnown, loadItems, readAt\]\);/);
});
