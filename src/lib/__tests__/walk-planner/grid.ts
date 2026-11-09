import { distanceM } from '../../geo';
import { densestCells, onStreets, type Cell } from '../../kindWalk/density';
import { routeTo } from '../../nav/navigator';
import { streetRouteSource } from '../../nav/streetRoute';
import type { LngLat, StreetSegment } from '../../types';
import type { Leg } from '../../walkPlanner/planner';

// A 12 x 12 grid of streets 120 m apart (a town's blocks), shared by the planner's tests.
export const A: LngLat = [-75.38, 40.62];
export const at = (e: number, n: number): LngLat => [A[0] + e / (111320 * Math.cos((A[1] * Math.PI) / 180)), A[1] + n / 111320];
export const segs: StreetSegment[] = [];
let id = 0;
for (let i = 0; i <= 12; i++) {
  for (let j = 0; j < 12; j++) {
    segs.push({ id: `h${id++}`, name: `S${i}`, kind_detail: 'residential', length_m: 120, geometry: [[at(j * 120, i * 120), at((j + 1) * 120, i * 120)]], build: 'b' });
    segs.push({ id: `v${id++}`, name: `A${i}`, kind_detail: 'residential', length_m: 120, geometry: [[at(i * 120, j * 120), at(i * 120, (j + 1) * 120)]], build: 'b' });
  }
}
const key = (p: LngLat) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`;
const edge = (a: LngLat, b: LngLat) => [key(a), key(b)].sort().join('>');
const full = streetRouteSource(segs);

/** Routing over the grid; with `avoid`, over the streets that path does not use, else over all of them. */
export const leg: Leg = (a, b, avoid) => {
  if (!avoid) return routeTo([full], a, b, 'shortest').route;
  const used = new Set<string>();
  for (let i = 1; i < avoid.length; i++) used.add(edge(avoid[i - 1], avoid[i]));
  const keep = segs.filter((s) => !s.geometry.some((line) => line.some((p, i) => i > 0 && used.has(edge(line[i - 1], p)))));
  return keep.length ? routeTo([streetRouteSource(keep)], a, b, 'shortest').route : null;
};

/** `n` scatterings of places and walkers, the same every run. */
export function cases(n = 40, places = 30): { from: LngLat; cells: Cell[] }[] {
  const out: { from: LngLat; cells: Cell[] }[] = [];
  for (let seed = 1; seed <= n; seed++) {
    let s = seed * 7919;
    const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const ps = Array.from({ length: places }, () => ({ at: at(rnd() * 1300, rnd() * 1300) }));
    out.push({ cells: onStreets(densestCells(ps, at(650, 650)), segs.flatMap((x) => x.geometry)), from: at(rnd() * 1300, rnd() * 1300) });
  }
  return out;
}
export { distanceM };
