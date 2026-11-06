import assert from 'node:assert/strict';
import { test } from 'node:test';
import { distanceM } from '../../geo';
import { densestCells, onStreets } from '../../kindWalk/density';
import { MAX_RETRACE, planKindWalk, retracedM } from '../../kindWalk/plan';
import { routeTo, routeVia } from '../../nav/navigator';
import { streetRouteSource } from '../../nav/streetRoute';
import type { LngLat, StreetSegment } from '../../types';

// Kind walk, found on the owner's phone (Bethlehem, 2026-11-06): the way doubled back on itself, and the panel's distance was
// not the bar's. Both were reproduced on this street grid first: 40 walkers and scatterings of places, the old planner retraced
// up to 41% of the route shown, and stated a length 300 to 1100 m short of it.

const A: LngLat = [-75.38, 40.62];
const at = (e: number, n: number): LngLat => [A[0] + e / (111320 * Math.cos((A[1] * Math.PI) / 180)), A[1] + n / 111320];
const segs: StreetSegment[] = [];
let id = 0;
for (let i = 0; i <= 12; i++) {
  for (let j = 0; j < 12; j++) {
    segs.push({ id: `h${id++}`, name: `S${i}`, kind_detail: 'residential', length_m: 120, geometry: [[at(j * 120, i * 120), at((j + 1) * 120, i * 120)]], build: 'b' });
    segs.push({ id: `v${id++}`, name: `A${i}`, kind_detail: 'residential', length_m: 120, geometry: [[at(i * 120, j * 120), at(i * 120, (j + 1) * 120)]], build: 'b' });
  }
}
const src = streetRouteSource(segs);
const leg = (a: LngLat, b: LngLat) => routeTo([src], a, b, 'shortest').route;

/** Forty walkers and scatterings of places, the same every run. */
function cases() {
  const out: { from: LngLat; cells: ReturnType<typeof onStreets> }[] = [];
  for (let seed = 1; seed <= 40; seed++) {
    let s = seed * 7919;
    const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const places = Array.from({ length: 30 }, () => ({ at: at(rnd() * 1300, rnd() * 1300) }));
    out.push({ cells: onStreets(densestCells(places, at(650, 650)), segs.flatMap((x) => x.geometry)), from: at(rnd() * 1300, rnd() * 1300) });
  }
  return out;
}

test('KW16: One continuous route: no more than a tenth of the route runs over a street it has already used', () => {
  let walks = 0;
  for (const c of cases()) {
    const r = planKindWalk(c.cells, c.from, 2000, leg);
    if (r.kind !== 'walk') continue;
    walks += 1;
    const again = retracedM(r.walk.path);
    assert.ok(again <= MAX_RETRACE * r.walk.lengthM + 1, `retraced ${Math.round(again)} m of ${Math.round(r.walk.lengthM)} m`);
  }
  assert.ok(walks >= 25, `most of the cases make a walk (${walks})`);
});

test('KW16: retracing is measured over the path, in either direction', () => {
  const p: LngLat[] = [at(0, 0), at(100, 0), at(200, 0), at(100, 0), at(0, 0)];
  assert.ok(Math.abs(retracedM(p) - 200) < 2, 'out and back over two pieces is 200 m walked twice');
  assert.equal(retracedM([at(0, 0), at(100, 0), at(100, 100)]), 0);
});

test('KW17: One distance: the stated length is the route the walk screen navigates, from where you stand', () => {
  let walks = 0;
  for (const c of cases()) {
    const r = planKindWalk(c.cells, c.from, 2000, leg);
    if (r.kind !== 'walk') continue;
    walks += 1;
    const stops = r.walk.stops;
    // What the walk screen routes: the walker, every stop but the last as a stop to pass, then the last (useNavigation goTo).
    const shown = routeVia([src], c.from, stops.slice(0, -1), stops[stops.length - 1], 'shortest').route!;
    assert.ok(Math.abs(shown.lengthM - r.walk.lengthM) <= 1, `stated ${Math.round(r.walk.lengthM)} m, navigated ${Math.round(shown.lengthM)} m`);
    assert.ok(r.walk.lengthM <= 2000 * 1.25 + 1, 'the budget is a ceiling on the whole route');
    assert.ok(r.walk.startM <= r.walk.lengthM, 'the way there is part of it');
    assert.ok(distanceM(r.walk.path[0], c.from) < 1, 'the path begins where the walker stands');
  }
  assert.ok(walks >= 25);
});
