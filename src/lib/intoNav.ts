// @layer shell
import { router } from 'expo-router';

/**
 * What I'm into's page (specs/what-im-into-page WI1, WI3; decision 0192): both entry rows open it the one way. The walk
 * screen's blur asks `tookDetour()`, so the Add to this moment pill stays open while the page is up on a walk (the
 * owner, Nov 18: the page is a detour inside the walk, not leaving it).
 */
const state = { detour: false };

export function openInto(): void {
  state.detour = true;
  router.push('/into');
}

/** Whether the screen is being left for the page; asked once, on that blur. */
export function tookDetour(): boolean {
  const was = state.detour;
  state.detour = false;
  return was;
}
