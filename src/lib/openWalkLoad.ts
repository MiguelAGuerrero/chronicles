/**
 * Reads the open walk again whenever it changes (tabs audit 9). The latest
 * call wins: an older read that answers after a newer one began is dropped,
 * so a slow read from before a stop can't bring the walk back. A failed read
 * settles nothing (it never reads as "no walk open") and is tried again after
 * `retryMs`. Pure: the read, the apply and the timer are given.
 */
export function createLatestLoader<T>(opts: {
  read: () => Promise<T>;
  apply: (v: T) => void;
  retryMs: number;
  schedule?: (fn: () => void, ms: number) => () => void;
}) {
  const schedule =
    opts.schedule ??
    ((fn: () => void, ms: number) => {
      const t = setTimeout(fn, ms);
      return () => clearTimeout(t);
    });
  let seq = 0;
  let stopped = false;
  let cancelRetry: (() => void) | null = null;
  const load = async (): Promise<void> => {
    if (stopped) return;
    const mine = ++seq;
    cancelRetry?.();
    cancelRetry = null;
    let v: T;
    try {
      v = await opts.read();
    } catch {
      if (stopped || mine !== seq) return;
      cancelRetry = schedule(() => {
        cancelRetry = null;
        void load();
      }, opts.retryMs);
      return;
    }
    if (stopped || mine !== seq) return;
    opts.apply(v);
  };
  return {
    load,
    stop() {
      stopped = true;
      cancelRetry?.();
      cancelRetry = null;
    },
  };
}
