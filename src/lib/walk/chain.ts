// @layer core
import type { WalkSource } from './types';

/**
 * WK1b: Overture first, the fallback when it can't answer (null, or it throws). Both failing is `null`,
 * never a throw (WK3). Only calls what it is given.
 */
export function chain(primary: WalkSource, fallback: WalkSource): WalkSource {
  const safe = async (s: WalkSource, x: number, y: number) => {
    try {
      return await s.read(x, y);
    } catch {
      return null;
    }
  };
  return {
    async read(x, y) {
      return (await safe(primary, x, y)) ?? (await safe(fallback, x, y));
    },
  };
}
