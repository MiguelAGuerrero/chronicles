/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { areaKey } from '../areas/assign';
import type { Area, AreaLevel, WalkArea } from '../areas/types';
import { metersPerPixel } from '../pins';
import { levelForZoom, placeAll, placesIndex, placeWalks, starsFor, unplacedWalks, withTimeout } from '../places';
import type { Walk } from '../types';

// Slice 2 of v0.5 (the home map), written from its acceptance criteria before
// the code. Everything here is built from walks, Area and WalkArea only.

const area = (level: AreaLevel, name: string, parent: string | null, lon: number, lat: number): Area => ({
  key: areaKey(level, name, parent), level, name, parent_key: parent, lon, lat, rules: 't',
});
const us = area('country', 'United States', null, -98, 39);
const nj = area('state', 'New Jersey', us.key, -74.5, 40.2);
const montclair = area('town', 'Montclair', nj.key, -74.21, 40.82);
const upper = area('neighborhood', 'Upper Montclair', montclair.key, -74.21, 40.84);
const southEnd = area('neighborhood', 'South End', montclair.key, -74.2, 40.835);
const glen = area('town', 'Glen Ridge', nj.key, -74.2, 40.8);
const areas = [us, nj, montclair, upper, southEnd, glen];

const walk = (id: string, started: number, open = false): Walk => ({
  id, started_at: started, ended_at: open ? null : started + 3_600_000, title: null, epilogue: null, open, area: null, snapped_build: null,
} as Walk);
const row = (walkId: string, a: Area, metres: number, t: number, lon = a.lon, lat = a.lat): WalkArea => ({
  walk_id: walkId, area_key: a.key, metres, first_t: t, last_t: t + 1000, lon, lat,
});

// w1: Upper Montclair. w2: Upper Montclair and South End. w3: Glen Ridge, no neighborhood. w4: not placed. w5: open.
const walks = [walk('w1', 1000), walk('w2', 2000), walk('w3', 3000), walk('w4', 4000), walk('w5', 5000, true)];
const rows: WalkArea[] = [
  ...[us, nj, montclair, upper].map((a) => row('w1', a, 1000, 1000)),
  ...[us, nj, montclair].map((a) => row('w2', a, 1500, 2000)),
  row('w2', upper, 900, 2000),
  row('w2', southEnd, 600, 2000),
  ...[us, nj].map((a) => row('w3', a, 800, 3000)),
  row('w3', glen, 800, 3000, -74.19, 40.79),
  // The open walk already has rows from a live placement: it must not show.
  ...[us, nj, montclair, upper].map((a) => row('w5', a, 100, 5000)),
];
const index = placesIndex(areas, rows, walks);

test('home: the level shown follows the zoom, with countries only once two are walked', () => {
  assert.equal(levelForZoom(4, false), 'state');
  assert.equal(levelForZoom(5.9, false), 'state');
  assert.equal(levelForZoom(6, false), 'town');
  assert.equal(levelForZoom(10.9, false), 'town');
  assert.equal(levelForZoom(11, false), 'neighborhood');
  assert.equal(levelForZoom(2, false), 'state', 'one country: never a country star');
  assert.equal(levelForZoom(2, true), 'country');
  assert.equal(levelForZoom(3, true), 'state');
});

test('home: the open walk and walks with no places appear in no star', () => {
  const upperStar = starsFor(index, 'neighborhood', 14, 40.8).find((s) => s.label === 'Upper Montclair')!;
  assert.deepEqual(upperStar.walkIds.sort(), ['w1', 'w2']);
  assert.ok(!starsFor(index, 'state', 4, 40).some((s) => s.walkIds.includes('w5') || s.walkIds.includes('w4')));
});

test('home: a walk without a neighborhood is starred as "Elsewhere in" its town', () => {
  const stars = starsFor(index, 'neighborhood', 14, 40.8);
  const elsewhere = stars.find((s) => s.label === 'Elsewhere in Glen Ridge');
  assert.ok(elsewhere, 'its own star');
  assert.deepEqual(elsewhere!.walkIds, ['w3']);
  assert.ok(Math.abs(elsewhere!.at[0] - -74.19) < 1e-9, 'where the walk was, not the town’s point');
  // A walk counted under a neighborhood is not "elsewhere" too.
  assert.ok(!stars.some((s) => s.label === 'Elsewhere in Montclair'));
});

test('home: a walk across two neighborhoods is under both stars, and counts once in its town', () => {
  const hoods = starsFor(index, 'neighborhood', 14, 40.8);
  assert.ok(hoods.find((s) => s.label === 'South End')!.walkIds.includes('w2'));
  assert.ok(hoods.find((s) => s.label === 'Upper Montclair')!.walkIds.includes('w2'));
  // At z10.9 Montclair and Glen Ridge (2.4 km apart) are separate stars.
  const town = starsFor(index, 'town', 10.9, 40.8).find((s) => s.label === 'Montclair')!;
  assert.deepEqual(town.walkIds.sort(), ['w1', 'w2']);
});

test('home: stars within 44 px merge into one with a count, and every star is the same size', () => {
  // At z11 (44 px is about 1.3 km), Upper Montclair and South End, about 1 km apart, merge.
  const far = starsFor(index, 'neighborhood', 11, 40.8);
  const merged = far.filter((s) => s.count > 1);
  assert.ok(merged.length >= 1, 'merged');
  assert.ok(merged[0].walkIds.includes('w1') && merged[0].walkIds.includes('w2'));
  // Zoomed in, they are apart.
  const near = starsFor(index, 'neighborhood', 16, 40.8);
  assert.ok(near.every((s) => s.count === 1));
  assert.ok(metersPerPixel(16, 40.8) * 44 < 4000);
  assert.ok(near.every((s) => !('size' in s)), 'nothing in a star says how big to draw it');
});

test('home: a star tells whose place it is, its walks newest first, and how far was walked there', () => {
  const p = placeWalks(index, upper.key);
  assert.equal(p.title, 'Upper Montclair');
  assert.equal(p.subtitle, 'Montclair, New Jersey');
  assert.deepEqual(p.walks.map((w) => w.id), ['w2', 'w1'], 'newest first');
  assert.equal(p.metres, 1900);
});

test('home: stopped walks with no places are the ones to place; the open walk is not one', () => {
  assert.deepEqual(unplacedWalks(walks, rows).map((w) => w.id), ['w4']);
});

test('home: the sheet counts stopped walks and places walked', () => {
  assert.equal(index.walkCount, 4, 'w1-w4; the open walk is not counted');
  // Upper Montclair, South End, Elsewhere in Glen Ridge.
  assert.equal(index.placeCount, 3);
});

test('home: the map fits every place walked', () => {
  const [w, s, e, n] = index.bounds!;
  for (const a of [upper, southEnd]) assert.ok(a.lon >= w && a.lon <= e && a.lat >= s && a.lat <= n);
  assert.equal(placesIndex([], [], []).bounds, null, 'nothing walked: no bounds, a world view');
  // A town's own point can be kilometres from where it was walked: the fit
  // covers the places starred up close (neighborhoods, "elsewhere"), not it.
  const farTown = area('town', 'Bigcity', nj.key, -74.0, 40.82);
  const hood = area('neighborhood', 'Old Mill', farTown.key, -74.21, 40.83);
  const lone = placesIndex([us, nj, farTown, hood], [...[us, nj, farTown, hood].map((a) => row('w1', a, 500, 1000))], [walk('w1', 1000)]);
  assert.ok(lone.bounds![2] < -74.1, 'the far town point is left out of the fit');
});

test('home: bulk placement runs one pass at a time, keeps what it placed and leaves the rest for next time', async () => {
  const placed: string[] = [];
  const placeOne = async (id: string) => {
    if (id === 'bad') throw new Error('tiles failed');
    placed.push(id);
  };
  const progress: number[] = [];
  const first = placeAll(['a', 'bad', 'b'], placeOne, (done) => progress.push(done));
  const second = placeAll(['a', 'b'], placeOne);
  assert.equal(second, first, 'a second call joins the running pass');
  const result = await first;
  assert.deepEqual(placed, ['a', 'b'], 'each walk once, in order');
  assert.deepEqual(result, { placed: ['a', 'b'], failed: ['bad'] });
  assert.deepEqual(progress, [1, 2, 3]);
  // Stopping midway (leaving the screen) keeps what was placed.
  const stopAfterOne = { stopped: false };
  const partial: string[] = [];
  await placeAll(['x', 'y', 'z'], async (id) => {
    partial.push(id);
    stopAfterOne.stopped = true;
  }, undefined, () => stopAfterOne.stopped);
  assert.deepEqual(partial, ['x']);
});

// Regression tests from the home slice's audit and UI review, written before the fixes.

test('audit: a merged star carries every place it stands for, to zoom in to', () => {
  const merged = starsFor(index, 'neighborhood', 11, 40.8).find((s) => s.count > 1)!;
  assert.equal(merged.points.length, merged.count);
  assert.ok(merged.points.some((p) => p[0] === upper.lon && p[1] === upper.lat));
  assert.ok(merged.points.some((p) => p[0] === southEnd.lon && p[1] === southEnd.lat));
});

test('audit: a walk with no town is "Elsewhere in" its state, starred and fitted', () => {
  const ny = area('state', 'New York', us.key, -75, 43);
  const w = walk('r1', 1000);
  const idx = placesIndex([us, ny], [row('r1', us, 900, 1000), row('r1', ny, 900, 1000, -76.5, 42.4)], [w]);
  for (const [level, zoom] of [['town', 8], ['neighborhood', 13]] as const) {
    const s = starsFor(idx, level, zoom, 42.4).find((x) => x.label === 'Elsewhere in New York');
    assert.ok(s, `starred at ${level}`);
    assert.ok(Math.abs(s!.at[0] - -76.5) < 1e-9, 'where it was walked');
  }
  assert.equal(idx.placeCount, 1);
  assert.ok(idx.bounds && idx.bounds[0] <= -76.5 && idx.bounds[2] >= -76.5, 'in the fit');
  assert.equal(placeWalks(idx, starsFor(idx, 'town', 8, 42.4)[0].keys[0]).walks[0].id, 'r1');
});

test('audit: a walk snapped under the current rules is placed, even with no places to show', () => {
  const snapped = { ...walk('z1', 1000), snapped_build: 'b1' } as Walk;
  assert.deepEqual(unplacedWalks([snapped], []), []);
  assert.deepEqual(unplacedWalks([walk('z2', 1000)], []).map((w) => w.id), ['z2']);
});

test('audit: a walk counts as tried only once its placing begins', async () => {
  const tried: string[] = [];
  const state = { stop: false };
  await placeAll(['a', 'b', 'c'], async () => {
    state.stop = true;
  }, undefined, () => state.stop, (id) => tried.push(id));
  assert.deepEqual(tried, ['a'], 'left midway: b and c are tried next time');
});

test('audit: a map that never answers times out instead of hanging the pass', async () => {
  const never = new Promise<string>(() => {});
  await assert.rejects(withTimeout(never, 20, 'map'), /map/);
  assert.equal(await withTimeout(Promise.resolve('ok'), 20, 'map'), 'ok');
});
