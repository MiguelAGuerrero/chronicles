// @layer core
import type { Complex } from './types';

export interface ShownComplexes { key: string | null; complexes: Complex[]; partial: boolean }

const same = (a: Complex[], b: Complex[]) => a.length === b.length && a.every((c, i) => c.id === b[i].id);

/**
 * What the complexes hook holds after a read of `key` (explore-dense-city DC12, audit 10): the same object when nothing on
 * screen changes, so React renders nothing. A read of the area shown always lands (an empty one clears what it showed);
 * an empty read of another area changes nothing, since any other key already reads as none.
 */
export function nextShown(prev: ShownComplexes, key: string, read: { complexes: Complex[]; partial: boolean }): ShownComplexes {
  if (prev.key === key) {
    if (same(prev.complexes, read.complexes) && prev.partial === read.partial) return prev;
    return { key, complexes: read.complexes, partial: read.partial };
  }
  if (!read.complexes.length && !read.partial) return prev;
  return { key, complexes: read.complexes, partial: read.partial };
}
