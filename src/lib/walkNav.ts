// @layer shell
import { router } from 'expo-router';
import { createWalkGate } from './walkGate';

/**
 * Going back to the open walk, the one way every screen does it (tabs audit
 * 1): the recording bar, a tapped reminder, Walk here, Start. A second ask
 * while one is on its way, or while the walk screen is up, does nothing
 * (`walkGate`); the root stack also keeps one walk screen at most
 * (`dangerouslySingular` in `app/_layout.tsx`).
 */
const gate = createWalkGate(2000);

export function showWalk(params?: Record<string, string>, opts?: { launch?: boolean }): boolean {
  if (!gate.ask(Date.now(), opts)) return false;
  router.push(params ? { pathname: '/walk', params } : '/walk');
  return true;
}

/** The walk screen is mounted; returns its unmount. */
export const walkScreenShown = (): (() => void) => gate.shown();
