// @layer core
/**
 * Whether an ask to show the walk screen goes ahead (tabs audit 1): not while
 * the walk screen is up, nor while an earlier ask is still on its way (for
 * `pendingMs`, or until the screen mounts). A double tap once pushed two walk
 * screens, two live maps. Pure: the clock is given.
 */
export function createWalkGate(pendingMs: number) {
  let shown = false;
  let pendingUntil = 0;
  let launchUntil = 0;
  return {
    /**
     * True when this ask should navigate; it then counts as on its way. A launch's own ask (the entry
     * route, the root layout) goes ahead past a pending one, never past a walk screen up: a tap on a
     * notification can ask before the router is ready, and that push is lost (navigate-ready, NR3).
     */
    ask(now: number, opts?: { launch?: boolean }): boolean {
      if (shown || (!opts?.launch && now < pendingUntil) || (opts?.launch && now < launchUntil)) return false;
      pendingUntil = now + pendingMs;
      if (opts?.launch) launchUntil = now + pendingMs;
      return true;
    },
    /** The walk screen mounted; returns its unmount. */
    shown(): () => void {
      shown = true;
      pendingUntil = 0;
      launchUntil = 0;
      return () => {
        shown = false;
      };
    },
  };
}
