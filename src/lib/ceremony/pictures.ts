// @layer core
/**
 * The pictures a replay leaves standing on the map (replay ceremony RC28, RC34; decision 0206): each moment that had a
 * picture or a video stands as that picture at its place, drawn by the stage over the map, never by the map's pins
 * (0154 holds on every map). Where two would overlap, the later one shows, with a layered edge.
 *
 * Which ones show is a matter of how far apart their places are on the screen, so of the map's zoom alone, never of
 * where its centre is: a telling asks again only when its zoom changes or another picture lands.
 */
import type { LngLat } from '../types';

/** Whether a picture stands (or is under a later one), and whether it has a layered edge. */
export interface Standing {
  shown: boolean;
  layered: boolean;
}

/** A place in px at a zoom, as a map lays the world out (Web Mercator, 512 px tiles). */
function pxAt(p: LngLat, scale: number): [number, number] {
  return [(p[0] / 360 + 0.5) * scale, (0.5 - Math.log(Math.tan(Math.PI / 4 + (p[1] * Math.PI) / 360)) / (2 * Math.PI)) * scale];
}

/**
 * Which pictures stand at a zoom (RC34). `places` are in the order their pictures came to stand, earliest first;
 * `several` says which are moments of several pieces. Read from the latest back: a picture stands unless a later one
 * that stands is within `apart` px of it, in which case it is under that one, which then has a layered edge. So the
 * later one always shows, and a picture nothing shown covers still stands (three in a row: the first and the last).
 * A moment of several pieces has a layered edge wherever it stands. One pass over a grid of `apart`-sized cells:
 * linear in the pictures, for every frame of a rise or a pull-back. `n` reads only the first so many.
 */
export function standing(places: LngLat[], several: boolean[], zoom: number, apart: number, n = places.length): Standing[] {
  const out: Standing[] = new Array(n);
  const scale = 512 * 2 ** zoom;
  const cell = Math.max(1, apart);
  /** The pictures that stand, by the cell their place is in. */
  const cells = new Map<number, number[]>();
  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  // A cell's key: its column and row in one number (a screenful of cells either way of the telling's own places).
  const keyOf = (cx: number, cy: number) => cx * 4194304 + cy;
  for (let i = n - 1; i >= 0; i--) {
    const [x, y] = pxAt(places[i], scale);
    xs[i] = x;
    ys[i] = y;
    const cx = Math.floor(x / cell);
    const cy = Math.floor(y / cell);
    let over = -1;
    for (let dx = -1; dx <= 1 && over < 0; dx++) {
      for (let dy = -1; dy <= 1 && over < 0; dy++) {
        const list = cells.get(keyOf(cx + dx, cy + dy));
        if (!list) continue;
        for (const j of list) {
          if (Math.hypot(xs[j] - x, ys[j] - y) < apart) {
            over = j;
            break;
          }
        }
      }
    }
    if (over >= 0) {
      out[i] = { shown: false, layered: false };
      out[over].layered = true;
      continue;
    }
    out[i] = { shown: true, layered: !!several[i] };
    const key = keyOf(cx, cy);
    const list = cells.get(key);
    if (list) list.push(i);
    else cells.set(key, [i]);
  }
  return out;
}
