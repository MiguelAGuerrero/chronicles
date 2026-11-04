// @layer core
import { inOutline } from '../areas/outlines';
import type { TownOutline } from '../areas/types';
import { distanceM } from '../geo';
import { tileRect } from '../tileMath';
import type { LngLat } from '../types';

/*
 * TP1-TP3: what a town's read covers. The extent is the town's whole outline (the z10 read the borders
 * use); a read takes the z14 tiles the outline touches, at most a budget of them, nearest the town's
 * point first, and says when the outline needed more.
 */

/** TP3: at most this many z14 tiles in one town read (Whitehall's outline touches 35, Allentown's 42). */
export const TILE_BUDGET = 60;

type Outline = Pick<TownOutline, 'polygons' | 'bbox'>;

/** TP1: whether a point is inside the town (any piece, outside its holes). */
export const inExtent = (p: LngLat, outline: Outline): boolean => inOutline(p, outline);

const N14 = 2 ** 14;
const tileX = (lon: number) => Math.floor(((lon + 180) / 360) * N14);
const tileY = (lat: number) => {
  const r = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * N14);
};

/**
 * TP2, TP3: the z14 tiles an outline touches (a tile holding part of its border, or lying inside it),
 * nearest `from` first, cut to `budget`. `partial` is true when the outline touches more.
 */
export function extentTiles(outline: Outline, from: LngLat, budget: number = TILE_BUDGET): { tiles: [number, number][]; partial: boolean } {
  const touched = new Map<string, [number, number]>();
  const add = (p: LngLat) => {
    const x = tileX(p[0]);
    const y = tileY(p[1]);
    touched.set(`${x}/${y}`, [x, y]);
  };
  // Along every ring, a point at least every 150 m, so an edge crossing a tile without a vertex in it counts.
  for (const rings of outline.polygons) {
    for (const ring of rings) {
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i];
        const b = ring[(i + 1) % ring.length];
        const steps = Math.max(1, Math.ceil(distanceM(a, b) / 150));
        for (let s = 0; s < steps; s++) add([a[0] + ((b[0] - a[0]) * s) / steps, a[1] + ((b[1] - a[1]) * s) / steps]);
      }
    }
  }
  // Tiles inside the outline, between the border's tiles: every tile in the box whose middle is inside.
  const [w, s, e, n] = outline.bbox;
  for (let x = tileX(w); x <= tileX(e); x++) {
    for (let y = tileY(n); y <= tileY(s); y++) {
      const r = tileRect(x, y);
      if (inOutline([(r.w + r.e) / 2, (r.n + r.s) / 2], outline)) touched.set(`${x}/${y}`, [x, y]);
    }
  }
  const centre = ([x, y]: [number, number]): LngLat => {
    const r = tileRect(x, y);
    return [(r.w + r.e) / 2, (r.n + r.s) / 2];
  };
  const all = [...touched.values()].sort((a, b) => distanceM(centre(a), from) - distanceM(centre(b), from));
  return { tiles: all.slice(0, budget), partial: all.length > budget };
}
