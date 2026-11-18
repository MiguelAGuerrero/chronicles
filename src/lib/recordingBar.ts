// @layer core
import { formatDistance, formatDuration, formatElapsed } from './format';
import { pausedMs, type PauseSpan } from './geo';
import { offerText } from './editOffer';

/**
 * The recording bar's line (NV9): the time walked, paused time left out, and
 * the distance, with Paused after them while paused. Pure.
 */
export function recordingLine(o: { startedAt: number | null; pauses: PauseSpan[]; now: number; distanceM: number }): {
  text: string;
  label: string;
  paused: boolean;
} {
  const paused = o.pauses.some((p) => p.ended_at == null);
  const ms = o.startedAt == null ? 0 : Math.max(0, o.now - o.startedAt - pausedMs(o.pauses, o.startedAt, o.now));
  const line = `${formatElapsed(ms)} · ${formatDistance(o.distanceM)}`;
  return {
    // The numbers first, so a narrow bar cuts the word (the pause glyph shows it too), never the time (tend tabs audit 17).
    text: paused ? `${line} · Paused` : line,
    label: `${paused ? 'Walk paused' : 'Walk recording'}, ${formatDistance(o.distanceM)} walked in ${formatDuration(ms)}. Return to the walk`,
    paused,
  };
}

/** The longest the bar's way back waits for its photo, and its Stop for a memo, then for the captures being kept. */
export const BAR_WAIT_MS = 5000;

/**
 * The longest a stop from the bar holds the way back and a second Stop: its two waits and a margin for the walk's end.
 * A stop that hangs past it (a wedged store, a recorder that never stops) lets them go, so the › is never dead until a
 * reopen (tend tabs audit 28).
 */
export const BAR_STOP_HOLD_MS = 2 * BAR_WAIT_MS + 2000;

/**
 * A stop from the bar under way: its walk and when it began. Kept outside the bar, which unmounts as its tab loses
 * focus while the stop goes on (tend tabs audit 26).
 */
export interface BarStop {
  walkId: string;
  since: number;
}

/** Whether `walkId` is being stopped from the bar at `now`, within the stop's own bound. */
export const barStopping = (stop: BarStop | null, walkId: string, now: number): boolean =>
  !!stop && stop.walkId === walkId && now - stop.since < BAR_STOP_HOLD_MS;

/**
 * Whether the bar's way back (its line, a tapped reminder) opens the walk screen: one at a time, and never while the
 * walk is stopping from the bar, before the way back's wait for a photo or after it, since the stop's replay would land
 * over the walk screen it opened (NV27; tend tabs 12).
 */
export const barGoesBack = (o: { returning: boolean; stop: BarStop | null; walkId: string; now: number }): boolean =>
  !o.returning && !barStopping(o.stop, o.walkId, o.now);

/**
 * The bar's Edit offer after its photo (T12, decision 0149; amends ME23 on the bar alone): a pill above the bar that
 * waits, as Undo does (decision 0113). It has no end of its own: Edit, its Close or the next capture ends it, and the
 * line keeps its time and distance throughout. ME23's other places keep their six seconds (`lib/editOffer`).
 */
export interface BarOffer {
  id: string;
  kind: 'photo' | 'video';
}

export const barOffer = (kept: { id: string; kind: 'photo' | 'video' }): BarOffer => ({ id: kept.id, kind: kept.kind });

/**
 * The next capture ends the offer: one kept by any path of the walk (Memories' band too), or `null`, one from the bar
 * that failed to save (tend tabs audit 18). News of its own photo, should it come after the offer, leaves it standing.
 */
export const barOfferAfter = (o: BarOffer | null, keptId: string | null): BarOffer | null => (o && o.id !== keptId ? null : o);

/**
 * Shown while its capture is still the walk's and not deleted elsewhere, its Undo waiting or not (tend tabs audit 15),
 * and not while the walk is stopping from the bar, since the stop would close an editor opened meanwhile (audit 19).
 */
export const barOfferShown = (o: BarOffer | null, captureIds: readonly string[], hidden: ReadonlySet<string>, stopping = false): boolean =>
  !!o && !stopping && captureIds.includes(o.id) && !hidden.has(o.id);

/** A delete of its photo ends the offer, so a committed delete never brings it back (tend tabs audit 15). */
export const barOfferAfterHidden = (o: BarOffer | null, hidden: ReadonlySet<string>): BarOffer | null => (o && hidden.has(o.id) ? null : o);

/** The pill's words, its announcement (as Undo's names its Undo) and its Close's spoken name. */
export const barOfferWords = (kind: 'photo' | 'video'): { text: string; spoken: string; close: string } => {
  const text = offerText(kind, 'walk');
  return { text, spoken: `${text}. Edit is available.`, close: `Close, the ${kind} stays as it is` };
};
