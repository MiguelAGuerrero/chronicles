// @layer core
/**
 * Navigate, ready (NR1-NR4): the rules for reaching and leaving the walk
 * screen when Navigate is the walk screen itself. Pure, so `npm test` covers
 * them; the tabs layout, the Navigate route and the walk screen follow them.
 */
import { formatDistance, formatElapsed } from './format';
import type { Units } from './units';

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

/**
 * The walk route's error line (decision 0172, O35; tend walk-screen audit 5), from the keeper's open walk and pauses: a
 * walk recording is "still recording" (the owner's words); a paused one is saved, as every other screen says; with no
 * walk open (Navigate, ready) or before storage is read, no walk line.
 */
export function walkErrorLine(open: { known: boolean; walk: { id: string } | null; pauses: readonly { ended_at: number | null }[] }): string | null {
  if (!open.known || !open.walk) return null;
  return open.pauses.some((p) => p.ended_at == null) ? 'Your walk is saved.' : 'Your walk is still recording.';
}

/**
 * A replay's error line (tend tabs audit 58; the owner, Nov 20: "Nothing while one records"): the replay is of a walk that
 * is kept, so "Your walk is saved.", but not while another walk records, where "saved" beside no recording bar could read
 * as that walk ended: then no line. Not read yet, nothing is claimed.
 */
export function replayErrorLine(open: { known: boolean; walk: { id: string } | null; pauses: readonly { ended_at: number | null }[] }): string | null {
  if (!open.known) return null;
  if (open.walk && !open.pauses.some((p) => p.ended_at == null)) return null;
  return 'Your walk is saved.';
}

/** The walk's strip as it is drawn: the time walked and the distance, "1:31 · 127 m" (WalkStats' first line). */
export function walkStripText(o: { elapsedMs: number; distanceM: number; units: Units }): string {
  return `${formatElapsed(o.elapsedMs)} · ${formatDistance(o.distanceM, o.units)}`;
}

/**
 * The strip's numbers as drawn: below 360 px a time in hours ("20 h 01 min", a walk left running) puts the distance on a
 * second line, so Resume's and Stop's words stay whole (forgotten-stop QE10, audit 1); its first line is still the time.
 */
export function walkStripLines(o: { elapsedMs: number; distanceM: number; units: Units; narrow: boolean }): string {
  const text = walkStripText(o);
  return o.narrow && / h \d/.test(text) ? text.replace(' · ', '\n') : text;
}

/**
 * What a screen reader hears for the walk's strip of numbers, its one button: what the strip draws, word for word, as the
 * ready bar's twin is named "0:00 · 0 m" (navigate-ready audit 6; tend walk-screen 12, audit 12), the ride's line after it
 * (R6). " Walk settings" follows. (It said ", exploring" on an exploring walk until the mode went, decision 0234.)
 */
export function walkSummaryLabel(o: { elapsedMs: number; distanceM: number; rideM: number; units: Units }): string {
  const ride = o.rideM >= 1 ? `, + ${formatDistance(o.rideM, o.units)} ride` : '';
  return `${walkStripText(o)}${ride}`;
}
