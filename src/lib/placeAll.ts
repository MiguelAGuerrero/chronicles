// @layer shell
/**
 * Placing walks in their areas one pass at a time (v0.5 places, criterion 25),
 * and a time limit on a promise. A shell: it keeps the pass under way and sets
 * timers. The placing rules themselves are in `places.ts` (core).
 */

/** Rejects if the promise has not settled in `ms`, naming what it waited for. */
export function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${what} did not answer in ${Math.round(ms / 1000)} s`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

let running: Promise<{ placed: string[]; failed: string[] }> | null = null;

/**
 * Places walks one after another (criterion 25): one pass at a time, and a
 * second call while one runs joins it. A walk that fails is left for the
 * next pass; stopping midway (`stopped`) keeps what was already placed.
 */
export function placeAll(
  ids: string[],
  placeOne: (id: string) => Promise<void>,
  onProgress?: (done: number) => void,
  stopped?: () => boolean,
  /** Called as each walk's placing begins; a walk never begun is not tried. */
  onAttempt?: (id: string) => void,
): Promise<{ placed: string[]; failed: string[] }> {
  if (running) return running;
  const pass = (async () => {
    const placed: string[] = [];
    const failed: string[] = [];
    for (let i = 0; i < ids.length; i++) {
      onAttempt?.(ids[i]);
      try {
        await placeOne(ids[i]);
        placed.push(ids[i]);
      } catch {
        failed.push(ids[i]);
      }
      onProgress?.(i + 1);
      if (stopped?.()) break;
    }
    return { placed, failed };
  })();
  running = pass;
  pass.finally(() => {
    if (running === pass) running = null;
  }).catch(() => {});
  return pass;
}
