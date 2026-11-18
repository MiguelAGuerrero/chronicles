// @layer core
import { distanceM } from '../geo';
import type { LngLat } from '../types';

/*
 * A road's line for the map (RE16): the same line with fewer points, since a map source is serialised whole each time it changes.
 * Points nearer than a step to the last one kept are dropped, and the step doubles until the line fits; the ends are kept.
 */
export function thinLine(path: readonly LngLat[], maxPoints: number): LngLat[] {
  let out = [...path];
  for (let stepM = 25; out.length > maxPoints; stepM *= 2) {
    const kept: LngLat[] = [path[0]];
    for (let i = 1; i < path.length - 1; i++) if (distanceM(kept[kept.length - 1], path[i]) >= stepM) kept.push(path[i]);
    kept.push(path[path.length - 1]);
    out = kept;
  }
  return out;
}
