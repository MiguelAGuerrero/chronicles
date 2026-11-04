// @layer core
import { distanceM, isBreak, type PauseSpan } from './geo';
import type { Capture, LngLat, TracePoint } from './types';

/**
 * The replay's shared pieces: the fog beat's length, captures grouped into
 * stops, and the trace as timed runs, drawn up to a time with the walker at
 * its end. How the path beat is told is a ceremony's (`lib/ceremony`,
 * decisions 0085, 0086); the trace breaks where `isBreak` says (a gap over
 * GAP_MS, or a pause, however short).
 */

export const FOG_MS = 4000;
const GROUP_M = 40;
const GROUP_GAP_MS = 120_000;
export const GAP_MS = 60_000;

export interface PauseGroup {
  /** Walk time at which the path stops for this group. */
  t: number;
  at: LngLat | null;
  /** Shown one after another, each until the viewer moves on. */
  captures: Capture[];
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
    const full = fullRuns[r];
    // The two lists must come from the same fixes; a mismatch draws nothing more, never throws.
    if (!full || run.length === 0 || run[0].t > t) break;
    if (run[run.length - 1].t <= t) {
      out.push(full);
      continue;
    }
    const i = lastAtOrBefore(run, t);
    if (i + 1 >= run.length || i >= full.length) break;
    const a = run[i];
    const b = run[i + 1];
    const f = (t - a.t) / (b.t - a.t || 1);
    out.push([...full.slice(0, i + 1), [a.p[0] + (b.p[0] - a.p[0]) * f, a.p[1] + (b.p[1] - a.p[1]) * f]]);
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
