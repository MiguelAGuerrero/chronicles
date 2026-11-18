// @layer core
import { distanceM } from '../geo';
import type { LngLat } from '../types';
import { ROAD_RULES, type RoadRules } from './rules';

/*
 * The tiles a way may run through (RE7): those within a set distance of the straight stretches between the points, at the engine's
 * zoom. More than the bound and there are none: the journey is too long for one read. They come back in no order along the way
 * (sorted by column and row), so the order they are asked for says nothing of which end is the start.
 */
type Rules = Pick<RoadRules, 'zoom' | 'padM' | 'tilesMax'>;

const M_PER_DEG = 111_320;

function tileOf(p: LngLat, z: number): [number, number] {
  const n = 2 ** z;
  const r = (p[1] * Math.PI) / 180;
  return [Math.floor(((p[0] + 180) / 360) * n), Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n)];
}

export function tilesAlong(points: readonly LngLat[], rules: Rules = ROAD_RULES): [number, number][] | null {
  const seen = new Map<string, [number, number]>();
  const cover = (p: LngLat): boolean => {
    const dLat = rules.padM / M_PER_DEG;
    const dLon = rules.padM / (M_PER_DEG * Math.max(0.05, Math.cos((p[1] * Math.PI) / 180)));
    const [x0, y0] = tileOf([p[0] - dLon, p[1] + dLat], rules.zoom);
    const [x1, y1] = tileOf([p[0] + dLon, p[1] - dLat], rules.zoom);
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) seen.set(`${x}/${y}`, [x, y]);
    return seen.size <= rules.tilesMax;
  };
  for (let i = 0; i < points.length; i++) {
    if (!cover(points[i])) return null;
    if (i === 0) continue;
    const a = points[i - 1];
    const b = points[i];
    const steps = Math.ceil(distanceM(a, b) / 1000);
    for (let s = 1; s < steps; s++) if (!cover([a[0] + ((b[0] - a[0]) * s) / steps, a[1] + ((b[1] - a[1]) * s) / steps])) return null;
  }
  return [...seen.values()].sort((p, q) => p[0] - q[0] || p[1] - q[1]);
}
