import { distanceM, isBreak, type PauseSpan } from './geo';
import type { Capture, LngLat, TracePoint } from './types';

/**
 * Timing for the end-of-session ceremony: five beats, always in the same
 * order. The path itself runs in a fixed PATH_MS whatever the walk's length.
 * At each capture the path stops and waits for the viewer: photos stay up,
 * voice memos play to the end, until a tap moves on (the owner's call, over
 * the concept doc's fixed forty seconds). Skip still jumps to the card.
 *
 * The path runs in "active time": stretches with no fixes longer than
 * GAP_MS (the app was closed, the tab hidden, a long stop indoors) are
 * collapsed to a short hop, so the walk never crawls across a gap. A pause
 * is a hop too, however short: the dot never glides across a paused stretch.
 */

export const FOG_MS = 4000;
/** How long the path takes to run, not counting the stops at captures. */
export const PATH_MS = 30_000;
const GROUP_M = 40;
const GROUP_GAP_MS = 120_000;
export const GAP_MS = 60_000;
/** Active time a collapsed gap still takes, so the cut reads as a cut. */
const HOP_MS = 5000;

export interface PauseGroup {
  /** Walk time at which the path stops for this group. */
  t: number;
  at: LngLat | null;
  /** Shown one after another, each until the viewer moves on. */
  captures: Capture[];
}

export interface Schedule {
  /** Active-time span of the path. */
  start: number;
  end: number;
  /** Replay time the path takes to run; 0 when there is no trace to draw. */
  movingMs: number;
  /** Each group, with the replay time (into the path) at which it stops the path. */
  groups: (PauseGroup & { activeT: number; atMs: number })[];
  /** Converts walk time to active time. */
  toActive(t: number): number;
  /** Converts active time back to walk time. */
  toWalk(a: number): number;
}

/** Captures taken close together, in space and time, share one stop. */
export function groupCaptures(captures: Capture[]): PauseGroup[] {
  const groups: PauseGroup[] = [];
  for (const c of [...captures].sort((a, b) => a.t - b.t)) {
    const pos: LngLat | null = c.lat != null && c.lon != null ? [c.lon, c.lat] : null;
    const g = groups[groups.length - 1];
    const near = g && c.t - g.t <= GROUP_GAP_MS && (!g.at || !pos || distanceM(g.at, pos) <= GROUP_M);
    if (near) {
      g.captures.push(c);
      // A group begun by a placeless capture takes its place from the first placed one, so a far one can't join it (audit).
      if (!g.at && pos) g.at = pos;
    } else groups.push({ t: c.t, at: pos, captures: [c] });
  }
  return groups;
}

/**
 * Active-time mapping: each gap longer than GAP_MS between fixes (t0 to t1)
 * keeps its first HOP_MS and loses the rest.
 */
function activeClock(fixes: TracePoint[], pauses: PauseSpan[]) {
  const gaps: { t0: number; t1: number }[] = [];
  for (let i = 1; i < fixes.length; i++) {
    if (isBreak(fixes[i - 1], fixes[i], pauses, GAP_MS)) gaps.push({ t0: fixes[i - 1].t, t1: fixes[i].t });
  }
  const toActive = (t: number) => {
    let removed = 0;
    for (const g of gaps) {
      if (t >= g.t1) removed += g.t1 - g.t0 - HOP_MS;
      else {
        if (t > g.t0) removed += Math.max(0, t - g.t0 - HOP_MS);
        break;
      }
    }
    return t - removed;
  };
  const toWalk = (a: number) => {
    let removed = 0;
    for (const g of gaps) {
      // In active time, this gap is just its hop.
      if (a < g.t0 - removed + HOP_MS) break;
      removed += g.t1 - g.t0 - HOP_MS;
    }
    return a + removed;
  };
  return { toActive, toWalk };
}

export function schedule(fixes: TracePoint[], captures: Capture[], startedAt: number, pauses: PauseSpan[] = []): Schedule {
  const { toActive, toWalk } = activeClock(fixes, pauses);
  const startT = fixes[0]?.t ?? startedAt;
  // The path spans the trace. A capture before the first fix or after the last
  // (GPS lost indoors, say) stops the path at that end, rather than leaving
  // the walker standing still while the clock runs on to it.
  const endT = Math.max(fixes.at(-1)?.t ?? startT, startT + 1);
  const start = toActive(startT);
  const end = toActive(endT);
  // Nothing to draw: no point running an empty path; captures still get their stop.
  const movingMs = fixes.length < 2 ? 0 : PATH_MS;
  const span = end - start;
  const groups = groupCaptures(captures).map((g) => {
    const activeT = Math.min(Math.max(toActive(g.t), start), end);
    return { ...g, activeT, atMs: span > 0 ? ((activeT - start) / span) * movingMs : 0 };
  });
  return { start, end, movingMs, groups, toActive, toWalk };
}

/** Walk time at `ms` into the path (time spent stopped at captures not counted). */
export function walkTimeAt(s: Schedule, ms: number): number {
  if (s.movingMs <= 0) return s.toWalk(s.end);
  const f = Math.min(1, Math.max(0, ms / s.movingMs));
  return s.toWalk(s.start + f * (s.end - s.start));
}

/** The first group not yet shown whose stop the path has reached, if any. */
export function nextStop(s: Schedule, ms: number, shown: number): number | null {
  return shown < s.groups.length && s.groups[shown].atMs <= ms ? shown : null;
}

export type TimedRun = { t: number; p: LngLat }[];

/** Index of the last element with t <= target, or -1. */
function lastAtOrBefore(run: TimedRun, t: number): number {
  let lo = 0, hi = run.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (run[mid].t <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}

/** The trace up to walk time t, as runs, ending at the interpolated position. Completed runs are reused as-is. */
export function traceUntil(runs: TimedRun[], fullRuns: LngLat[][], t: number): LngLat[][] {
  const out: LngLat[][] = [];
  for (let r = 0; r < runs.length; r++) {
    const run = runs[r];
    if (run.length === 0 || run[0].t > t) break;
    if (run[run.length - 1].t <= t) {
      out.push(fullRuns[r]);
      continue;
    }
    const i = lastAtOrBefore(run, t);
    const a = run[i];
    const b = run[i + 1];
    const f = (t - a.t) / (b.t - a.t || 1);
    out.push([...fullRuns[r].slice(0, i + 1), [a.p[0] + (b.p[0] - a.p[0]) * f, a.p[1] + (b.p[1] - a.p[1]) * f]]);
    break;
  }
  return out;
}

/** The walker's position at walk time t; during a gap it waits at the end of the run before it. */
export function walkerAt(runs: TimedRun[], t: number): LngLat | null {
  let last: LngLat | null = null;
  for (const run of runs) {
    if (run.length === 0) continue;
    if (run[0].t > t) return last ?? run[0].p;
    const i = lastAtOrBefore(run, t);
    if (i === run.length - 1) {
      last = run[i].p;
      continue;
    }
    const a = run[i];
    const b = run[i + 1];
    const f = (t - a.t) / (b.t - a.t || 1);
    return [a.p[0] + (b.p[0] - a.p[0]) * f, a.p[1] + (b.p[1] - a.p[1]) * f];
  }
  return last;
}

export function timedRuns(fixes: TracePoint[], pauses: PauseSpan[] = []): TimedRun[] {
  const runs: TimedRun[] = [];
  fixes.forEach((f, i) => {
    if (i === 0 || isBreak(fixes[i - 1], f, pauses, GAP_MS)) runs.push([]);
    runs[runs.length - 1].push({ t: f.t, p: [f.lon, f.lat] });
  });
  return runs;
}
