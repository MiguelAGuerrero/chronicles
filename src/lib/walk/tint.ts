// @layer core
import type { LngLat } from '../types';
import { WALK_CODE } from './bands';
import type { Cell } from './cells';

/*
 * What the Walkability layer draws (specs/walkability-urban-form UF9): the foot and car cells as shapes, with neither and
 * empty cells left out. Cells of one reading side by side in a row are one shape, so no seam shows between them. The map is
 * handed rings and a key, never a number (UF12). Pure.
 */

export interface WalkTint {
  /** Closed rings, [lon, lat]. */
  foot: LngLat[][];
  car: LngLat[][];
  /** Changes only when the picture does, so a map sends its data again only then (walkability audit 13). */
  key: string;
}

const ring = (w: number, s: number, e: number, n: number): LngLat[] => [[w, s], [e, s], [e, n], [w, n], [w, s]];

export function tintOf(cells: readonly Cell[]): WalkTint {
  const foot: LngLat[][] = [];
  const car: LngLat[][] = [];
  let sum = 0;
  const rows = new Map<number, Cell[]>();
  for (const c of cells) {
    if (c.band !== 'foot' && c.band !== 'car') continue;
    const list = rows.get(c.j);
    if (list) list.push(c);
    else rows.set(c.j, [c]);
  }
  for (const [, list] of [...rows].sort((a, b) => a[0] - b[0])) {
    list.sort((a, b) => a.i - b.i);
    let run: Cell[] = [];
    const flush = () => {
      if (!run.length) return;
      const [first, last] = [run[0], run[run.length - 1]];
      (first.band === 'foot' ? foot : car).push(ring(first.west, first.south, last.east, first.north));
      sum = (sum + first.i * 31 + last.i * 17 + first.j * 7 + (first.band === 'foot' ? 1 : 2)) % 1_000_000_007;
      run = [];
    };
    for (const c of list) {
      const prev = run[run.length - 1];
      if (prev && (prev.band !== c.band || prev.i + 1 !== c.i)) flush();
      run.push(c);
    }
    flush();
  }
  return { foot, car, key: `${WALK_CODE}|${foot.length}|${car.length}|${sum}` };
}
