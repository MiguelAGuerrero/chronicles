import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';
import type { LngLat } from '../../types';

// Presence readers (specs/presence-readers, PS1-PS11, decision 0140): the archive, the bars, notable names, scenic greens and
// the planner read presence's classes. readers.golden.json holds what the code answered before the slice: captured from
// 0d03c4b4, then again from main (6b099ea6) when the slice was resumed there (T8), with each mark's kind and rings fed
// landcover outlines (presence-readers audit 8).

type View = { category: string; kind: string | null; markable: boolean; bars: string[] } | null;
type Golden = {
  names: { plain: string; notable: string; hood: string };
  archive: ({ cls: string } & Record<'plain' | 'notable' | 'hood', View>)[];
  osm: ({ cls: string; sub: string } & Record<'plain' | 'notable' | 'hood', View>)[];
  landcover: { cls: string; sub: string; green: string | null }[];
  steps: { file: string; name: string; steps: Record<string, number>; marks: string[]; thin: boolean }[];
  outlined: { file: string; name: string; steps: Record<string, number>; marks: string[]; thin: boolean }[];
};
const golden = JSON.parse(readFileSync(join(__dirname, 'readers.golden.json'), 'utf8')) as Golden;
const lib = join(__dirname, '..', '..');
const src = (f: string) => readFileSync(join(lib, f), 'utf8');
/** presence's module, read loosely so these tests compile before the code they ask for. */
const presence = async () => (await import('../../presence/presence')) as unknown as Record<string, any>;
const AT: LngLat = [-75.47, 40.6];
const pt = (props: Record<string, unknown>, at: LngLat = AT) => ({ geometry: { type: 'Point', coordinates: at }, properties: props, zoom: 14 }) as never;
const view = (barsOf: (p: any) => string[], p: any): View => (p ? { category: p.category, kind: p.kind ?? null, markable: !!p.markable, bars: barsOf(p) } : null);
const CATEGORY_IDS = ['art', 'food', 'shops', 'history', 'parks', 'culture', 'viewpoints', 'nightlife'];
const KIND_IDS = ['public_art', 'museums', 'theatres', 'monuments', 'churches', 'cemeteries', 'parks', 'viewpoints', 'structures', 'curiosities', 'community'];
const quoted = (text: string, w: string) => new RegExp(`['"]${w}['"]`).test(text);

function libFiles(): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) { if (f !== '__tests__' && f !== 'presence') walk(p); } else if (/\.tsx?$/.test(f)) out.push(p);
    }
  };
  walk(lib);
  return out;
}

test('PS1: the archive\'s classes map into presence; archivePois.ts holds no category or kind of its own', async () => {
  const p = await presence();
  const { ARCHIVE_CLASSES } = await import('../../discovery/archivePois');
  assert.equal(typeof p.classesOfArchive, 'function', 'presence holds the archive\'s table');
  for (const [cls, [category, kind]] of Object.entries(ARCHIVE_CLASSES)) {
    const mark = p.markClassOf(p.classesOfArchive(cls));
    assert.deepEqual([p.CLASSES[mark]?.category, p.CLASSES[mark]?.kind], [category, kind], cls);
  }
  for (const g of golden.archive) assert.deepEqual([...(ARCHIVE_CLASSES[g.cls] ?? [])], [g.plain!.category, g.plain!.kind], `PW5's pin: ${g.cls}`);
  const text = src('discovery/archivePois.ts');
  for (const w of [...CATEGORY_IDS, ...KIND_IDS]) assert.ok(!quoted(text, w), `archivePois.ts spells "${w}"`);
});

test('PS2: a place carries its classes; a museum the data calls historic is museum and historic, and lights Culture and History', async () => {
  const { placesFromArchive } = await import('../../discovery/archivePois');
  const { placesFromTilePois } = await import('../../discovery/tilePois');
  const { barsOf } = await import('../../discovery/bars');
  const arch = placesFromArchive([pt({ name: 'Kiln Museum', class: 'museum' })], 'v')[0] as any;
  const tile = placesFromTilePois([pt({ class: 'museum', subclass: 'museum', name: 'Historic Depot Museum' })], 'b')[0] as any;
  const plain = placesFromTilePois([pt({ class: 'museum', subclass: 'museum', name: 'Discovery Museum' })], 'b')[0] as any;
  for (const m of [arch, tile]) {
    assert.ok(m.classes?.includes('museum') && m.classes?.includes('historic'), `${m.name}: ${m.classes}`);
    assert.deepEqual(barsOf(m), ['culture', 'history'], m.name);
  }
  assert.ok(!plain.classes?.includes('historic'), 'a plain museum is not historic');
  assert.deepEqual(barsOf(plain), ['culture']);
  // The bars read classes, never a name or a carried bar.
  assert.deepEqual(barsOf({ category: 'culture', name: 'Historic Depot Museum', kind: 'museums' } as never), ['culture'], 'no classes: the category alone');
  for (const f of ['discovery/bars.ts', 'discovery/types.ts', 'discovery/archivePois.ts', 'atlas/atlas.ts']) assert.ok(!src(f).includes('alsoBars'), `${f} still names alsoBars`);
});

test('PS3: one word list and one name rule, for marks and bars alike; only the museum step reads past a neighbourhood', async () => {
  const p = await presence();
  assert.ok(existsSync(join(lib, 'presence/notable.json')) && !existsSync(join(lib, 'discovery/notable.json')), 'the word list lives in presence');
  const { notableName } = (await import('../../presence/notable' as string)) as { notableName: (n: string) => boolean };
  assert.equal(notableName('Old Town Hall'), true);
  assert.equal(notableName('Holy Family Church'), false);
  for (const f of ['discovery/bars.ts', 'discovery/curation.ts', 'discovery/noise.ts', 'discovery/tilePois.ts', 'discovery/archivePois.ts'])
    assert.ok(!/notable\.json|notableName|historicName/.test(src(f)), `${f} holds a name rule`);
  // T8: community parks (main's first refinement) asks presence whether a name is notable; its park words (`parkNotable.json`,
  // `communityWords.json`) are the refinement's own curation, never a second notable rule.
  const park = src('discovery/parkKind.ts');
  assert.ok(/import \{[^}]*\bnotableName\b[^}]*\} from '\.\.\/presence\/notable'/.test(park), 'parkKind reads notableName from presence');
  assert.ok(!/function notableName|const notableName/.test(park), 'parkKind defines no notable rule of its own');
  for (const f of libFiles()) assert.ok(!/['/]notable\.json/.test(readFileSync(f, 'utf8')), `${relative(lib, f)} reads notable.json`);
  assert.ok(p.named(['civic_hall'], 'Old Town Hall').includes('historic_name'), 'a historic name, for marks');
  assert.ok(!p.named(['museum'], 'Old Town Museum').includes('historic'), 'a museum in Old Town is not historic (presence-and-kinds audit 5)');
  assert.ok(p.named(['museum'], 'Old Mill Museum').includes('historic'));
  assert.ok(p.named(['museum', 'recorded'], 'Kiln Museum').includes('historic'), 'the archive records it');
});

test('PS4: scenic greens read presence classes from landcover, not raw tags', async () => {
  const p = await presence();
  assert.equal(typeof p.classesOfLandcover, 'function');
  // On main, greens moved to `discovery/green.ts` (community-parks PC11), which the kind pipeline's outlines read too (T8).
  assert.ok(src('discovery/green.ts').includes('classesOfLandcover'), 'green.ts reads presence');
  for (const f of ['discovery/green.ts', 'nav/scenicSignals.ts']) {
    const text = src(f);
    assert.ok(!quoted(text, 'grass') && !quoted(text, 'garden') && !/subclass|\.class\b/.test(text), `${f} reads no landcover tag`);
  }
  const { greenFromTiles } = await import('../../nav/scenicSignals');
  const { outlinesOf } = await import('../../discovery/green');
  const box = [[[0, 0], [0.001, 0], [0.001, 0.001], [0, 0.001], [0, 0]]];
  for (const g of golden.landcover) {
    const f = [{ geometry: { type: 'Polygon', coordinates: box }, properties: { class: g.cls, subclass: g.sub } } as never];
    assert.equal(greenFromTiles(f, [])[0]?.kind ?? null, g.green, `${g.cls}/${g.sub}`);
    assert.equal(outlinesOf(f).length, g.green === 'park' ? 1 : 0, `${g.cls}/${g.sub}: the kind pipeline's outlines are the parks among the greens`);
  }
});

test('PS5: the planner reads classes and curation\'s one counting rule, with no list of categories of its own', async () => {
  const text = src('walkPlanner/service.ts');
  assert.ok(!/MARK_KINDS|new Set<CategoryId>|CategoryId\[\] = \[|as (readonly )?CategoryId\[\]|\['(history|art|culture|parks|viewpoints)'/.test(text), 'the planner holds a list of categories');
  assert.ok(text.includes('countsToward'), 'the planner counts by curation\'s rule');
  const { createPlanner } = await import('../../walkPlanner/service');
  const { placesFromTilePois } = await import('../../discovery/tilePois');
  const { at, segs } = await import('../walk-planner/grid');
  const places = placesFromTilePois([pt({ class: 'museum', subclass: 'museum', name: 'Old Mill Museum' }, at(250, 250)), pt({ class: 'museum', subclass: 'museum', name: 'Historic Kiln Museum' }, at(1000, 900))], 'b');
  const planner = createPlanner({ read: async () => ({ places, segments: segs }), reach: async () => ({ cars: [], unknown: false }), found: async () => [] } as never);
  const r = await planner.plan({ kind: 'history', area: { at: at(650, 650), reachM: 1200 }, from: at(130, 130), prefs: { budgetM: 3000, pref: 'warn', mode: 'oneway', density: 'anywhere' } } as never);
  assert.ok(r.routes.length > 0, `map museums with a historic name light History for the planner: ${r.reasons.join(', ')}`);
});

test('PS6: a plain-named memorial is a mark where the archive records it, from the map only by a notable name; one place where both hold it', async () => {
  const { placesFromArchive } = await import('../../discovery/archivePois');
  const { placesFromTilePois } = await import('../../discovery/tilePois');
  const { mergePlaces } = await import('../../discovery/archiveMerge');
  const arch = placesFromArchive([pt({ name: 'Soldiers Memorial', class: 'memorial' })], 'v');
  const tilePlain = placesFromTilePois([pt({ class: 'memorial', subclass: 'memorial', name: 'Soldiers Memorial' })], 'b');
  const tileNotable = placesFromTilePois([pt({ class: 'memorial', subclass: 'memorial', name: 'Old Soldiers Memorial' })], 'b');
  assert.ok((arch[0] as any).classes?.includes('recorded'), 'the archive records it');
  assert.equal(arch[0].markable, true, 'a mark where the archive records it');
  assert.equal(tilePlain[0].markable, false, 'from the map, plain: no mark');
  assert.equal(tileNotable[0].markable, true, 'from the map, by a notable name');
  const merged = mergePlaces(tilePlain, arch);
  assert.equal(merged.length, 1, 'one place where both hold it');
  assert.equal(merged[0].markable, true, 'the archive\'s');
});

test('PS7: PR2\'s guard holds with no exception: no module outside presence spells a source\'s class', () => {
  const words = [
    // OpenMapTiles poi classes and Overture roots (presence audit 2's list).
    'restaurant', 'fast_food', 'art_gallery', 'theme_park', 'dog_park', 'picnic_site', 'town_hall', 'community_centre', 'nature_reserve',
    'place_of_worship', 'ice_cream', 'alcohol_shop', 'clothing_store', 'department_store', 'arts_and_entertainment', 'cultural_and_historic',
    'lifestyle_services', 'services_and_business', 'food_and_drink', 'memorial', 'cemetery', 'museum',
    // The places archive's own classes (contract v2; not `marker` or `statue`, which are other modules' plain words) and
    // OpenMapTiles' landcover.
    'folly', 'novelty_building', 'roadside_giant', 'natural_oddity', 'odd_engineering', 'marks_a_fact', 'art_environment', 'ruin',
    'mural', 'sculpture', 'overlook', 'historic_site', 'building_structure', 'grass',
  ];
  const spells = (text: string, w: string) => new RegExp(`(['"]${w}['"]|\\b${w}:)`).test(text);
  const bad: string[] = [];
  for (const f of libFiles()) {
    const text = readFileSync(f, 'utf8');
    for (const w of words) if (spells(text, w)) bad.push(`${relative(lib, f)}: ${w}`);
  }
  assert.deepEqual(bad, []);
  // T8: the guard reads main's kind pipeline (community-parks PC1-PC23) like any module, and its modules read no feature's tags.
  const files = libFiles().map((f) => relative(lib, f));
  const pipeline = ['discovery/refine.ts', 'discovery/refinements.ts', 'discovery/parkKind.ts', 'discovery/green.ts'];
  for (const f of pipeline) {
    assert.ok(files.includes(f), `the guard reads ${f}`);
    assert.ok(!/subclass|\.class\b|properties\??\.|\['class'\]/.test(src(f)), `${f} reads a feature's tags`);
  }
  assert.ok(!/ALLOWED: Record<string, \(w: string\) => boolean> = \{\s*'/.test(readFileSync(join(__dirname, 'presenceAudit.test.ts'), 'utf8')), 'presence audit 2 allows nothing');
});

test('PS8: nothing else a person sees changes: the golden tables hold, with no listed change', async () => {
  const { placesFromArchive } = await import('../../discovery/archivePois');
  const { placesFromTilePois } = await import('../../discovery/tilePois');
  const { barsOf } = await import('../../discovery/bars');
  const { ringOf } = await import('../../atlas/atlas');
  const { outlined } = await import('./outlinedRings');
  const marksOf = (r: { marks: { key: string; kind?: string }[] }) => r.marks.map((m) => `${m.key}|${m.kind ?? ''}`).sort();
  const names = golden.names;
  for (const g of golden.archive)
    for (const k of ['plain', 'notable', 'hood'] as const)
      assert.deepEqual(view(barsOf, placesFromArchive([pt({ name: names[k], class: g.cls })], 'v')[0]), g[k], `archive ${g.cls}, ${k}`);
  for (const g of golden.osm)
    for (const k of ['plain', 'notable', 'hood'] as const)
      assert.deepEqual(view(barsOf, placesFromTilePois([pt({ class: g.cls, subclass: g.sub, name: names[k] })], 'b')[0]), g[k], `${g.cls}/${g.sub}, ${k}`);
  type Area = { name: string; at: LngLat; pois: [string, string, string, number, number][]; archive: [string, string, number, number, string][] };
  const lit: Record<string, number>[] = [];
  let i = 0;
  for (const file of ['presenceSample.json', 'presenceTowns.json']) {
    const d = JSON.parse(readFileSync(join(__dirname, '..', 'explore', file), 'utf8')) as { tiles: string; areas: Area[] };
    for (const a of d.areas) {
      const map = placesFromTilePois(a.pois.map(([name, cls, sub, lon, lat]) => pt({ name, class: cls, subclass: sub }, [lon, lat])), d.tiles);
      const arch = placesFromArchive(a.archive.map(([name, cls, lon, lat]) => pt({ name, class: cls }, [lon, lat])), 'fixture');
      const r = ringOf(map, arch, a.at);
      const g = golden.steps[i];
      assert.deepEqual([g.file, g.name], [file, a.name], 'the golden rows follow the fixtures');
      assert.deepEqual({ steps: r.steps, marks: marksOf(r), thin: r.thin }, { steps: g.steps, marks: g.marks, thin: g.thin }, `${file} ${a.name}`);
      // presence-readers audit 8: the same ring fed landcover outlines, so the kind pipeline's refinement runs on outlines.
      const o = outlined(a);
      const outlinedMap = placesFromTilePois(o.pois.map(([name, cls, sub, lon, lat]) => pt({ name, class: cls, subclass: sub }, [lon, lat])), d.tiles);
      const ro = ringOf(outlinedMap, arch, a.at, undefined, [], o.landcover as never);
      const go = golden.outlined[i++];
      assert.deepEqual({ steps: ro.steps, marks: marksOf(ro), thin: ro.thin }, { steps: go.steps, marks: go.marks, thin: go.thin }, `${file} ${a.name}, outlined`);
      if (file === 'presenceSample.json') lit.push(r.steps);
    }
  }
  // PK5 over the sample: History and Culture each lit without the other in one area in ten.
  const h = lit.filter((s) => s.history > 0), c = lit.filter((s) => s.culture > 0);
  assert.ok(h.filter((s) => s.culture === 0).length * 10 >= h.length && c.filter((s) => s.history === 0).length * 10 >= c.length, 'PK5');
  // The steward's S1: an "Old ..." civic place from the map is a mark, before and after.
  for (const [cls, sub, name] of [['town_hall', 'townhall', 'Old Town Hall'], ['town_hall', 'townhall', 'Old City Hall'], ['cemetery', 'cemetery', 'Old City Cemetery']])
    assert.equal(placesFromTilePois([pt({ class: cls, subclass: sub, name })], 'b')[0]?.markable, true, name);
});

test('PS9: the presence code moves on; atlas and landing rows from the last code stand', async () => {
  const { PRESENCE_CODE } = await import('../../presence/presence');
  const { ATLAS_CODE, rowCurrent } = await import('../../atlas/atlas');
  const { LANDING_CODE, rulesCurrent } = await import('../../landing/view');
  const { LANDING_RULES } = await import('../../landing/analyze');
  assert.notEqual(PRESENCE_CODE, 'p1');
  assert.ok(ATLAS_CODE.endsWith(PRESENCE_CODE));
  // presence-readers audit 2: p1's rows stand only while the code is p2; the next bump decides its carry afresh.
  if (PRESENCE_CODE === 'p2') {
    for (const level of ['neighborhood', 'town'] as const) assert.equal(rowCurrent({ build: 'b', code: 'a9.p1', level }, 'b'), true, `${level} a9.p1 stands`);
    assert.equal(rulesCurrent(`${LANDING_CODE}:p1:${JSON.stringify(LANDING_RULES)}`), true, 'a p1 landing row stands');
  }
});

test('PS10: recorded, historic_name and historic weigh nothing, and no consumer sorts or ranks by them', async () => {
  const p = await presence();
  for (const c of ['recorded', 'historic_name', 'historic']) {
    assert.ok(c in p.CLASSES, `${c} is a class`);
    assert.equal(p.densityWeight([c]), 0, c);
  }
  const readers = libFiles().filter((f) => ['recorded', 'historic_name', 'historic'].some((w) => quoted(readFileSync(f, 'utf8'), w))).map((f) => relative(lib, f)).sort();
  assert.deepEqual(readers, ['discovery/bars.ts', 'discovery/curation.ts'], 'only curation and the bars read them');
  for (const f of readers) assert.ok(!/\.sort\(|rank/i.test(src(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')), `${f} sorts or ranks`);
});

test('PS11: a place lights a second bar only from historic', async () => {
  const { barsOf } = await import('../../discovery/bars');
  const b = barsOf as unknown as (p: { category: string; classes?: string[] }) => string[];
  assert.deepEqual(b({ category: 'culture', classes: ['museum', 'park'] }), ['culture'], 'another categorised class lights nothing beside');
  assert.deepEqual(b({ category: 'culture', classes: ['museum', 'historic'] }), ['culture', 'history']);
  assert.deepEqual(b({ category: 'history', classes: ['worship', 'historic_name', 'historic'] }), ['history'], 'History once');
});
