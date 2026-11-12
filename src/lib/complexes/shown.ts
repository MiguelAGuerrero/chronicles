// @layer core
import type { Complex } from './types';

export interface ShownComplexes { key: string | null; complexes: Complex[]; partial: boolean }

/**
 * What the complexes hook holds after a read of `key` (explore-dense-city DC12, audit 10): the same object when nothing on
 * screen changes, so React renders nothing. Not built yet.
 */
export function nextShown(_prev: ShownComplexes, _key: string, _read: { complexes: Complex[]; partial: boolean }): ShownComplexes {
  throw new Error('nextShown: not built (explore-dense-city audit 10)');
}
