// @layer shell
import type { WalkSource } from './types';

/*
 * WK1b: Overture first, the fallback when it can't answer (null, a throw, or too slow). Both failing is `null`,
 * never a throw (WK3). A hung primary is given PRIMARY_MS and then told to stop (an abort), so the fallback runs
 * inside the same request and nothing is left running beside the next tile (walkability audit 12).
 */

/** Overture's share of one tile's request; the rest is Overpass's. */
export const PRIMARY_MS = 6_000;

export function chain(primary: WalkSource, fallback: WalkSource, o: { primaryMs?: number } = {}): WalkSource {
  const primaryMs = o.primaryMs ?? PRIMARY_MS;
  const first = async (x: number, y: number, outer?: AbortSignal) => {
    const ctl = new AbortController();
    const stop = () => ctl.abort();
    outer?.addEventListener('abort', stop);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        primary.read(x, y, ctl.signal),
        new Promise<null>((resolve) => {
          timer = setTimeout(() => {
            ctl.abort();
            resolve(null);
          }, primaryMs);
        }),
      ]);
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
      outer?.removeEventListener('abort', stop);
    }
  };
  const second = async (x: number, y: number, signal?: AbortSignal) => {
    try {
      return await fallback.read(x, y, signal);
    } catch {
      return null;
    }
  };
  return {
    async read(x, y, signal) {
      return (await first(x, y, signal)) ?? (await second(x, y, signal));
    },
  };
}
