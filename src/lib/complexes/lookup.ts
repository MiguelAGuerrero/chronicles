// @layer shell
import type { LngLat } from '../types';
import type { Complex, ComplexStore } from './types';

/** A cell of this many degrees (about a kilometre) is asked of the store once; a fix is at most half of it from the cell's middle. */
const CELL_DEG = 0.01;
/** The box asked around a cell's middle: half a cell, and room for a complex's own size and the street reach beyond it. */
const SPAN_DEG = CELL_DEG / 2 + 0.003;

/**
 * One store read for many moments in the same place (complexes audit 10): a batch of arrival lines asks it for each fix. Made
 * for one batch, so a complex read meanwhile is seen by the next.
 */
export function createComplexLookup(store: Pick<ComplexStore, 'complexesNear'>): (fix: LngLat) => Promise<readonly Complex[]> {
  const cells = new Map<string, Promise<readonly Complex[]>>();
  return (fix) => {
    const cx = Math.floor(fix[0] / CELL_DEG);
    const cy = Math.floor(fix[1] / CELL_DEG);
    const k = `${cx},${cy}`;
    let p = cells.get(k);
    if (!p) cells.set(k, (p = store.complexesNear([(cx + 0.5) * CELL_DEG, (cy + 0.5) * CELL_DEG], SPAN_DEG)));
    return p;
  };
}
