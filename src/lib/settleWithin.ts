/**
 * Waits for `p` to settle (resolved or failed), but never longer than `ms`. Pure. For a wait
 * that must not hold something else for ever: the recording bar's return waits on its photo
 * being kept, and a save that never settled once left its › dead (the owner's iPhone, Nov 2).
 */
export function settleWithin(p: Promise<unknown> | null | undefined, ms: number): Promise<'settled' | 'timeout'> {
  if (!p) return Promise.resolve('settled');
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve('timeout'), ms);
    p.then(
      () => {
        clearTimeout(t);
        resolve('settled');
      },
      () => {
        clearTimeout(t);
        resolve('settled');
      },
    );
  });
}
