// @layer core
/**
 * Navigate, ready (NR1-NR4): the rules for reaching and leaving the walk
 * screen when Navigate is the walk screen itself. Pure, so `npm test` covers
 * them; the tabs layout, the Navigate route and the walk screen follow them.
 */

/** The tab beneath the walk screen when nothing else is (Chronicle, at `/` since HC1, decision 0112; a bare reload of `/walk`). */
export const BENEATH_TAB = '/' as const;

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

/** The Navigate route itself focused (a reload of `/navigate`, a link): Chronicle beneath, the walk screen over it. */
export function entryPlan(): { tabs: typeof BENEATH_TAB; thenShowWalk: true } {
  return { tabs: BENEATH_TAB, thenShowWalk: true };
}

/**
 * What the walk says as Start records in place (NR6, audit 9): that it is recording. A recorder warning
 * wins, as it does on every start (NV25). The web's "keep this page open" is no longer said per walk:
 * the ready screen says it once, on first launch (the owner, Nov 4).
 */
export function startNotice(params: Record<string, string>): string {
  return params.warning ? params.warning : 'Walk started · recording';
}

/**
 * What a walk says when it reaches a walk screen already up (capture-from-chronicle audit 1): Walk here
 * or Start can show the screen before the keeper has read the new walk, so the notice follows the walk's
 * arrival, not the screen's mount. A recorder warning wins (NV25); nothing to say, null.
 */
export function arrivalNotice(params: { warning?: string; started?: string }): string | null {
  if (params.warning) return params.warning;
  return params.started ? 'Walk started · recording' : null;
}

/** The chevron, Android Back and the browser's back (NR4): to the tab beneath, Chronicle when there is none (HC4). */
export function exitPlan(canGoBack: boolean): { kind: 'back' } | { kind: 'replace'; to: typeof BENEATH_TAB } {
  return canGoBack ? { kind: 'back' } : { kind: 'replace', to: BENEATH_TAB };
}
