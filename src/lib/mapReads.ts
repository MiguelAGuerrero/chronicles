/**
 * The map's camera serves one read at a time: a scan and a route's street
 * read each step it through views (`collect`), and two interleaved would each
 * query the other's view, then restore a stale camera.
 */
export function mapReadLock() {
  let held = false;
  return {
    busy: () => held,
    /** Runs `fn` if no read is running, else returns null at once. */
    async run<T>(fn: () => Promise<T>): Promise<T | null> {
      if (held) return null;
      held = true;
      try {
        return await fn();
      } finally {
        held = false;
      }
    },
  };
}

/** The one lock the walk screen's map reads share (scan, navigation). */
export const mapReads = mapReadLock();
