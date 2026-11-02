import { router } from 'expo-router';

/**
 * Going back to the open walk, the one way every screen does it (tabs audit
 * 1): the recording bar, a waiting reminder, Walk here, Start. A double tap
 * once pushed two walk screens (two live maps). A second ask while one is on
 * its way, or while the walk screen is up, does nothing; the root stack also
 * keeps one walk screen at most (`dangerouslySingular` in `app/_layout.tsx`).
 */
let shown = false;
let pendingUntil = 0;
/** How long an ask waits for the walk screen to mount before another may go. */
const PENDING_MS = 2000;

export function showWalk(params?: Record<string, string>): boolean {
  const now = Date.now();
  if (shown || now < pendingUntil) return false;
  pendingUntil = now + PENDING_MS;
  router.push(params ? { pathname: '/walk', params } : '/walk');
  return true;
}

/** The walk screen is mounted; returns its unmount. */
export function walkScreenShown(): () => void {
  shown = true;
  pendingUntil = 0;
  return () => {
    shown = false;
  };
}
