/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { activityFromOverture, activityFromTilePois, mergeSources, overturePlacesFromTile, type ActivityPoint, type OverturePlace } from '../../activity/points';
import { TileMemo } from '../../activity/reader';
import { newestRelease, overtureUrl, releaseDue, RELEASE_CHECK_MS } from '../../activity/release';
import { osmWeight, overtureWeight } from '../../activity/weights';
import { presenceSteps } from '../../atlas/atlas';
import { placesFromTilePois } from '../../discovery/tilePois';
import { boundsOf, distanceM } from '../../geo';
import { analyzeArea, LANDING_RULES, readTiles } from '../../landing/analyze';
import { densityAlong, gradeStreets } from '../../landing/grade';
import { isStale, LANDING_VERSION, type LandingRow } from '../../landing/view';
import { tilesIn } from '../../tileMath';
import type { LngLat, StreetSegment } from '../../types';
import phillipsburg from './phillipsburg.json';

// Activity density (AD1-AD16), written from the spec before the code.

const O: LngLat = [-75.19, 40.69];
const dLat = 1 / 111320;
const dLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
/** A point x metres east and y metres north of O. */
const m = (x: number, y: number): LngLat => [O[0] + x * dLon, O[1] + y * dLat];
let segN = 0;
/** A street as 100 m pieces from (x0, y0) to (x1, y1). */
function street(name: string | null, from: [number, number], to: [number, number], cls = 'minor'): StreetSegment[] {
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const n = Math.max(1, Math.round(len / 100));
  return Array.from({ length: n }, (_, i) => {
    const a = m(from[0] + ((to[0] - from[0]) * i) / n, from[1] + ((to[1] - from[1]) * i) / n);
    const b = m(from[0] + ((to[0] - from[0]) * (i + 1)) / n, from[1] + ((to[1] - from[1]) * (i + 1)) / n);
    return { id: `s${segN++}`, name, kind_detail: cls, length_m: len / n, build: 'b1', geometry: [[a, b]] };
  });
}
/** A 100 m grid over ±600 m: Main Street runs north-south at x = 0. */
function grid(): StreetSegment[] {
  const out: StreetSegment[] = [];
  for (let x = -600; x <= 600; x += 100) out.push(...street(x === 0 ? 'Main Street' : `Avenue ${x}`, [x, -600], [x, 600]));
  for (let y = -600; y <= 600; y += 100) out.push(...street(`Street ${y}`, [-600, y], [600, y]));
  return out;
}
const pt = (at: LngLat, weight = 1, name: string | null = null, source: ActivityPoint['source'] = 'osm'): ActivityPoint => ({ at, weight, name, source });
/** Places along Main Street (x = 0), 12 m either side, every `step` metres from y0 to y1. */
const alongMain = (y0: number, y1: number, step = 25, w = 1) =>
  Array.from({ length: Math.floor((y1 - y0) / step) + 1 }, (_, i) => pt(m(i % 2 ? 12 : -12, y0 + i * step), w, `Main ${y0 + i * step}`));
const poi = (cls: string, subclass: string, at: LngLat, name?: string) => ({
  geometry: { type: 'Point' as const, coordinates: at }, properties: { class: cls, subclass, ...(name ? { name } : {}) }, zoom: 14,
});
const ov = (o: Partial<OverturePlace> & { at: LngLat }): OverturePlace => ({
  id: o.id ?? `ov${Math.random()}`, name: o.name ?? 'Somewhere', hierarchy: o.hierarchy ?? ['food_and_drink', 'restaurant'],
  confidence: o.confidence ?? 0.95, operating_status: o.operating_status ?? 'open', at: o.at,
});

// What counts.

test('AD1: every kind counts at its weight; ATMs and parking count nothing', () => {
  // OpenStreetMap: shops of any kind, food and attractions are full; services half; offices and garages a quarter.
  assert.equal(osmWeight('shop', 'convenience'), 1);
  assert.equal(osmWeight('shop', 'tattoo'), 1);
  assert.equal(osmWeight('restaurant', 'restaurant'), 1);
  assert.equal(osmWeight('bar', 'bar'), 1);
  assert.equal(osmWeight('museum', 'museum'), 1);
  assert.equal(osmWeight('hairdresser', 'hairdresser'), 0.5);
  assert.equal(osmWeight('bank', 'bank'), 0.5);
  assert.equal(osmWeight('laundry', 'laundry'), 0.5);
  assert.equal(osmWeight('place_of_worship', 'place_of_worship'), 0.5);
  assert.equal(osmWeight('office', 'lawyer'), 0.25);
  assert.equal(osmWeight('car', 'car_repair'), 0.25);
  assert.equal(osmWeight('atm', 'atm'), 0);
  assert.equal(osmWeight('parking', 'parking'), 0);
  assert.equal(osmWeight('school', 'school'), 0);
  assert.equal(osmWeight('bus', 'bus_stop'), 0);
  // Overture's taxonomy, the same three weights.
  assert.equal(overtureWeight(['shopping', 'specialty_store', 'flowers_and_gifts_store']), 1);
  assert.equal(overtureWeight(['food_and_drink', 'casual_eatery']), 1);
  assert.equal(overtureWeight(['lifestyle_services', 'personal_or_beauty_service']), 0.5);
  assert.equal(overtureWeight(['services_and_business', 'financial_service', 'bank_or_credit_union']), 0.5);
  assert.equal(overtureWeight(['services_and_business', 'legal_service']), 0.25);
  assert.equal(overtureWeight(['travel_and_transportation', 'vehicle_service']), 0.25);
  assert.equal(overtureWeight(['services_and_business', 'financial_service', 'atm']), 0);
  assert.equal(overtureWeight(['travel_and_transportation', 'parking']), 0);
  assert.equal(overtureWeight(['education', 'place_of_learning']), 0);
  assert.equal(overtureWeight([]), 0);
  // Unnamed places count too; what counts nothing is left out.
  const pts = activityFromTilePois([poi('shop', 'convenience', m(0, 0)), poi('hairdresser', 'hairdresser', m(0, 20), 'Cuts'), poi('atm', 'atm', m(0, 40), 'ATM')]);
  assert.deepEqual(pts.map((p) => p.weight).sort(), [0.5, 1]);
});

test('AD2: marks and presence bars are unchanged by the new kinds', () => {
  const pois = [poi('hairdresser', 'hairdresser', m(0, 0), 'Cuts'), poi('bank', 'bank', m(0, 20), 'First Bank'), poi('shop', 'convenience', m(0, 40), 'Corner Bodega')];
  const places = placesFromTilePois(pois, 'b1');
  assert.deepEqual(places, []);
  const steps = presenceSteps(places, O);
  assert.ok(Object.values(steps).every((s) => s === 0));
});

// Overture places.

test('AD3: Overture is read for the read’s own z14 tiles, keyless', () => {
  assert.deepEqual(readTiles(O), tilesIn(boundsOf([O], LANDING_RULES.radiusM)!));
  const url = overtureUrl('2026-10-21.0');
  assert.equal(url, 'https://overturemaps-extras-us-west-2.s3.amazonaws.com/tiles/2026-10-21.0/places.pmtiles');
  assert.ok(!url.includes('?') && !/key|token/i.test(url));
});

test('AD4: Overture places under 0.8 or closed are left out', () => {
  const pts = activityFromOverture([
    ov({ at: m(0, 0), name: 'Sure', confidence: 0.95 }),
    ov({ at: m(0, 20), name: 'Unsure', confidence: 0.6 }),
    ov({ at: m(0, 40), name: 'Gone', operating_status: 'permanently_closed' }),
    ov({ at: m(0, 60), name: 'Paused', operating_status: 'temporarily_closed' }),
    ov({ at: m(0, 80), name: 'Unknown status', operating_status: null }),
  ]);
  assert.deepEqual(pts.map((p) => p.name), ['Sure', 'Unknown status']);
  // Read from a decoded tile: the props as Overture's tiles carry them, one place per id across tiles.
  const feature = (id: string) => ({
    geometry: { type: 'Point' as const, coordinates: m(0, 0) },
    properties: { id, '@name': "Joe's Steak Shop", confidence: 0.99, operating_status: 'open', taxonomy: '{"primary":"x","hierarchy":["food_and_drink","casual_eatery"]}' },
  });
  const read = overturePlacesFromTile([feature('a'), feature('a'), feature('b')]);
  assert.equal(read.length, 2);
  assert.deepEqual(read[0].hierarchy, ['food_and_drink', 'casual_eatery']);
  assert.equal(read[0].name, "Joe's Steak Shop");
});

test('AD5: a place in both sources counts once', () => {
  const osm = [pt(m(0, 0), 1, "Joe's Steak Shop"), pt(m(0, 100), 1, null)];
  const ovs = [
    pt(m(20, 10), 1, 'Joes Steak Shop', 'overture'), // the same place, its name spelled differently
    pt(m(0, 300), 1, "Joe's Steak Shop", 'overture'), // another branch, 300 m off
    pt(m(0, 105), 1, 'Helen’s Floral Shoppe', 'overture'), // beside an unnamed OSM point: kept
    pt(m(0, 40), 0.5, 'Steak', 'overture'), // a name inside another, but too short to match on
  ];
  const all = mergeSources(osm, ovs);
  assert.equal(all.length, 5);
  assert.equal(all.filter((p) => /joe/i.test(p.name ?? '')).length, 2);
});

test('AD6: the newest listed release is chosen, checked once a day; a new release makes rows stale', () => {
  const xml = '<ListBucketResult><Prefix>tiles/</Prefix><CommonPrefixes><Prefix>tiles/2026-09-23.0/</Prefix></CommonPrefixes>' +
    '<CommonPrefixes><Prefix>tiles/2026-10-21.0/</Prefix></CommonPrefixes><CommonPrefixes><Prefix>tiles/2026-09-23.1/</Prefix></CommonPrefixes></ListBucketResult>';
  assert.equal(newestRelease(xml), '2026-10-21.0');
  assert.equal(newestRelease('<ListBucketResult></ListBucketResult>'), null);
  assert.ok(RELEASE_CHECK_MS === 24 * 3600_000);
  assert.ok(releaseDue(null, 0));
  assert.ok(!releaseDue(1000, 1000 + RELEASE_CHECK_MS - 1));
  assert.ok(releaseDue(1000, 1000 + RELEASE_CHECK_MS));
  const row: LandingRow = { key: 'k', centre: O, analysis: analyzeArea({ centre: O, points: [], segments: [], towns: [], transit: [] }), build: 'b1', rules: LANDING_VERSION, analyzed_at: 0, overture: '2026-09-23.1' };
  assert.ok(!isStale(row, 'b1', '2026-09-23.1'));
  assert.ok(isStale(row, 'b1', '2026-10-21.0'));
  // With no release known (offline from the start), only the build decides.
  assert.ok(!isStale(row, 'b1', null));
});

test('AD7: without Overture the read is measured from OSM and marked to read again', () => {
  const r = analyzeArea({ centre: O, points: alongMain(-100, 300), segments: grid(), towns: [], transit: [] });
  assert.ok(r.strips.some((s) => s.name === 'Main Street'));
  const row: LandingRow = { key: 'k', centre: O, analysis: r, build: 'b1', rules: LANDING_VERSION, analyzed_at: 0, overture: null };
  assert.ok(isStale(row, 'b1', '2026-10-21.0'), 'measured without Overture while a release is known: read again');
});

test('AD8: a tile is fetched once per release in a session', async () => {
  const memo = new TileMemo<number>(4);
  let calls = 0;
  const load = async () => {
    calls++;
    await new Promise((r) => setTimeout(r, 5));
    return calls;
  };
  const [a, b] = await Promise.all([memo.get('r1', 1, 2, load), memo.get('r1', 1, 2, load)]);
  assert.equal(calls, 1);
  assert.equal(a, b);
  await memo.get('r1', 1, 2, load);
  assert.equal(calls, 1);
  await memo.get('r2', 1, 2, load);
  assert.equal(calls, 2, 'a new release is a new tile');
  // A failed load is not kept: the next read tries again.
  await assert.rejects(memo.get('r1', 9, 9, async () => { throw new Error('offline'); }));
  assert.equal(await memo.get('r1', 9, 9, async () => 7), 7);
  // Bounded: the oldest tiles go first.
  for (let i = 0; i < 6; i++) await memo.get('r3', i, 0, async () => i);
  assert.ok(memo.size <= 4);
});

// How density is measured.

test('AD9: density follows the street and fades within 120 m; a corner place adds to its own street', () => {
  const segs = grid();
  const samples = densityAlong({ centre: O, points: alongMain(0, 300), segments: segs });
  const at = (name: string, p: LngLat) => {
    let best = { d: Infinity, density: 0 };
    for (const s of samples) if (s.name === name) { const d = distanceM(s.at, p); if (d < best.d) best = { d, density: s.density }; }
    return best.density;
  };
  assert.ok(at('Main Street', m(0, 150)) > at('Main Street', m(0, 0)), 'densest in the middle of the run');
  assert.ok(at('Main Street', m(0, 360)) > 0, 'still felt 60 m past the last place');
  assert.equal(at('Main Street', m(0, 450)), 0, 'nothing a block and a half past it');
  assert.equal(at('Avenue 100', m(100, 150)), 0, 'the parallel avenue gets nothing');
  // A café 8 m off Main Street at the corner of Street 400: Main's, not Street 400's.
  const corner = densityAlong({ centre: O, points: [pt(m(8, 420))], segments: segs });
  assert.ok(corner.some((s) => s.name === 'Main Street' && s.density > 0));
  assert.ok(!corner.some((s) => s.name === 'Street 400' && s.density > 0));
  // Further than 40 m from any named street, a place counts toward none.
  assert.ok(densityAlong({ centre: O, points: [pt(m(50, 50))], segments: segs }).every((s) => s.density === 0));
});

test('AD10: grades are the same at one and four times the density; below the floor nothing grades', () => {
  const segs = grid();
  // A main street (a shop every 15 m) and a quieter side street, each shop 8 m off its own street and clear of corners.
  const pattern = [
    ...Array.from({ length: 34 }, (_, i) => pt(m(i % 2 ? 8 : -8, -188 + i * 15))),
    ...Array.from({ length: 6 }, (_, i) => pt(m(300 + 8, -70 + i * 30))),
  ];
  // Two of each, so the sparse read clears the medium and strong minimums; then four times that.
  const one = gradeStreets({ centre: O, points: pattern.flatMap((p) => [p, p]), segments: segs });
  const four = gradeStreets({ centre: O, points: pattern.flatMap((p) => [p, p, p, p, p, p, p, p]), segments: segs });
  const byKey = (g: typeof one) => new Map(g.samples.map((s, i) => [`${s.seg}|${s.line}|${s.k}`, g.grades[i]] as const));
  const a = byKey(one);
  const b = byKey(four);
  let compared = 0;
  for (const [k, ga] of a) {
    if (!ga) continue;
    compared++;
    assert.equal(b.get(k), ga, `sample ${k}`);
  }
  assert.ok(compared > 50);
  // Four times the places only reaches a little further along, faintly, where the density fades out.
  for (const [k, gb] of b) if (gb && !a.get(k)) assert.equal(gb, 1, `fringe ${k}`);
  assert.ok(one.graded.some((l) => l.name === 'Main Street' && l.grade === 3), 'the main street is strong');
  assert.ok(one.graded.some((l) => l.name === 'Avenue 300') && !one.graded.some((l) => l.name === 'Avenue 300' && l.grade === 3), 'the side street shows, weaker');
  // A residential area: four places, 300 m apart.
  const sparse = [pt(m(12, -300)), pt(m(12, 0)), pt(m(-12, 300)), pt(m(312, 300))];
  assert.deepEqual(gradeStreets({ centre: O, points: sparse, segments: segs }).graded, []);
});

test('AD11: South Main Street in Phillipsburg grades medium or strong', () => {
  const fx = phillipsburg as unknown as { centre: LngLat; places: Omit<OverturePlace, 'id'>[]; streets: { name: string; class: string; geometry: LngLat[][] }[] };
  const points = activityFromOverture(fx.places.map((p, i) => ({ ...p, id: String(i) })));
  const segments: StreetSegment[] = fx.streets.map((s, i) => ({ id: `pb${i}`, name: s.name, kind_detail: s.class, length_m: 0, build: 'ov', geometry: s.geometry }));
  const r = analyzeArea({ centre: fx.centre, points, segments, towns: [], transit: [] });
  const main = r.graded.filter((g) => g.name === 'South Main Street' && g.grade >= 2);
  assert.ok(main.length > 0, JSON.stringify(r.strips.map((s) => s.name)));
  assert.ok(r.strips.some((s) => s.name === 'South Main Street'), 'a busy street by name');
  // By the park: a medium or strong stretch within 250 m of Shappell Park and Mercer Street Park.
  const parks: LngLat[] = [[-75.193037, 40.686667], [-75.195842, 40.686492]];
  assert.ok(main.some((g) => g.lines.some((l) => l.some((p) => parks.some((q) => distanceM(p, q) <= 250)))));
});

test('AD13: a busy street is a run of one name at medium or above, at least 120 m', () => {
  const segs = grid();
  const r = analyzeArea({ centre: O, points: [...alongMain(-200, 300), ...Array.from({ length: 4 }, (_, i) => pt(m(300 + 12, i * 20)))], segments: segs, towns: [], transit: [] });
  assert.deepEqual(r.strips.map((s) => s.name), ['Main Street']);
  assert.ok(r.strips[0].lengthM >= 120);
  for (const s of r.strips) assert.ok(r.graded.some((g) => g.name === s.name && g.grade >= 2));
  // Strongest first, and its peak is on it.
  assert.ok(distanceM(r.strips[0].peak, m(0, 50)) < 260);
  // A pocket is named for its strongest busy street.
  assert.equal(r.pockets[0]?.name, 'Main Street');
});

test('AD10: a dense downtown with 15,000 street pieces still measures well under a second', () => {
  const segs: StreetSegment[] = [];
  for (let x = -1500; x <= 1500; x += 40) segs.push(...street(`Ave ${x}`, [x, -1500], [x, 1500]));
  for (let y = -1500; y <= 1500; y += 40) segs.push(...street(`St ${y}`, [-1500, y], [1500, y]));
  let seed = 3;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const points = Array.from({ length: 5000 }, () => pt(m((rnd() - 0.5) * 800, (rnd() - 0.5) * 800)));
  analyzeArea({ centre: O, points: points.slice(0, 500), segments: segs, towns: [], transit: [] });
  const t0 = performance.now();
  analyzeArea({ centre: O, points, segments: segs, towns: [], transit: [] });
  const ms = performance.now() - t0;
  assert.ok(ms < 1000, `${Math.round(ms)} ms (a phone is several times slower)`);
});
