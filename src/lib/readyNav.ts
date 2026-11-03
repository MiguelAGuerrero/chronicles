/**
 * Navigate, ready (NR1-NR4): the rules for reaching and leaving the walk
 * screen when Navigate is the walk screen itself. Pure, so `npm test` covers
 * them; the tabs layout, the Navigate route and the walk screen follow them.
 */

/** The tab beneath the walk screen when nothing else is (a launch, `/`, a bare reload of `/walk`). */
export const BENEATH_TAB = '/explore' as const;

export type ScreenState = 'loading' | 'ready' | 'walking';

/** What the walk screen shows (NR1): ready with no walk open, the walk with one, nothing until the keeper knows. */
export function screenState(open: { known: boolean; walkId: string | null }): ScreenState {
  if (!open.known) return 'loading';
  return open.walkId ? 'walking' : 'ready';
}

/** A press on Navigate's tab (NR1, NR2): the walk screen, ready or open, over whatever tab is in front. */
export function navigatePress(): { preventTab: true; showWalk: true } {
  return { preventTab: true, showWalk: true };
}

/** The Navigate route itself focused (a launch, `/`, a link, NR3): Explore beneath, the walk screen over it. */
export function entryPlan(): { tabs: typeof BENEATH_TAB; thenShowWalk: true } {
  return { tabs: BENEATH_TAB, thenShowWalk: true };
}

/** The chevron, Android Back and the browser's back (NR4): to the tab beneath, Explore when there is none. */
export function exitPlan(canGoBack: boolean): { kind: 'back' } | { kind: 'replace'; to: typeof BENEATH_TAB } {
  return canGoBack ? { kind: 'back' } : { kind: 'replace', to: BENEATH_TAB };
}
