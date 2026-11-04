// A small grid near Fox Point, Providence, for tests that need streets and a
// walk along them: two east-west streets 100 m apart and one north-south street
// joining them, well inside one z14 tile (a tile edge is 50 m from lat 41.82,
// so the tests sit at 41.812). A helper, not a test: changing it runs every test.
import { distanceM, stepToward } from '../geo';
import type { RoadFeature } from '../streets';
import type { LngLat, TracePoint } from '../types';

export const O: LngLat = [-71.4, 41.812];
export const dLat = 100 / 111320;
export const dLon = 100 / (111320 * Math.cos((O[1] * Math.PI) / 180));
/** x, y in units of 100 m east and north of O. */
export const at = (x: number, y: number): LngLat => [O[0] + x * dLon, O[1] + y * dLat];

export const road = (coords: LngLat[], props: Record<string, unknown>): RoadFeature => ({
  geometry: { type: 'LineString', coordinates: coords },
  properties: props,
});

// Ways that meet share a vertex there, as OSM ways share the intersection node.
export const roads = [
  road([at(0, 0), at(1, 0), at(3, 0)], { class: 'minor' }), // 300 m, south street
  road([at(0, 1), at(1, 1), at(3, 1)], { class: 'minor' }), // 300 m, north street
  road([at(1, 0), at(1, 1)], { class: 'minor' }), // 100 m connector
  road([at(0, -0.1), at(3, -0.1)], { class: 'path', subclass: 'footway' }), // sidewalk, 11 m off
  road([at(0, 3), at(3, 3)], { class: 'motorway' }),
];
export const names = [
  road([at(0, 0), at(3, 0)], { name: 'Wickenden Street' }),
  road([at(0, 1), at(3, 1)], { name: 'Transit Street' }),
];

/** A trace along `path` at 1.4 m/s, one fix every 5 s. */
export function walkAlong(path: LngLat[], walkId = 'w1', t0 = 0, jitter = 0): TracePoint[] {
  const pts: TracePoint[] = [];
  let pos = path[0];
  let t = t0;
  for (const target of path.slice(1)) {
    while (distanceM(pos, target) > 0.1) {
      pos = stepToward(pos, target, 1.4 * 5);
      t += 5000;
      pts.push({ walk_id: walkId, t, lat: pos[1] + jitter * dLat / 100, lon: pos[0], accuracy_m: 8, speed: 1.4, course: null });
    }
  }
  return pts;
}
