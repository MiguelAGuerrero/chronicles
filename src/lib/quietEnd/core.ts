// @layer core
import { dayKey, dayLabel } from '../days';
import { distanceM, isBreak, type PauseSpan } from '../geo';
import { clockOf } from '../moment';
import type { ReadTrace } from '../rides';
import type { TracePoint } from '../types';

/**
 * A walk left running (specs/forgotten-stop, decision 0272): where it went quiet, and the words that offer to end it
 * there. The point is found, never acted on: only the walker's tap at a held Stop, or in the walk's More (⋯), moves a
 * walk's end (QE9).
 */

/** The quiet after the last activity before a Stop asks: the longest break the app fills as a gap (0071, 0272). */
export const QUIET_MS = 30 * 60_000;
/** A gap longer than this between two fixes breaks a run, as the trace's own reading breaks it (`RIDE_RULES.gapMs`). */
const RUN_GAP_MS = 60_000;
/** A spot's reach: the walker is still there within this many metres (`holdStill`'s 50 m: indoor drift wanders 40 m)... */
const SPOT_REACH_M = 50;
/** ...or three times the spot's own accuracy, whichever is wider. */
const SPOT_ACCURACY_TIMES = 3;
/** This many fixes in a row beyond the reach are walking; a lone far fix is a jump (as `holdStill` reads a leave). */
const LEAVE_FIXES = 3;
/** The spot is the middle of the run's last fixes. */
const SPOT_FIXES = 5;
/**
 * Walking on is net travel away from the spot: three fixes in a row beyond twice its reach (100 m at least). Indoor drift
 * creeps or sways 40-60 m from where the phone lies and never goes that far (forgotten-stop audit 4).
 */
const LEAVE_TIMES = 2;
/** The walk stopped at the first fix near the spot after which the next minute moves it this little (m). */
const STILL_NET_M = 20;
/** The minute a stop is judged over, as the trace's own break (`RIDE_RULES.gapMs`). */
const STILL_SPAN_MS = 60_000;

export interface QuietInput {
  /** The walk read as every trace is (`readTrace`, with its start, pauses, stills and kept gaps). */
  tr: Pick<ReadTrace, 'walked' | 'rides' | 'breaks'>;
  /** Every capture's own time (a moment's pieces each count). */
  captures: readonly number[];
  /** The walk's pauses: a closed one's end is a Resume, unless it closed at the walk's end (a Stop while paused). */
  pauses: readonly PauseSpan[];
}

/** Each run of walked fixes between breaks: a pause, a ride, or a gap over a minute. */
function runsOf(walked: readonly TracePoint[], breaks: PauseSpan[]): TracePoint[][] {
  const runs: TracePoint[][] = [];
  let cur: TracePoint[] = [];
  for (const p of walked) {
    const prev = cur[cur.length - 1];
    if (prev && isBreak(prev, p, breaks, RUN_GAP_MS)) {
      runs.push(cur);
      cur = [];
    }
    cur.push(p);
  }
  if (cur.length) runs.push(cur);
  return runs;
}

const median = (xs: number[]) => {
  const s = xs.slice().sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
const pos = (p: TracePoint): [number, number] => [p.lon, p.lat];

/** A run's spot and reach: the middle of its last fixes, and 50 m or three times their accuracy. */
function spotOf(run: readonly TracePoint[]): { spot: [number, number]; reach: number } {
  const tail = run.slice(-SPOT_FIXES);
  const acc = median(tail.map((p) => p.accuracy_m ?? 0));
  return { spot: [median(tail.map((p) => p.lon)), median(tail.map((p) => p.lat))], reach: Math.max(SPOT_REACH_M, acc * SPOT_ACCURACY_TIMES) };
}

/**
 * When the run arrived at the spot it ends on: after its last net travel away (three fixes in a row beyond twice the
 * spot's reach), the first fix within that distance after which the next minute moves the walker less than 20 m: the
 * stop itself, not the edge of the reach. A run that never travels from its own spot (the standing fixes after a web
 * page's long break, a phone's day at one spot, hours of indoor drift) has no walking on: null.
 */
function arrivalOf(run: readonly TracePoint[]): number | null {
  const { spot, reach } = spotOf(run);
  const leave = reach * LEAVE_TIMES;
  let far = 0;
  for (let i = run.length - 1; i >= 0; i--) {
    if (distanceM(spot, pos(run[i])) > leave) {
      far++;
      if (far >= LEAVE_FIXES) {
        for (let k = i + LEAVE_FIXES; k < run.length; k++) {
          if (distanceM(spot, pos(run[k])) > leave) continue;
          let still = true;
          for (let j = k + 1; j < run.length && run[j].t - run[k].t <= STILL_SPAN_MS && still; j++) still = distanceM(pos(run[k]), pos(run[j])) <= STILL_NET_M;
          if (still) return run[k].t;
        }
        return run[i + LEAVE_FIXES]?.t ?? null;
      }
    } else far = 0;
  }
  return null;
}

/**
 * A walk's quiet point (QE1, QE2): the latest of its last walking on (the read trace travelling from its spot, then
 * arriving where it stayed, or a break of 30 min or less, the longest the app fills (0071), whose two ends lie beyond the
 * reach: walked with the GPS off, as a locked page walking home), the end of its last ride, its last capture and its last
 * Resume (a pause closed at `end`, by a Stop while paused, is none). A sit mid-walk followed by any of them is never the
 * point. Null when the walk holds none of them.
 */
export function quietPoint(i: QuietInput, end: number = Infinity): number | null {
  const times: number[] = [];
  const runs = runsOf(i.tr.walked, i.tr.breaks);
  for (let r = runs.length - 1; r >= 0; r--) {
    const arrived = arrivalOf(runs[r]);
    if (arrived != null) {
      times.push(arrived);
      break;
    }
    const prev = runs[r - 1];
    if (prev) {
      const a = prev[prev.length - 1];
      const b = runs[r][0];
      if (b.t - a.t <= QUIET_MS && distanceM(pos(a), pos(b)) > spotOf(runs[r]).reach * LEAVE_TIMES) {
        times.push(b.t);
        break;
      }
    }
  }
  for (const ride of i.tr.rides) times.push(ride.t1);
  times.push(...i.captures);
  for (const p of i.pauses) if (p.ended_at != null && p.ended_at < end) times.push(p.ended_at);
  return times.length ? Math.max(...times) : null;
}

/** The quiet point, when the walk has been quiet 30 min or more at `end` (a Stop's hold, or a kept walk's own end). */
export function quietEndAt(i: QuietInput, end: number): number | null {
  const point = quietPoint(i, end);
  return point != null && end - point >= QUIET_MS ? point : null;
}

/**
 * Readings within a minute after a walk's end are its own: a Stop writes the end before the recorder stops, and a phone's
 * clock can run a few seconds ahead (forgotten-stop audit 9). The trace's own break: what comes later is not walked.
 */
export const END_GRACE_MS = 60_000;

/** The fixes of a walk up to its end and the minute after it; all of them while it has none (QE5). */
export function untilEnd<T extends { t: number }>(points: T[], endedAt: number | null | undefined): T[] {
  return endedAt == null ? points : points.filter((p) => p.t <= endedAt + END_GRACE_MS);
}

/** "at 8:35 pm", "at 8:35 pm yesterday", "at 8:35 pm on Thu, Nov 26" (QE9, steward 5): a time of day, never hours. */
function when(at: number, now: number): string {
  const day = dayLabel(dayKey(at), now);
  const clock = `at ${clockOf(at)}`;
  if (day === 'Today') return clock;
  if (day === 'Yesterday') return `${clock} yesterday`;
  return `${clock} on ${day}`;
}

/** The ask's one line, as drawn (QE3, QE4, QE7). */
export function quietLine(at: number, now: number): string {
  return `This walk went quiet ${when(at, now)}.`;
}

/** The one filled button (QE3). */
export function endItLabel(at: number): string {
  return `End it at ${clockOf(at)}`;
}

/** The ask's other button at a Stop: today's Stop exactly (QE6). */
export const KEEP_IT_ALL = 'Keep it all';

/** The More (⋯) row of a kept walk with a quiet end (QE7). */
export const QUIET_ROW = 'End it where it went quiet';

/** The row's hint (QE7, steward 3): when, and what changes, with no unit of time. */
export function quietRowHint(at: number, now: number): string {
  const w = when(at, now);
  return `${w[0].toUpperCase()}${w.slice(1)}; what came after it leaves the walk`;
}
