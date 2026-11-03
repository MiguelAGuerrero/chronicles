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
  return {
    /** True when this ask should navigate; it then counts as on its way. */
    ask(now: number): boolean {
      if (shown || now < pendingUntil) return false;
      pendingUntil = now + pendingMs;
      return true;
    },
    /** The walk screen mounted; returns its unmount. */
    shown(): () => void {
      shown = true;
      pendingUntil = 0;
      return () => {
        shown = false;
      };
    },
  };
}
