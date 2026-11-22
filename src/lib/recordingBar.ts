// @layer core
import { formatDistance } from './format';
import { pausedMs, type PauseSpan } from './geo';

/**
 * The time walked as the bar says it (tend tabs 21; the owner, Nov 20: "Minutes on the tabs"): whole minutes, "< 1 min"
 * before the first; past the hour hours:minutes, "1:45" (the owner's own, tend tabs audit 55), short enough that the
 * distance keeps its place at 320 px. The seconds stay on the walk screen.
 */
export function barTime(ms: number): string {
  const min = Math.floor(Math.max(0, ms) / 60_000);
  if (min < 1) return '< 1 min';
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;
}

/**
 * The same time, as the bar's label says it (tend tabs audit 56): the minutes it draws, in words a screen reader reads
 * plainly, "under a minute", "12 min", "1 h 05 min", never a rounding of its own.
 */
export function barTimeSpoken(ms: number): string {
  const min = Math.floor(Math.max(0, ms) / 60_000);
  if (min < 1) return 'under a minute';
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`;
}

/**
 * The recording bar's line (NV9): the time walked, paused time left out, and
 * the distance. Paused, no word is drawn (T59, the owner, Nov 22: "Drop the word"): the pause glyph shows it and the
 * spoken name says "Walk paused". Pure.
 */
export function recordingLine(o: { startedAt: number | null; pauses: PauseSpan[]; now: number; distanceM: number }): {
  text: string;
  /** The line's visible words since T11 (BC6): the time alone; the distance is in `label`. */
  time: string;
  /** The time and the distance, as one string; the bar draws `time` and speaks the distance in `label` (BC6). */
  numbers: string;
  label: string;
  paused: boolean;
} {
  const paused = o.pauses.some((p) => p.ended_at == null);
  const ms = o.startedAt == null ? 0 : Math.max(0, o.now - o.startedAt - pausedMs(o.pauses, o.startedAt, o.now));
  const line = `${barTime(ms)} · ${formatDistance(o.distanceM)}`;
  return {
    text: line,
    time: barTime(ms),
    numbers: line,
    label: `${paused ? 'Walk paused' : 'Walk recording'}, ${formatDistance(o.distanceM)} walked in ${barTimeSpoken(ms)}. Return to the walk`,
    paused,
  };
}

/**
 * Whether the bar's line draws its chevron (BC6): at every width since T58 (the owner, Nov 22, after a cold find could not
 * place the way back at 320 px without it); never while a memo records (the drawing's Memo390); and, paused below 360 px,
 * it gives way to the pause glyph so the time stays whole (the owner, Nov 22, "Chevron gives way (Recommended)",
 * the drawing's Paused320).
 */
export function barChevron(width: number, memo: boolean, paused = false): boolean {
  return !memo && !(paused && width < 360);
}

/**
 * The line's gaps (tend tabs audit 63), as the drawings have them: below 360 px with the chevron and no dot, 4 between
 * its parts and 6 on the right (Proposed320B); paused there, the glyph and no chevron, 8 and 10 (Paused320); from
 * 360 px, and mid-memo at any width, 10 and 10.
 */
export function barLineGaps(width: number, memo: boolean, paused: boolean): { gap: number; right: number } {
  if (memo || width >= 360) return { gap: 10, right: 10 };
  return paused ? { gap: 8, right: 10 } : { gap: 4, right: 6 };
}

/**
 * Whether the line draws its red recording dot (T58): from 360 px wide; at 320 px it gives way to the chevron (the
 * drawing's Proposed320B). Paused, the pause glyph shows at every width in its place.
 */
export function barDot(width: number): boolean {
  return width >= 360;
}

/**
 * The line while the bar records a memo (BC2, BC6): its time as m:ss, and a spoken name that says it records, whether
 * the walk is paused, and what a tap does (the line saves it, then returns to the walk; BC3).
 */
export function memoLine(o: { startedAt: number; now: number; paused: boolean }): { time: string; label: string } {
  const s = Math.floor(Math.max(0, o.now - o.startedAt) / 1000);
  const time = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  return { time, label: `Recording voice memo, ${time}${o.paused ? ', walk paused' : ''}. Saves it and returns to the walk` };
}

/**
 * Whether a memo the bar records is saved now (BC3): when the bar's captures leave sight. Another tab (`moved`), a place
 * where the bar holds no captures (Memories, however the memo began there; recording-bar-captures audit 3), or a
 * full-screen card or sheet that folds the bar away (Plan an outing, the area card; audit 1). A change of Chronicle's
 * section with the bar in sight is none of these: the memo goes on (audit 2).
 */
export function barMemoSaves(o: { memoOn: boolean; moved: boolean; captures: boolean; covered: boolean }): boolean {
  return o.memoOn && (o.moved || !o.captures || o.covered);
}

/** The bar's mic and pencil (and camera) are off while a capture is kept and while its Stop runs (audit 4). */
export function barCapturesOff(o: { capturing: boolean; stopping: boolean }): boolean {
  return o.capturing || o.stopping;
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

/**
 * How long `walkId`'s stop from the bar still holds at `now`, 0 when none does: the bar's spinning Stop ends with it, as the
 * way back's refusal does (tend tabs 19).
 */
export const barStopLeftMs = (stop: BarStop | null, walkId: string, now: number): number =>
  stop && stop.walkId === walkId ? Math.max(0, BAR_STOP_HOLD_MS - (now - stop.since)) : 0;

/** Whether `walkId` is being stopped from the bar at `now`, within the stop's own bound. */
export const barStopping = (stop: BarStop | null, walkId: string, now: number): boolean => barStopLeftMs(stop, walkId, now) > 0;

/**
 * Whether the bar's way back (its line, a tapped reminder) opens the walk screen: one at a time, and never while the
 * walk is stopping from the bar, before the way back's wait for a photo or after it, since the stop's replay would land
 * over the walk screen it opened (NV27; tend tabs 12).
 */
export const barGoesBack = (o: { returning: boolean; stop: BarStop | null; walkId: string; now: number }): boolean =>
  !o.returning && !barStopping(o.stop, o.walkId, o.now);
