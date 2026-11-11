import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

// Presence (specs/presence, decision 0140): one system says what a place is; density and marks read its classes.
// golden.json holds what the two old tables answered before the slice, for every realistic tag pair and Overture hierarchy.

type Row = { cls: string; sub: string; weight: number; category: string | null; kind: string | null; markPlain: boolean; markNotable: boolean };
const golden = JSON.parse(readFileSync(join(__dirname, 'golden.json'), 'utf8')) as { osm: Row[]; overture: { hierarchy: string[]; weight: number }[] };

/** PR5: the tags the old tables answered differently, and their one answer now. */
const shop = { weight: 1, category: 'shops', kind: null, markPlain: false, markNotable: false };
const CHANGED: Record<string, Omit<Row, 'cls' | 'sub'>> = {
  'memorial|memorial': { weight: 1, category: 'history', kind: 'monuments', markPlain: false, markNotable: true },
  'nature_reserve|nature_reserve': { weight: 0.5, category: 'parks', kind: 'parks', markPlain: false, markNotable: true },
  'park|nature_reserve': { weight: 0.5, category: 'parks', kind: 'parks', markPlain: false, markNotable: true },
  'arts_centre|arts_centre': { weight: 1, category: 'culture', kind: 'community', markPlain: true, markNotable: true },
  'community_centre|community_centre': { weight: 0.5, category: 'culture', kind: 'community', markPlain: false, markNotable: true },
  'viewpoint|viewpoint': { weight: 0.5, category: 'viewpoints', kind: 'viewpoints', markPlain: true, markNotable: true },
  'florist|florist': shop, 'jewelry|jewelry': shop, 'gift|gift': shop, 'toys|toys': shop, 'stationery|stationery': shop, 'books|books': shop, 'shop|books': shop,
  'marketplace|marketplace': { weight: 1, category: 'food', kind: null, markPlain: false, markNotable: false },
};

async function now(cls: string, sub: string) {
  const { osmWeight } = await import('../../activity/weights');
  const { categoryOfPoi, placesFromTilePois } = await import('../../discovery/tilePois');
  const pt = (name: string) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [-75.47, 40.6] }, properties: { class: cls, subclass: sub, name } }) as never;
  const plain = placesFromTilePois([pt('Corner Spot')], 'b')[0];
  const notable = placesFromTilePois([pt('Old Corner Spot')], 'b')[0];
  return { weight: osmWeight(cls, sub), category: categoryOfPoi(cls, sub), kind: (notable?.kind ?? plain?.kind) ?? null, markPlain: !!plain?.markable, markNotable: !!notable?.markable };
}

test('PR1: one vocabulary of classes, several per feature, under one version code', { todo: 'test first' }, async () => {
  const p = await import('../../presence/presence');
  assert.match(p.PRESENCE_CODE, /^p\d+$/);
  for (const [c, def] of Object.entries(p.CLASSES)) assert.ok(def.weight >= 0 && def.weight <= 1, `${c}: weight ${def.weight}`);
  assert.ok(Array.isArray(p.classesOfOsm('museum', 'museum')) && Array.isArray(p.classesOfOverture(['shopping'])));
  // Several classes: density reads the greatest weight, marks the first class with a category.
  assert.equal(p.densityWeight(['service', 'eatery']), 1);
  assert.equal(p.densityWeight([]), 0);
  assert.equal(p.markClassOf(['service', 'museum']), 'museum');
});

test('PR2: no module outside presence holds a table from poi classes or Overture categories', { todo: 'test first' }, () => {
  const lib = join(__dirname, '..', '..');
  const files: string[] = [];
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) { if (f !== '__tests__' && f !== 'presence') walk(p); } else if (/\.tsx?$/.test(f)) files.push(p);
    }
  };
  walk(lib);
  // Names only a tag table spells: an OpenMapTiles poi class and an Overture taxonomy root.
  for (const word of ["'ice_cream'", 'ice_cream:', "'food_and_drink'", 'food_and_drink:', "'place_of_worship'", 'place_of_worship:']) {
    const holders = files.filter((f) => readFileSync(f, 'utf8').includes(word)).map((f) => f.slice(lib.length + 1));
    assert.deepEqual(holders, [], `${word} is spelled outside presence/`);
  }
});

test('PR3: marks and checklists take their category and kind from presence classes', { todo: 'test first' }, async () => {
  const p = await import('../../presence/presence');
  const { categoryOfPoi } = await import('../../discovery/tilePois');
  for (const r of golden.osm) {
    const mark = p.markClassOf(p.classesOfOsm(r.cls, r.sub));
    assert.equal(categoryOfPoi(r.cls, r.sub), mark ? p.CLASSES[mark].category ?? null : null, `${r.cls}/${r.sub}`);
  }
});

test('PR4: density weights come from presence classes, for the tiles and for Overture', { todo: 'test first' }, async () => {
  const p = await import('../../presence/presence');
  const { osmWeight, overtureWeight } = await import('../../activity/weights');
  for (const r of golden.osm) assert.equal(osmWeight(r.cls, r.sub), p.densityWeight(p.classesOfOsm(r.cls, r.sub)), `${r.cls}/${r.sub}`);
  for (const o of golden.overture) {
    assert.equal(overtureWeight(o.hierarchy), p.densityWeight(p.classesOfOverture(o.hierarchy)), o.hierarchy.join('/'));
    assert.equal(overtureWeight(o.hierarchy), o.weight, `Overture ${o.hierarchy.join('/')} kept its weight`);
  }
});

test('PR5: each tag the old tables answered differently has the one answer listed, for marks and density alike', { todo: 'test first' }, async () => {
  for (const [pair, want] of Object.entries(CHANGED)) {
    const [cls, sub] = pair.split('|');
    const was = golden.osm.find((r) => r.cls === cls && r.sub === sub);
    assert.ok(was, `${pair} is in the golden table`);
    assert.notDeepEqual({ ...was, cls: undefined, sub: undefined }, { ...want, cls: undefined, sub: undefined }, `${pair} changed`);
    assert.deepEqual(await now(cls, sub), want, pair);
  }
});

test('PR6: the presence code is part of the atlas and landing cache codes', { todo: 'test first' }, async () => {
  const { PRESENCE_CODE } = await import('../../presence/presence');
  const { ATLAS_CODE } = await import('../../atlas/atlas');
  const { LANDING_VERSION } = await import('../../landing/view');
  assert.ok(ATLAS_CODE.includes(PRESENCE_CODE), ATLAS_CODE);
  assert.ok(LANDING_VERSION.includes(PRESENCE_CODE), LANDING_VERSION);
});

test('PR7: marks\' curation is a rule set over presence classes, apart from the classification', { todo: 'test first' }, async () => {
  const p = await import('../../presence/presence');
  const c = await import('../../discovery/curation');
  for (const k of [...c.NEVER_MARK, ...c.BY_NAME]) assert.ok(k in p.CLASSES, `${k} is a presence class`);
  // A cinema is culture to presence, and never a mark by curation.
  assert.equal(p.CLASSES[p.markClassOf(p.classesOfOsm('cinema', 'cinema'))!].category, 'culture');
  assert.ok(c.NEVER_MARK.has(p.markClassOf(p.classesOfOsm('cinema', 'cinema'))!));
});

test('PR8: every tag not listed in PR5 answers as it did before the slice', { todo: 'test first' }, async () => {
  for (const r of golden.osm) {
    if (`${r.cls}|${r.sub}` in CHANGED) continue;
    const { cls, sub, ...was } = r;
    assert.deepEqual(await now(cls, sub), was, `${cls}/${sub}`);
  }
});
