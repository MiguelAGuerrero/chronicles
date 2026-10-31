/// <reference types="node" />
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { assignAreas, staleAreas } from '../areas/assign';
import { boundarySource } from '../areas/boundaryPack';
import { AREA_REACH_M } from '../areas/rules';
import { placesFromTiles } from '../areas/tilePlaces';
import type { BoundarySource, PlaceCandidate } from '../areas/types';
import { stepToward } from '../geo';
import type { LngLat, TracePoint } from '../types';

// Slice 1 of v0.5 (areas), written from the concept doc's acceptance criteria
// before the code. The assignment is tested against small in-memory sources,
// never a real dataset: any place or boundary source can stand behind it.

const O: LngLat = [-74.2, 40.81];
const dLat = 100 / 111320;
const dLon = 100 / (111320 * Math.cos((O[1] * Math.PI) / 180));
/** x, y in units of 100 m east and north of O. */
const at = (x: number, y: number): LngLat => [O[0] + x * dLon, O[1] + y * dLat];

function walk(path: LngLat[], t0 = 0, opts: { stepM?: number; dtMs?: number; accuracy?: number } = {}): TracePoint[] {
  const step = opts.stepM ?? 7;
  const dt = opts.dtMs ?? 5000;
  const pts: TracePoint[] = [{ walk_id: 'w', t: t0, lon: path[0][0], lat: path[0][1], accuracy_m: opts.accuracy ?? 8, speed: 1.4, course: null }];
  let pos = path[0];
  let t = t0;
  for (const target of path.slice(1)) {
    while (Math.hypot((pos[0] - target[0]) / dLon, (pos[1] - target[1]) / dLat) > 0.001) {
      pos = stepToward(pos, target, step);
      t += dt;
      pts.push({ walk_id: 'w', t, lon: pos[0], lat: pos[1], accuracy_m: opts.accuracy ?? 8, speed: 1.4, course: null });
    }
  }
  return pts;
}

const place = (level: PlaceCandidate['level'], name: string, p: LngLat, reach = level === 'neighborhood' ? AREA_REACH_M.neighborhood : AREA_REACH_M.town): PlaceCandidate => ({
  level, name, at: p, reachM: reach,
});

/** Everything west of x = 50 (5 km) is "North State"; east of it, "South State"; all in one country. */
const boundaries: BoundarySource = {
  id: 'test-boundaries-1',
  containing: (p) => ({
    country: { name: 'Testland', code: 'TL', at: at(0, 0) },
    state: p[0] < at(50, 0)[0] ? { name: 'North State', code: 'TL-N', at: at(0, 0) } : { name: 'South State', code: 'TL-S', at: at(100, 0) },
  }),
};

const montclair = place('town', 'Montclair', at(5, 0));
const upper = place('neighborhood', 'Upper Montclair', at(0, 2));
const south = place('neighborhood', 'South End', at(12, -2));
const levelOf = (r: ReturnType<typeof assignAreas>, level: string) => r.rows.filter((w) => r.areas.get(w.area_key)!.level === level);
const nameOf = (r: ReturnType<typeof assignAreas>, key: string) => r.areas.get(key)!.name;

test('area: a walk near one neighborhood gets one row at each level, with the right parents', () => {
  const r = assignAreas('w', walk([at(0, 1), at(4, 1)]), [], [montclair, upper, south], boundaries);
  for (const level of ['country', 'state', 'town', 'neighborhood']) assert.equal(levelOf(r, level).length, 1, level);
  const nb = levelOf(r, 'neighborhood')[0];
  assert.equal(nameOf(r, nb.area_key), 'Upper Montclair');
  const town = r.areas.get(r.areas.get(nb.area_key)!.parent_key!)!;
  assert.equal(town.name, 'Montclair');
  assert.equal(r.areas.get(town.parent_key!)!.name, 'North State');
  assert.ok(Math.abs(nb.metres - 400) <= 50, `about 400 m, got ${nb.metres}`);
  assert.equal(r.title, 'Upper Montclair');
});

test('area: a walk across two neighborhoods counts in both, metres split, titled by the larger', () => {
  // About 700 m nearest Upper Montclair, then 500 m nearest South End.
  const r = assignAreas('w', walk([at(0, 1), at(6, 1), at(6, -1), at(10, -1)]), [], [montclair, upper, south], boundaries);
  const nbs = levelOf(r, 'neighborhood');
  assert.equal(nbs.length, 2);
  const m = (name: string) => nbs.find((w) => nameOf(r, w.area_key) === name)!.metres;
  assert.ok(m('Upper Montclair') > m('South End'), 'more of it in Upper Montclair');
  assert.ok(Math.abs(m('Upper Montclair') + m('South End') - 1200) <= 60, 'every metre counted once');
  assert.equal(levelOf(r, 'town').length, 1, 'one town row');
  assert.equal(r.title, 'Upper Montclair');
});

test('area: no neighborhood within reach leaves a town row only (listed as "Elsewhere in" the town)', () => {
  const r = assignAreas('w', walk([at(20, 20), at(22, 20)]), [], [place('town', 'Glen Ridge', at(21, 22)), upper], boundaries);
  assert.equal(levelOf(r, 'neighborhood').length, 0);
  assert.equal(nameOf(r, levelOf(r, 'town')[0].area_key), 'Glen Ridge');
  assert.equal(r.title, 'Glen Ridge');
});

test('area: no town or city within reach leaves only state and country', () => {
  const r = assignAreas('w', walk([at(20, 80), at(22, 80)]), [], [montclair, upper, place('town', 'Far City', at(20, 200), AREA_REACH_M.city)], boundaries);
  assert.deepEqual(r.rows.map((w) => r.areas.get(w.area_key)!.level).sort(), ['country', 'state']);
});

test('area: a city counts from further away than a town', () => {
  const city = place('town', 'Newark', at(70, 0), AREA_REACH_M.city);
  const r = assignAreas('w', walk([at(10, 30), at(12, 30)]), [], [city, upper], boundaries);
  assert.equal(nameOf(r, levelOf(r, 'town')[0].area_key), 'Newark', '6 km from a city is in its reach');
});

test('area: pauses, gaps and standstills add no metres', () => {
  const a = walk([at(0, 1), at(2, 1)]);
  // A 20 s pause, during which the phone is carried 300 m.
  const pause = { started_at: a.at(-1)!.t + 1000, ended_at: a.at(-1)!.t + 21_000 };
  const b = walk([at(5, 1), at(7, 1)], pause.ended_at);
  // A 10 min gap, then a 10 min stay inside a café, then on.
  const c = walk([at(10, -1), at(10.5, -1)], b.at(-1)!.t + 10 * 60_000);
  const cafe: TracePoint[] = Array.from({ length: 120 }, (_, i) => ({
    walk_id: 'w', t: c.at(-1)!.t + (i + 1) * 5000, lon: at(10.5, -1)[0] + Math.sin(i * 1.7) * dLon * 0.12, lat: at(10.5, -1)[1] + Math.cos(i * 2.3) * dLat * 0.12, accuracy_m: 20, speed: 0, course: null,
  }));
  const r = assignAreas('w', [...a, ...b, ...c, ...cafe], [pause], [montclair, upper, south], boundaries);
  const total = levelOf(r, 'town').reduce((s, w) => s + w.metres, 0);
  assert.ok(Math.abs(total - 450) <= 60, `200 + 200 + 50 m walked, got ${total}`);
});

test('area: fixes dropped by the filter never assign an area', () => {
  // One wild fix 3 km away inside another neighborhood's reach, with 200 m accuracy.
  const good = walk([at(0, 1), at(3, 1)]);
  const wild: TracePoint = { ...good[10], t: good[10].t + 1, lon: at(30, 30)[0], lat: at(30, 30)[1], accuracy_m: 200 };
  const r = assignAreas('w', [...good.slice(0, 11), wild, ...good.slice(11)], [], [montclair, upper, place('neighborhood', 'Far Hill', at(30, 31))], boundaries);
  assert.ok(!levelOf(r, 'neighborhood').some((w) => nameOf(r, w.area_key) === 'Far Hill'));
});

test('area: the containing state wins over a nearer state point', () => {
  // Just west of the state line, but South State's point sits closer than North State's.
  const r = assignAreas('w', walk([at(48, 0), at(49, 0)]), [], [place('state', 'South State', at(51, 0), 300_000)], boundaries);
  assert.equal(nameOf(r, levelOf(r, 'state')[0].area_key), 'North State');
});

test('area: state points stand in where the boundary source has no answer', () => {
  const none: BoundarySource = { id: 'empty', containing: () => null };
  const r = assignAreas('w', walk([at(0, 1), at(2, 1)]), [], [montclair, upper, place('state', 'North State', at(0, 100), 300_000)], none);
  assert.equal(nameOf(r, levelOf(r, 'state')[0].area_key), 'North State');
});

test('area: two neighborhoods with one name under different towns are two areas', () => {
  const r1 = assignAreas('w', walk([at(0, 1), at(1, 1)]), [], [montclair, place('neighborhood', 'Downtown', at(0, 2))], boundaries);
  const r2 = assignAreas('w', walk([at(30, 1), at(31, 1)]), [], [place('town', 'Bloomfield', at(30, 0)), place('neighborhood', 'Downtown', at(30, 2))], boundaries);
  assert.notEqual(levelOf(r1, 'neighborhood')[0].area_key, levelOf(r2, 'neighborhood')[0].area_key);
});

test('area: a moved place keeps its key and moves its star; a renamed one gets a new key', () => {
  const path = walk([at(0, 1), at(2, 1)]);
  const before = assignAreas('w', path, [], [montclair, upper], boundaries);
  const moved = assignAreas('w', path, [], [montclair, place('neighborhood', 'Upper Montclair', at(0.5, 2.5))], boundaries);
  const renamed = assignAreas('w', path, [], [montclair, place('neighborhood', 'Upper Montclair Village', at(0, 2))], boundaries);
  const key = (r: typeof before) => levelOf(r, 'neighborhood')[0].area_key;
  assert.equal(key(moved), key(before));
  const star = (r: typeof before) => { const a = r.areas.get(key(r))!; return [a.lon, a.lat]; };
  assert.notDeepEqual(star(moved), star(before));
  assert.notEqual(key(renamed), key(before));
});

test('area: areas no walk refers to any more are the stale ones', () => {
  const stale = staleAreas(['a', 'b', 'c'], [{ area_key: 'a' }, { area_key: 'c' }]);
  assert.deepEqual(stale, ['b']);
});

test('area: rows carry when each area was walked, and where', () => {
  const path = walk([at(0, 1), at(4, 1)], 1_000_000);
  const r = assignAreas('w', path, [], [montclair, upper], boundaries);
  const nb = levelOf(r, 'neighborhood')[0];
  assert.ok(nb.first_t >= path[0].t && nb.last_t <= path.at(-1)!.t && nb.first_t < nb.last_t);
  assert.ok(Math.abs(nb.lon - at(2, 1)[0]) < dLon * 0.5 && Math.abs(nb.lat - at(2, 1)[1]) < dLat * 0.5, 'centered on what was walked');
});

test('area: the map tiles’ place points become candidates by level, with reach by size', () => {
  const pt = (cls: string, name: string, p: LngLat) => ({ geometry: { type: 'Point', coordinates: p }, properties: { class: cls, name } });
  const c = placesFromTiles([
    pt('neighbourhood', 'Upper Montclair', at(0, 2)),
    pt('suburb', 'Watchung Plaza', at(3, 3)),
    pt('town', 'Montclair', at(5, 0)),
    pt('city', 'Newark', at(70, 0)),
    pt('state', 'New Jersey', at(0, 300)),
    pt('island', 'Somewhere', at(1, 1)),
    { geometry: { type: 'Point', coordinates: at(1, 1) }, properties: { class: 'town' } },
  ]);
  const by = (n: string) => c.find((x) => x.name === n);
  assert.equal(by('Upper Montclair')?.level, 'neighborhood');
  assert.equal(by('Watchung Plaza')?.level, 'neighborhood');
  assert.equal(by('Montclair')?.reachM, AREA_REACH_M.town);
  assert.equal(by('Newark')?.reachM, AREA_REACH_M.city);
  assert.equal(by('New Jersey')?.level, 'state');
  assert.equal(c.length, 5, 'unlisted classes and unnamed points are left out');
  // The same point from two overlapping tiles is one candidate.
  assert.equal(placesFromTiles([pt('town', 'Montclair', at(5, 0)), pt('town', 'Montclair', at(5, 0))]).length, 1);
});

test('boundaries: a pack answers which country and state a point is in, holes included', () => {
  const sq = (x0: number, y0: number, x1: number, y1: number): LngLat[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
  const src = boundarySource([{
    id: 'test-pack',
    countries: [{ name: 'Testland', code: 'TL', at: [5, 5] }],
    states: [
      { name: 'Ring State', code: 'TL-R', country: 'TL', at: [1, 1], bbox: [0, 0, 10, 10], polygons: [[sq(0, 0, 10, 10), sq(4, 4, 6, 6)]] },
      { name: 'Hole State', code: 'TL-H', country: 'TL', at: [5, 5], bbox: [4, 4, 6, 6], polygons: [[sq(4, 4, 6, 6)]] },
    ],
  }]);
  assert.equal(src.containing([1, 1])?.state?.name, 'Ring State');
  assert.equal(src.containing([1, 1])?.country?.name, 'Testland');
  assert.equal(src.containing([5, 5])?.state?.name, 'Hole State', 'the hole belongs to the state inside it');
  assert.equal(src.containing([20, 20]), null);
  assert.equal(src.id, 'test-pack');
  // Just past the outline (a pier, a beach the coastline cuts off): the state within reach.
  const offCoast = boundarySource([{
    id: 'coast', countries: [{ name: 'Testland', code: 'TL', at: [0, 0] }],
    states: [{ name: 'Shore State', code: 'TL-S', country: 'TL', at: [0, 0], bbox: [-74.1, 40.7, -74.0, 40.8], polygons: [[[[-74.1, 40.7], [-74.0, 40.7], [-74.0, 40.8], [-74.1, 40.8], [-74.1, 40.7]]]] }],
  }]);
  assert.equal(offCoast.containing([-73.995, 40.75])?.state?.name, 'Shore State', '420 m off the edge');
  assert.equal(offCoast.containing([-73.97, 40.75]), null, '2.5 km off is not');
});

test('boundaries: the shipped US pack places real points', () => {
  const pack = createRequire(import.meta.url)('../../../assets/boundaries/us.json');
  const us = boundarySource([pack]);
  assert.equal(us.containing([-74.209, 40.817])?.state?.name, 'New Jersey', 'Montclair');
  assert.equal(us.containing([-73.985, 40.758])?.state?.name, 'New York', 'Midtown, across the river');
  assert.equal(us.containing([-71.4, 41.82])?.state?.name, 'Rhode Island', 'Providence');
  assert.equal(us.containing([-74.03, 40.744])?.state?.name, 'New Jersey', 'Hoboken, on the river');
  assert.equal(us.containing([-80.13, 25.79])?.state?.name, 'Florida', 'Miami Beach, on its barrier island');
  assert.equal(us.containing([-74.209, 40.817])?.country?.code, 'US');
  assert.equal(us.containing([-40, 40]), null, 'mid-Atlantic');
});
