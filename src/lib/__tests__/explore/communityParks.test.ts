/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { ATLAS_CODE, ATLAS_LABEL, ringOf, waitingKinds } from '../../atlas/atlas';
import { archivePlace } from '../../discovery/archivePois';
import { barsOf, passesBy } from '../../discovery/bars';
import { refineRead } from '../../discovery/refinements';
import { placesFromTilePois } from '../../discovery/tilePois';
import type { Kind, Place } from '../../discovery/types';
import { placeToRow } from '../../db/placeRow';
import { notableBeyondNeighbourhood, notableName } from '../../presence/notable';
import { findFor, foundLine, KINDS, parseHidden, routeMarks, visibleMarks, type ChecklistItem } from '../../explore/explore';
import type { RoadFeature } from '../../streets';
import type { LngLat } from '../../types';

// Community parks (PC1-PC17), written from specs/community-parks/spec.md before the code.

const CP = 'community_parks' as Kind;
const O: LngLat = [-75.47, 40.6];
const mLon = 111320 * Math.cos((O[1] * Math.PI) / 180);
const at = (e: number, n = 0): LngLat => [O[0] + e / mLon, O[1] + n / 110540];
const poi = (cls: string, sub: string, name: string, p: LngLat) => ({ geometry: { type: 'Point', coordinates: p }, properties: { class: cls, subclass: sub, name }, zoom: 14 });
const park = (name: string, p: LngLat = at(0)) => poi('park', 'park', name, p);
/** A square park outline of `side` metres centred on `c`: OpenMapTiles' landcover, grass/park. */
const ring = (c: LngLat, side: number): LngLat[] => {
  const h = side / 2;
  return [at(-h, -h), at(h, -h), at(h, h), at(-h, h), at(-h, -h)].map(([x, y]) => [c[0] + (x - O[0]), c[1] + (y - O[1])] as LngLat);
};
const grass = (rings: LngLat[][] | LngLat[][][], multi = false): RoadFeature => ({
  geometry: multi ? { type: 'MultiPolygon', coordinates: rings } : { type: 'Polygon', coordinates: rings },
  properties: { class: 'grass', subclass: 'park' },
});
const read = (features: ReturnType<typeof poi>[], landcover?: RoadFeature[], archive: Place[] = []) => refineRead(placesFromTilePois(features, 'b'), { landcover, archive });
const kindOf = (places: Place[], name: string) => places.find((p) => p.name === name)?.kind;


test('PC1: a community word with nothing near is community_parks; any other park is parks', () => {
  assert.equal(kindOf(read([park('Elm Street Playground')]), 'Elm Street Playground'), CP);
  assert.equal(kindOf(read([park('Cedar Playfield')]), 'Cedar Playfield'), CP);
  assert.equal(kindOf(read([park('Maple Tot Lot')]), 'Maple Tot Lot'), CP);
  assert.equal(kindOf(read([park('Cedar Park')]), 'Cedar Park'), 'parks');
  assert.equal(kindOf(read([park('Riverside Gardens')]), 'Riverside Gardens'), 'parks');
});

test('PC2: each notable signal keeps a park', () => {
  const n = 'Elm Street Playground';
  const keep = (...more: ReturnType<typeof poi>[]) => kindOf(read([park(n), ...more], [grass([ring(at(0), 120)])]), n);
  assert.equal(keep(poi('monument', 'memorial', 'Soldiers Memorial', at(20, 10))), 'parks', 'a monument inside');
  assert.equal(keep(poi('art_gallery', 'artwork', '', at(-20, 5))), 'parks', 'an unnamed artwork inside');
  assert.equal(keep(poi('attraction', 'viewpoint', 'The Overlook', at(10, -20))), 'parks', 'a viewpoint inside');
  assert.equal(keep(poi('museum', 'museum', 'Park Museum', at(15, 15))), 'parks', 'a museum inside');
  assert.equal(keep(), CP, 'the same ring with nothing inside');
  assert.equal(kindOf(read([park('Franklin Memorial Playground')]), 'Franklin Memorial Playground'), 'parks', 'a notable word in the name');
  assert.equal(kindOf(read([park('Valley State Park Playground')]), 'Valley State Park Playground'), 'parks', 'a notable phrase in the name');
  assert.equal(kindOf(read([park(n)], [grass([ring(at(0), 300)])]), n), 'parks', 'an outline of 5 ha or more (300 m square is 9 ha)');
  // The archive: a place within 150 m keeps it a park, in the refinement's context.
  assert.equal(kindOf(read([park(n)]), n), CP);
  const arch = [archivePlace('Elm Street Mill', 'historic_site', at(100), 'v')].filter((p): p is Place => !!p);
  assert.equal(kindOf(read([park(n)], undefined, arch), n), 'parks', 'an archive place within 150 m');
  const far = [archivePlace('Elm Street Mill', 'historic_site', at(400), 'v')].filter((p): p is Place => !!p);
  assert.equal(kindOf(read([park(n)], undefined, far), n), CP, 'an archive place 400 m away');
  // With no outline a signal within 60 m of the point counts, one 200 m away does not.
  assert.equal(kindOf(read([park(n), poi('monument', 'memorial', 'Soldiers Memorial', at(40))]), n), 'parks');
  assert.equal(kindOf(read([park(n), poi('monument', 'memorial', 'Soldiers Memorial', at(200))]), n), CP);
});

test('PC3: no outline is judged by its name and what is near it; an incomplete read judges nothing', () => {
  assert.equal(kindOf(read([park('Cedar Park')]), 'Cedar Park'), 'parks');
  assert.equal(kindOf(read([park('Liberty State Park')]), 'Liberty State Park'), 'parks');
  assert.deepEqual(placesFromTilePois([park('Elm Street Playground')], 'b', { complete: false }), []);
});

test('PC4: both kinds are of the parks category and markable, and a dog park is still no mark', () => {
  const places = read([park('Elm Street Playground'), park('Cedar Park', at(500)), poi('dog_park', 'dog_park', 'Bark Run', at(900))]);
  const [a, b, d] = ['Elm Street Playground', 'Cedar Park', 'Bark Run'].map((n) => places.find((p) => p.name === n)!);
  assert.equal(a.category, 'parks');
  assert.equal(b.category, 'parks');
  assert.equal(a.markable, true);
  assert.equal(b.markable, true);
  assert.equal(a.kind, CP);
  assert.equal(b.kind, 'parks');
  assert.equal(d.markable, false);
});

test('PC5: a park drawn as several rings is judged whole, and two points in one outline are judged alike', () => {
  const rings: LngLat[][][] = [[ring(at(0), 80)], [ring(at(400), 80)]];
  const lc = [grass(rings, true)];
  const names = ['Elm Street Playground', 'Oak Playfield'];
  const withSignal = read([park(names[0], at(0)), park(names[1], at(400)), poi('monument', 'memorial', 'Soldiers Memorial', at(405, 5))], lc);
  assert.equal(kindOf(withSignal, names[1]), 'parks', 'the point in the ring that holds the signal');
  assert.equal(kindOf(withSignal, names[0]), CP, 'the other ring has none');
  const one = read([park(names[0], at(-20)), park(names[1], at(20)), poi('monument', 'memorial', 'Soldiers Memorial', at(0, 30))], [grass([ring(at(0), 120)])]);
  assert.equal(kindOf(one, names[0]), 'parks');
  assert.equal(kindOf(one, names[1]), 'parks');
});

test('PC6: Community parks is a kind after Parks with an icon of its own, on by default', () => {
  const i = KINDS.findIndex((k) => k.id === 'parks');
  const k = KINDS[i + 1];
  assert.equal(k?.id, CP);
  assert.equal(k.label, 'Community parks');
  assert.ok(!['reader-outline', 'leaf-outline'].includes(k.icon));
  assert.equal(new Set(KINDS.map((x) => x.icon)).size, KINDS.length, 'no icon twice');
  assert.equal(parseHidden(null).has(CP), false);
  assert.equal(parseHidden(JSON.stringify(['theatres'])).has(CP), false, 'a choice saved before it existed');
  assert.equal(parseHidden(JSON.stringify(['museums']), JSON.stringify(['museums'])).has(CP), false, 'museums off does not take it off');
});

test('PC7: nothing calls a park plain, notable or counts either kind', () => {
  const banned = /mundane|boring|ordinary|plain|notable|hidden gem|just a|only/i;
  const label = KINDS.find((k) => k.id === CP)?.label ?? '';
  assert.ok(label && !banned.test(label) && !/\d/.test(label), `the label "${label}"`);
  const words = JSON.parse(readFileSync(new URL('../../discovery/communityWords.json', import.meta.url), 'utf8')) as { words: string[] };
  assert.ok(words.words.length > 0);
  for (const f of ['../../discovery/parkKind.ts']) assert.doesNotMatch(readFileSync(new URL(f, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''), /['"`][^'"`]*(mundane|boring|ordinary|hidden gem)[^'"`]*['"`]/i, 'no such copy in code');
});

const item = (key: string, kind: Kind, p: LngLat): ChecklistItem => ({ key, area_key: null, name: key, category: 'parks', kind, at: p, generic: false });

test('PC8: with the kind off a community park is no "?"; every other park shows; a found one stays', () => {
  const items = [item('playground', CP, at(10)), item('memorial', 'parks', at(20)), item('foundplay', CP, at(30))];
  const base = { items, here: at(0), rangeM: 300, found: new Set(['foundplay']), revealed: new Set<string>() };
  const off = visibleMarks({ ...base, hidden: new Set<Kind>([CP]) });
  assert.deepEqual(off.map((m) => m.item.key).sort(), ['foundplay', 'memorial']);
  assert.equal(off.find((m) => m.item.key === 'foundplay')!.state, 'found');
  const on = visibleMarks({ ...base, hidden: new Set<Kind>() });
  assert.deepEqual(on.map((m) => m.item.key).sort(), ['foundplay', 'memorial', 'playground']);
  const route: LngLat[] = [at(0), at(100)];
  const routed = routeMarks({ items, route, rangeM: 100, exclude: new Set(), found: new Set(), hidden: new Set<Kind>([CP]) });
  assert.deepEqual(routed.map((i) => i.key), ['memorial']);
  // Waiting kinds are categories: Green stays while a park is waiting, goes when only community parks are.
  const mark = (key: string, kind: Kind) => ({ key, name: key, category: 'parks' as const, at: at(0), generic: false, build: 'b', kind });
  assert.deepEqual(waitingKinds([mark('a', CP), mark('b', 'parks')], new Set(), new Set<Kind>([CP])), ['parks']);
  assert.deepEqual(waitingKinds([mark('a', CP)], new Set(), new Set<Kind>([CP])), []);
});

test('PC9: a community park is found by a capture within 60 m and shows by name in the replay', () => {
  const items = [item('Elm Street Playground', CP, at(30))];
  assert.equal(findFor(at(0), items, new Set())?.key, 'Elm Street Playground');
  assert.equal(foundLine({ name: 'Elm Street Playground', category: 'parks', generic: false, kind: CP }), 'Found: Elm Street Playground · Community parks');
});

test('PC10: a community park lights Green as a park does, in the same category', () => {
  const steps = (name: string) => ringOf(read([park(name), park('Oak Park', at(300)), poi('monument', 'memorial', 'Soldiers Memorial', at(2000))]), null, O).steps.parks;
  assert.equal(steps('Elm Street Playground'), steps('Elm Street Park'));
  const p = read([park('Elm Street Playground')])[0];
  assert.deepEqual(barsOf(p), ['parks']);
  assert.equal(ATLAS_LABEL.parks, 'Green', 'the atlas names the bar, never the kind');
});

test('PC11: the judgement is the same for the same input, and no outline read is parks', () => {
  const f = [park('Cedar Park'), park('Elm Street Playground', at(300))];
  const lc = [grass([ring(at(300), 60)])];
  assert.deepEqual(read(f, lc), read(f, lc));
  assert.equal(kindOf(read(f), 'Cedar Park'), 'parks');
});

test('PC12: nothing is fetched to sort: the judgement is synchronous and the modules reach no network or store', () => {
  assert.ok(Array.isArray(read([park('Elm Street Playground')])));
  for (const f of ['../../discovery/tilePois.ts', '../../discovery/parkKind.ts', '../../discovery/refine.ts', '../../discovery/refinements.ts', '../../discovery/green.ts']) {
    const src = readFileSync(new URL(f, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    assert.doesNotMatch(src, /\bfetch\(|getMeta|Date\.now|Math\.random|from '\.\.\/db/, f);
  }
});

test('PC13: ATLAS_CODE is past a8 (a9, a10 since tend explore T9) and a stored place carries no kind', () => {
  assert.ok(/^a1[012]\./.test(ATLAS_CODE), ATLAS_CODE);
  const p = read([park('Elm Street Playground')])[0];
  assert.equal(p.kind, CP);
  assert.ok(!('kind' in placeToRow(p)));
});

test('PC14: the named cases', () => {
  const n = (names: string[], lc?: RoadFeature[], ps?: ReturnType<typeof poi>[]) => read(names.map((x, i) => park(x, at(i * 600))).concat(ps ?? []), lc);
  assert.equal(kindOf(n(['Elm Street Playground'], [grass([ring(at(0), 80)])]), 'Elm Street Playground'), CP);
  assert.equal(kindOf(n(['Cedar Park'], [grass([ring(at(0), 60)])]), 'Cedar Park'), CP, 'fix community-park: a small outline with nothing in it');
  assert.equal(kindOf(n(['Cedar Playground'], [grass([ring(at(0), 60)])], [poi('monument', 'memorial', 'Plaque', at(10, 10))]), 'Cedar Playground'), 'parks');
  assert.equal(kindOf(n(['Cedar Playground'], [grass([ring(at(0), 60)])], [poi('art_gallery', 'artwork', '', at(-10, 10))]), 'Cedar Playground'), 'parks');
  assert.equal(kindOf(n(['Riverside Playground'], [grass([ring(at(0), 350)])]), 'Riverside Playground'), 'parks');
  assert.equal(kindOf(n(['Liberty State Park']), 'Liberty State Park'), 'parks');
  // The owner's recollection of the Allentown park (Nov 11); its real tiles can't be reached from the session that wrote this.
  assert.equal(kindOf(n(['Franklin Memorial Park'], [grass([ring(at(0), 40)])]), 'Franklin Memorial Park'), 'parks');
});

test('PC15: the planner counts both kinds as parks, and a route still passes a community park', () => {
  assert.equal(passesBy({ kind: CP }), true);
  // specs/presence-readers PS2: the bars read a place's classes; a refinement changes its kind, never its classes.
  const refined = read([park('Elm Street Playground')]).find((p) => p.name === 'Elm Street Playground')!;
  assert.equal(refined.kind, CP);
  assert.deepEqual(barsOf(refined), ['parks']);
});

test('PC16: an unfound place is never named for its kind: the bars and waiting kinds are categories', () => {
  assert.ok(!Object.values(ATLAS_LABEL).some((l) => /community/i.test(l)));
  const mark = { key: 'a', name: 'Elm Street Playground', category: 'parks' as const, at: at(0), generic: false, build: 'b', kind: CP };
  assert.deepEqual(waitingKinds([mark], new Set()), ['parks']);
  assert.equal(foundLine({ name: mark.name, category: 'parks', generic: false, kind: CP }).includes('Community parks'), true, 'named once found');
});

test('PC17 (amended, fix community-park): a small outline with nothing notable is a community park without a community word; nothing else is', () => {
  const k = (name: string, lc?: RoadFeature[], more: ReturnType<typeof poi>[] = []) => kindOf(read([park(name), ...more], lc), name);
  for (const side of [30, 60, 90, 130]) assert.equal(k('Cedar Park', [grass([ring(at(0), side)])]), CP, `${side} m square is under 2 ha`);
  for (const side of [150, 200, 300]) assert.equal(k('Cedar Park', [grass([ring(at(0), side)])]), 'parks', `${side} m square is 2 ha or more`);
  assert.equal(k('Cedar Park'), 'parks', 'no outline found: judged by name, and the name says nothing');
  assert.equal(k('Cedar Park', [grass([ring(at(0), 6)])]), 'parks', 'a sliver cut at a tile edge says nothing');
  assert.equal(k('Cedar Park', [grass([ring(at(0), 90)])], [poi('monument', 'memorial', 'Plaque', at(10, 10))]), 'parks', 'a monument inside');
  assert.equal(k('Cedar Park', [grass([ring(at(0), 90)])], [poi('art_gallery', 'artwork', '', at(-10, 10))]), 'parks', 'an unnamed artwork inside');
  assert.equal(k('Franklin Memorial Park', [grass([ring(at(0), 60)])]), 'parks', 'a notable name');
  assert.equal(k('Ridge Arboretum Park', [grass([ring(at(0), 60)])]), 'parks', 'a notable word');
  const arch = [archivePlace('Cedar Mill', 'historic_site', at(100), 'v')].filter((p): p is Place => !!p);
  assert.equal(kindOf(read([park('Cedar Park')], [grass([ring(at(0), 90)])], arch), 'Cedar Park'), 'parks', 'an archive place within 150 m');
});

test('fix community-park audit 1: an outline cut at a tile edge says nothing of size', () => {
  // A z14 tile edge near O: the fragment of a large park, 1.5 ha, with a vertex on the edge.
  const edge = (lon: number) => { const n = 2 ** 14; const x = Math.ceil(((lon + 180) / 360) * n); return (x / n) * 360 - 180; };
  const ex = edge(O[0]);
  const fragment: LngLat[] = [[ex - 0.0012, O[1] - 0.0006], [ex, O[1] - 0.0006], [ex, O[1] + 0.0006], [ex - 0.0012, O[1] + 0.0006], [ex - 0.0012, O[1] - 0.0006]];
  const inside: LngLat = [ex - 0.0006, O[1]];
  const f = grass([fragment]);
  assert.equal(kindOf(read([park('Riverside Park', inside)], [f]), 'Riverside Park'), 'parks', 'a fragment on a tile edge');
  const shifted = fragment.map(([x, y]) => [x - 0.00045, y] as LngLat);
  assert.equal(kindOf(read([park('Riverside Park', [inside[0] - 0.00045, inside[1]])], [grass([shifted])]), 'Riverside Park'), CP, 'the same shape off the edge');
});

test('fix community-park audit 2: the largest outline holding the point decides, in either order; a signal in any keeps it', () => {
  const small = grass([ring(at(0), 90)]);
  const big = grass([ring(at(0), 400)]);
  for (const order of [[small, big], [big, small]]) assert.equal(kindOf(read([park('Cedar Park')], order), 'Cedar Park'), 'parks');
  const museum = poi('museum', 'museum', 'Park Museum', at(150, 0));
  for (const order of [[small, big], [big, small]]) assert.equal(kindOf(read([park('Cedar Park'), museum], order), 'Cedar Park'), 'parks');
});

test('fix community-park audit 4: a mark in the hole of a small ring keeps the park', () => {
  const hole = [at(-10, -10), at(-10, 10), at(10, 10), at(10, -10), at(-10, -10)];
  const rings = [ring(at(0), 120), hole];
  const inRing = at(40, 0);
  assert.equal(kindOf(read([park('Cedar Park', inRing), poi('monument', 'memorial', 'Plaque', at(0, 0))], [grass(rings)]), 'Cedar Park'), 'parks');
  assert.equal(kindOf(read([park('Cedar Park', inRing)], [grass(rings)]), 'Cedar Park'), CP);
});

test('tend explore T9: parkNotable.json holds no word notable.json leaves out as a neighbourhood\'s', () => {
  const list = (f: string) => JSON.parse(readFileSync(new URL(f, import.meta.url), 'utf8')) as { _note: string; words: string[] };
  const notable = list('../../presence/notable.json');
  const parkWords = list('../../discovery/parkNotable.json');
  // notable.json's note names the words it leaves out because they also name neighbourhoods; the park words follow it.
  const left = /left out/.test(notable._note) ? (/\(([^)]*)\)\s*are left out/.exec(notable._note)?.[1] ?? '').split(/,\s*/) : [];
  assert.ok(left.includes('heritage') && left.length >= 5, `the note names its neighbourhood words: ${left.join(', ')}`);
  for (const w of left) assert.ok(!parkWords.words.includes(w), `parkNotable.json holds "${w}"`);
  // Presence's reading, with presence-and-kinds audit 5's read-past of a neighbourhood: these four are plain grounds for play.
  for (const n of ['Old Town Playground', 'Old City Tot Lot', 'Old and New Ball Field', 'Heritage Hills Playground'])
    assert.equal(kindOf(read([park(n)]), n), CP, n);
  // The same reading presence gives a museum: a notable word beside the neighbourhood still keeps a park.
  for (const n of ['Old Mill Playground', 'Old Town Historic Playground', 'Heritage Memorial Playground', 'Old Quarry Ball Field'])
    assert.equal(kindOf(read([park(n)]), n), 'parks', n);
  const src = readFileSync(new URL('../../discovery/parkKind.ts', import.meta.url), 'utf8');
  assert.match(src, /import \{[^}]*\bnotableName\b[^}]*\} from '\.\.\/presence\/notable'/, 'parkKind asks presence\'s rule (tend explore audit 1: past a neighbourhood only before a community word)');
});

test('tend explore audit 1: a park named for an old town or city hall, school, church or cemetery stays a park', () => {
  // The neighbourhood's "Old Town" is read past only where a community word follows it at once; before anything else it
  // names a building, and "Old" there is the notable word (decision 0143: a demotion rests on positive evidence).
  for (const n of ['Old City Hall Play Area', 'Old Town Hall Playground', 'Old Town Hall Courts', 'Old City Cemetery Playground', 'Old Town School Playground',
    'Old Village Church Playground', 'Old City Jail Playground', 'Old City Market Playground', 'Old City Wall Playground'])
    assert.equal(kindOf(read([park(n)]), n), 'parks', n);
  for (const n of ['Old Town Playground', 'Old City Tot Lot', 'Old and New Ball Field', 'Heritage Hills Playground', 'Old Quarter Courts', 'Old & New Playground'])
    assert.equal(kindOf(read([park(n)]), n), CP, n);
  // Presence's own readings are unchanged: a museum in Old Town is not historic, a town hall named "Old Town Hall" is a mark.
  assert.equal(notableBeyondNeighbourhood('Old Town Hall Museum'), false);
  assert.equal(notableName('Old Town Hall'), true);
});

test('tend explore audit 2: a park named for the site of something old stays a park', () => {
  // "Old City" here names what stood on the site, not a neighbourhood (the landing harness, Cleburne TX, with no archive).
  for (const n of ['Site of the Old City Spring Ball Fields', 'Site of the Old Town Well Playground', 'Old Village Green Courts'])
    assert.equal(kindOf(read([park(n)]), n), 'parks', n);
  assert.equal(kindOf(read([park('Old City Ball Fields')]), 'Old City Ball Fields'), CP, 'the neighbourhood just before a community word');
});
