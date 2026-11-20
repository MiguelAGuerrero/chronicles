// @layer core
import { formatDistance, formatDuration, formatElapsed } from './format';
import { pausedMs, type PauseSpan } from './geo';

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
