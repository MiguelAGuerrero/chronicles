// @layer shell
import { router } from 'expo-router';
import { createIntoNav } from './intoGate';

/**
 * What I'm into's page (specs/what-im-into-page WI1, WI3; decision 0192): both entry rows open it the one way, gated
 * (audit 3: a double tap pushed it twice). The walk screen's blur asks `tookDetour()`, so the Add to this moment pill
 * stays open while the page is up on a walk (the owner, Nov 18: the page is a detour inside the walk, not leaving it).
 */
const nav = createIntoNav({ push: (href) => router.push(href), now: () => Date.now() });

/** `from: 'walk'` when opened from the walk's drawer during a walk: its Back then names the walk (WI20). */
export function openInto(from: 'walk' | 'ready' = 'ready'): void {
  nav.open(from);
}

/** Whether the screen is being left for the page; asked once, on that blur. */
export const tookDetour = (): boolean => nav.tookDetour();

/** The page is up: no second push until it goes. Returns its unmount. */
export const intoShown = (): (() => void) => nav.shown();
