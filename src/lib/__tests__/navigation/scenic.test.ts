/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { distanceM } from '../../geo';
import { measure, routeOptions, rowWords, SCENIC, scenicPlan, scenicRouteSource, shared, type Leaning, type RouteOption } from '../../nav/scenic';
import { sightsFrom, type GreenArea, type Signals, type Sight } from '../../nav/scenicSignals';
import type { Place } from '../../discovery/types';
import { streetRouteSource } from '../../nav/streetRoute';
import type { Waypoint } from '../../nav/types';
import type { LngLat, StreetSegment } from '../../types';

// Scenic routes (specs/scenic-routes, SR2-SR7, SR10, SR12), written from the criteria before the code.
// A ladder of streets 100 m apart: the direct way runs along y=0 for 1 km; a parallel street at y=1.1
// (110 m north) is a 22% detour, one at y=-1.1 the same to the south, one at y=3 a 60% detour.

const O: LngLat = [-71.4, 41.812];
const dLat = 100 / 111320;
const dLon = 100 / (111320 * Math.cos((O[1] * Math.PI) / 180));
/** x, y in units of 100 m east and north of O. */
const at = (x: number, y: number): LngLat => [O[0] + x * dLon, O[1] + y * dLat];

let n = 0;
const seg = (pts: LngLat[], name: string | null = null): StreetSegment => ({
  id: `s${n++}`, name, kind_detail: 'minor', length_m: 0, geometry: [pts], build: 't',
});
/** A street along y from x0 to x1, a vertex every 100 m. */
const along = (y: number, x0 = 0, x1 = 10, name: string | null = null) =>
  seg(Array.from({ length: x1 - x0 + 1 }, (_, i) => at(x0 + i, y)), name);
const rung = (x: number, y0: number, y1: number) => seg([at(x, y0), at(x, y1)]);

const ladder = (extra: StreetSegment[] = []) =>
  streetRouteSource([along(0, 0, 10, 'Wickenden Street'), along(1.1, 0, 10, 'Transit Street'), rung(0, 0, 1.1), rung(10, 0, 1.1), ...extra]);
const south = () => [along(-1.1, 0, 10, 'Brook Street'), rung(0, -1.1, 0), rung(10, -1.1, 0)];
const far = () => [along(3, 0, 10, 'Far Street'), rung(0, 1.1, 3), rung(10, 1.1, 3)];

const rect = (x0: number, x1: number, y0: number, y1: number, name: string | null = null, kind: GreenArea['kind'] = 'park'): GreenArea => ({
  rings: [[at(x0, y0), at(x1, y0), at(x1, y1), at(x0, y1), at(x0, y0)]], kind, name,
});
const sight = (x: number, y: number, name: string, found = false): Sight => ({ key: name, at: at(x, y), name, found });
const none: Signals = { green: [], sights: [], busy: [] };
const sig = (s: Partial<Signals>): Signals => ({ ...none, ...s });

const from = at(0, 0);
const to = at(10, 0);
const opts = (streets: ReturnType<typeof ladder>, signals: Signals, leanings: Leaning[]) => routeOptions({ streets, signals, leanings, from, to });
const lengthOf = (o: RouteOption) => o.route.lengthM;
/** The highest y the path reaches, in units of 100 m. */
const north = (p: LngLat[]) => Math.max(...p.map((q) => (q[1] - O[1]) / dLat));
const southmost = (p: LngLat[]) => Math.min(...p.map((q) => (q[1] - O[1]) / dLat));

const park = rect(2, 8, 0.95, 1.25, 'Prospect Park');
const thayer = { name: 'Thayer Street', grade: 3 as const, lines: [[at(1, 1.1), at(9, 1.1)]] };

test('SR2: Direct first, then one option per leaning switched on', () => {
  const streets = ladder(south());
  const brook = { name: 'Brook Street', grade: 3 as const, lines: [[at(1, -1.1), at(9, -1.1)]] };
  const o = opts(streets, sig({ green: [park], busy: [brook] }), ['green', 'sights', 'busy']);
  assert.deepEqual(o.map((x) => x.leanings), [[], ['green'], ['busy']], 'nothing to see: no Sights row');
  assert.ok(north(o[1].route.path) > 1, 'green goes north through the park');
  assert.ok(southmost(o[2].route.path) < -1, 'busy goes south along Brook Street');
  assert.ok(north(o[0].route.path) < 0.1 && southmost(o[0].route.path) > -0.1, 'Direct stays on the straight street');
  const greenOnly = opts(streets, sig({ green: [park], busy: [brook] }), ['green']);
  assert.deepEqual(greenOnly.map((x) => x.leanings), [[], ['green']], 'a leaning switched off gives no row');
});

test('SR2: scenic applies to Go here within 5 km with a leaning on; SR9 says why not past it', () => {
  const dest = (kind: Waypoint['kind'], to: LngLat): Waypoint => ({ at: to, label: 'Your spot', kind });
  assert.deepEqual(scenicPlan(dest('point', at(10, 0)), from, ['green']), { scenic: true });
  assert.deepEqual(scenicPlan(dest('point', at(10, 0)), from, []), { scenic: false, notice: null }, 'all off: as before, no notice');
  const tooFar = at(SCENIC.maxM / 100 + 1, 0);
  assert.ok(distanceM(from, tooFar) > SCENIC.maxM);
  assert.deepEqual(scenicPlan(dest('place', tooFar), from, ['green']), { scenic: false, notice: 'Scenic routes reach 5 km' });
});

test('SR12: Walk me back gets no options and no notice', () => {
  assert.deepEqual(scenicPlan({ at: at(10, 0), label: 'Start', kind: 'start' }, from, ['green', 'sights', 'busy']), { scenic: false, notice: null });
});

test('SR3: every row says its own distance in the chosen units, never a time or minutes compared', () => {
  const o = opts(ladder(), sig({ green: [park] }), ['green']);
  assert.equal(o.length, 2);
  const direct = rowWords(o[0], 'km');
  assert.equal(direct.title, 'Direct');
  assert.match(direct.distance, /^(999 m|1\.0 km)$/, 'the ladder is 1 km to a metre');
  const green = rowWords(o[1], 'km');
  assert.equal(green.title, 'Through green');
  assert.equal(green.distance, '1.2 km', 'the whole route\'s distance');
  // In miles, as the units setting says (QL13): 1220 m is 0.8 mi, 999 m is 0.6 mi.
  assert.equal(rowWords(o[1], 'mi').distance, '0.8 mi');
  assert.equal(rowWords(o[0], 'mi').distance, '0.6 mi');
  for (const w of [direct, green, rowWords(o[1], 'mi')]) {
    const all = Object.values(w).join(' ');
    assert.doesNotMatch(all, /%|score|rank|points|\bmins?\b|minutes?|hours?|fast|quick|sooner|detour|longer|more/i, 'a distance only: no time, no difference said (VISION.md, Never; the owner, Nov 5)');
  }
  assert.equal(green.label, 'Through green, 1.2 km, through Prospect Park');
  assert.equal(rowWords({ ...o[1], leanings: ['busy'] }, 'km').title, 'Along busy streets');
  assert.equal(rowWords({ ...o[1], leanings: ['sights'] }, 'km').title, 'Past the sights');
});

test('SR4: parks and streets by name, found places by name, unfound never named', () => {
  const streets = ladder();
  const g = opts(streets, sig({ green: [park] }), ['green']);
  assert.equal(rowWords(g[1], 'km').passes, 'through Prospect Park');
  const unnamed = opts(streets, sig({ green: [rect(2, 8, 0.95, 1.25)] }), ['green']);
  assert.equal(rowWords(unnamed[1], 'km').passes, 'through a park');
  const woods = opts(streets, sig({ green: [rect(2, 8, 0.95, 1.25, null, 'wood')] }), ['green']);
  assert.equal(rowWords(woods[1], 'km').passes, 'through woods');
  const b = opts(streets, sig({ busy: [thayer] }), ['busy']);
  assert.equal(rowWords(b[1], 'km').passes, 'along Thayer Street');
  const one = opts(streets, sig({ sights: [sight(5, 1.3, 'Old Bell')] }), ['sights']);
  assert.equal(one.length, 2);
  assert.equal(rowWords(one[1], 'km').passes, 'past a place to find');
  const two = opts(streets, sig({ sights: [sight(4, 1.3, 'Old Bell'), sight(6, 1.3, 'Clock Tower')] }), ['sights']);
  const said = rowWords(two[1], 'km');
  assert.equal(said.passes, 'past two places to find');
  assert.doesNotMatch(said.label, /Old Bell|Clock Tower/, 'an unfound place is never named');
  const mixed = opts(streets, sig({ sights: [sight(4, 1.3, 'Old Bell', true), sight(6, 1.3, 'Clock Tower')] }), ['sights']);
  assert.equal(rowWords(mixed[1], 'km').passes, 'past Old Bell and a place to find');
});

test('SR5: a scenic route is never more than 30% longer than the direct one', () => {
  // Green only on the far street, a 60% detour: not offered at all.
  const streets = ladder(far());
  const o = opts(streets, sig({ green: [rect(1, 9, 2.8, 3.2, 'Far Park')] }), ['green']);
  assert.equal(o.length, 1, 'the far park is past the budget');
  // Random parks, places and busy streets over a 10 x 4 grid of 100 m blocks: every option within 30%.
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const grid: StreetSegment[] = [];
  for (let y = 0; y <= 4; y++) grid.push(along(y - 2));
  for (let x = 0; x <= 10; x++) grid.push(seg([at(x, -2), at(x, -1), at(x, 0), at(x, 1), at(x, 2)]));
  const g = streetRouteSource(grid);
  for (let k = 0; k < 25; k++) {
    const x0 = rnd() * 8;
    const y0 = rnd() * 4 - 2;
    const s = sig({
      green: [rect(x0, x0 + 1 + rnd() * 3, y0, y0 + 0.5 + rnd())],
      sights: [sight(rnd() * 10, rnd() * 4 - 2, `S${k}`)],
      busy: [{ name: 'Main', grade: 2, lines: [[at(rnd() * 10, Math.round(rnd() * 4 - 2)), at(rnd() * 10, Math.round(rnd() * 4 - 2))]] }],
    });
    const a = at(0, Math.round(rnd() * 4 - 2));
    const b = at(10, Math.round(rnd() * 4 - 2));
    const o2 = routeOptions({ streets: g, signals: s, leanings: ['green', 'sights', 'busy'], from: a, to: b });
    for (const x of o2.slice(1)) assert.ok(lengthOf(x) <= lengthOf(o2[0]) * (1 + SCENIC.detour) + 1e-6, `case ${k}: ${lengthOf(x)} vs ${lengthOf(o2[0])}`);
  }
});

test('SR6: the Green route runs a longer stretch inside parks', () => {
  const s = sig({ green: [park] });
  const o = opts(ladder(), s, ['green']);
  assert.equal(o.length, 2);
  assert.ok(measure.green(o[1].route.path, s) >= measure.green(o[0].route.path, s) + SCENIC.minGainM);
  assert.ok(Math.abs(measure.green(o[1].route.path, s) - 600) < 25, 'about the 600 m of the park');
});

test('SR6: the Sights route passes more places worth seeing', () => {
  const s = sig({ sights: [sight(5, 1.3, 'Old Bell')] });
  const o = opts(ladder(), s, ['sights']);
  assert.equal(o.length, 2);
  assert.equal(measure.sights(o[0].route.path, s), 0);
  assert.equal(measure.sights(o[1].route.path, s), 1);
  assert.ok(o[1].route.path.some((p) => distanceM(p, at(5, 1.3)) <= SCENIC.sightM), 'within 40 m of it');
  // A place 100 m off every street is never passed: nothing offered.
  assert.equal(opts(ladder(), sig({ sights: [sight(5, 2.2, 'Far Bell')] }), ['sights']).length, 1);
});

test('SR6: Sights are the places worth finding, of the kinds on in "What I\'m into"', () => {
  const place = (name: string, category: Place['category'], kind?: Place['kind'], markable = true): Place =>
    ({ key: name, name, category, at: at(1, 1), generic: false, build: 't', markable, kind });
  const s = sightsFrom(
    [place('Old Bell', 'history', 'monuments'), place('St Ann', 'history', 'churches'), place('Cafe', 'food'), place('Green', 'parks', 'parks'),
      place('Cinema', 'culture', undefined, false), place('Mural', 'art', 'public_art')],
    new Set(['churches']),
    new Set(['Mural']),
  );
  assert.deepEqual(s.map((x) => [x.name, x.found]), [['Old Bell', false], ['Mural', true]], 'churches off, food and parks are not sights, a cinema is never a mark');
});

test('SR6: the Busy route runs more graded length, a stronger grade counting more', () => {
  const s = sig({ busy: [thayer] });
  const o = opts(ladder(), s, ['busy']);
  assert.equal(o.length, 2);
  assert.ok(measure.busy(o[1].route.path, s) >= measure.busy(o[0].route.path, s) + SCENIC.minGainM);
  const weak = sig({ busy: [{ ...thayer, grade: 1 }] });
  assert.ok(measure.busy(o[1].route.path, weak) < measure.busy(o[1].route.path, s), 'grade 1 counts less than grade 3');
  // North at grade 1 against south at grade 3: the stronger grade wins.
  const streets = ladder(south());
  const both = sig({ busy: [{ ...thayer, grade: 1 }, { name: 'Brook Street', grade: 3, lines: [[at(1, -1.1), at(9, -1.1)]] }] });
  const pick = opts(streets, both, ['busy']);
  assert.ok(southmost(pick[1].route.path) < -1, 'along Brook Street, the busier');
});

test('SR6: under 100 m of gain is not offered', () => {
  const small = sig({ green: [rect(4.5, 5.3, 0.95, 1.25)] });
  assert.equal(opts(ladder(), small, ['green']).length, 1, '80 m of park is not worth the detour');
  const quiet = sig({ busy: [{ name: 'Short', grade: 3, lines: [[at(4.6, 1.1), at(5.4, 1.1)]] }] });
  assert.equal(opts(ladder(), quiet, ['busy']).length, 1);
});

test('SR7: two leanings on one way show as one row naming both; one like Direct is dropped', () => {
  const s = sig({ green: [park], sights: [sight(5, 1.3, 'Old Bell')] });
  const o = opts(ladder(), s, ['green', 'sights']);
  assert.equal(o.length, 2, 'merged');
  assert.deepEqual(o[1].leanings, ['green', 'sights']);
  assert.equal(rowWords(o[1], 'km').title, 'Through green, past the sights');
  assert.equal(rowWords(o[1], 'km').passes, 'through Prospect Park, past a place to find');
  // A park along the direct street itself: the green route is the direct one.
  const onDirect = sig({ green: [rect(2, 8, -0.2, 0.2, 'Riverside')] });
  assert.equal(opts(ladder(), onDirect, ['green']).length, 1);
  assert.ok(shared(o[0].route.path, o[0].route.path) > 0.99);
  assert.ok(shared(o[0].route.path, o[1].route.path) < SCENIC.directShare);
});

test('SR10: off a scenic route, the re-route keeps the leaning within 30% of what is left', () => {
  const streets = ladder();
  const s = sig({ green: [park] });
  const src = scenicRouteSource(streets, s, ['green']);
  assert.equal(src.id, 'scenic:green');
  // Drifted 50 m up the west rung: the direct way from here is 1050 m back down and along; the park's
  // way is 1170 m, inside 30% of it.
  const here = at(0, 0.5);
  const again = src.route(here, to)!;
  const direct = streets.route(here, to)!;
  assert.ok(north(again.path) > 1, 'still through the park');
  assert.ok(again.lengthM <= direct.lengthM * (1 + SCENIC.detour) + 1e-6);
  // Past the park: nothing on that leaning is worth it, so the direct way.
  const past = src.route(at(9, 0), to)!;
  assert.ok(north(past.path) < 0.1, 'the direct way');
  assert.equal(scenicRouteSource(streets, s, ['green', 'sights']).id, 'scenic:green+sights');
});
