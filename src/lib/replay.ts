import { distanceM } from './geo';
import type { Capture, LngLat, TracePoint } from './types';

/**
 * Timing for the end-of-session ceremony. The concept doc fixes the shape
 * (five beats, always in the same order) and the length (about forty seconds
 * whatever the walk's length); this turns a walk into that schedule.
 *
 * The path runs in "active time": stretches with no fixes longer than
 * GAP_MS (the app was closed, the tab hidden, a long stop indoors) are
 * collapsed to a short hop, so the walk never crawls across a gap.
 */

export const FOG_MS = 4000;
/** Beats two and three together: the path runs, captures interrupt. */
export const PATH_AND_PAUSES_MS = 30_000;
const MIN_MOVING_MS = 10_000;
const MAX_PAUSES_MS = PATH_AND_PAUSES_MS - MIN_MOVING_MS;
const ITEM_MS: Record<Capture['kind'], number> = { photo: 3000, text: 3000, voice: 0 };
const MAX_VOICE_MS = 8000;
/** No capture is shown for less than this; past it, groups become contact sheets, then merge. */
const MIN_ITEM_MS = 1500;
const GROUP_M = 40;
const GROUP_GAP_MS = 120_000;
export const GAP_MS = 60_000;
/** Active time a collapsed gap still takes, so the cut reads as a cut. */
const HOP_MS = 5000;

export interface PauseItem {
  capture: Capture;
  /** Offset within the pause at which this capture comes up. */
  from: number;
  ms: number;
}

export interface PauseGroup {
  /** Walk time at which the path stops for this group. */
  t: number;
  at: LngLat | null;
  captures: Capture[];
  /** One capture after another; empty when shown together as a contact sheet. */
  items: PauseItem[];
  /** Replay time this pause lasts. */
  ms: number;
}

export interface Schedule {
  /** Active-time span of the path. */
  start: number;
  end: number;
  movingMs: number;
  groups: (PauseGroup & { activeT: number })[];
  totalMs: number;
  /** Converts walk time to active time. */
  toActive(t: number): number;
  /** Converts active time back to walk time. */
  toWalk(a: number): number;
}

const voiceMs = (c: Capture) => Math.min(Number(c.body) || 0, MAX_VOICE_MS) + 500;
const itemMs = (c: Capture) => (c.kind === 'voice' ? Math.max(MIN_ITEM_MS, voiceMs(c)) : ITEM_MS[c.kind]);

function layout(g: PauseGroup, scale: number) {
  let from = 0;
  g.items = g.captures.map((capture) => {
    const ms = Math.max(MIN_ITEM_MS, Math.round(itemMs(capture) * scale));
    const item = { capture, from, ms };
    from += ms;
    return item;
  });
  g.ms = from;
}

/** Captures taken close together, in space and time, share one pause. */
export function groupCaptures(captures: Capture[]): PauseGroup[] {
  let groups: PauseGroup[] = [];
  for (const c of [...captures].sort((a, b) => a.t - b.t)) {
    const pos: LngLat | null = c.lat != null && c.lon != null ? [c.lon, c.lat] : null;
    const g = groups[groups.length - 1];
    const near = g && c.t - g.t <= GROUP_GAP_MS && (!g.at || !pos || distanceM(g.at, pos) <= GROUP_M);
    if (near) g.captures.push(c);
    else groups.push({ t: c.t, at: pos, captures: [c], items: [], ms: 0 });
  }
  // Each capture gets its own moment, scaled to fit the pause budget.
  const natural = groups.reduce((s, g) => s + g.captures.reduce((x, c) => x + itemMs(c), 0), 0);
  const scale = natural > MAX_PAUSES_MS ? MAX_PAUSES_MS / natural : 1;
  for (const g of groups) layout(g, scale);
  if (groups.reduce((s, g) => s + g.ms, 0) <= MAX_PAUSES_MS) return groups;

  // Too many to show one by one: each group becomes one contact sheet ...
  for (const g of groups) {
    g.items = [];
    g.ms = MIN_ITEM_MS;
  }
  // ... and neighbouring sheets merge until they fit.
  while (groups.length * MIN_ITEM_MS > MAX_PAUSES_MS) {
    const merged: PauseGroup[] = [];
    for (let i = 0; i < groups.length; i += 2) {
      const a = groups[i];
      const b = groups[i + 1];
      merged.push(b ? { ...a, captures: [...a.captures, ...b.captures] } : a);
    }
    groups = merged;
  }
  return groups;
}

/**
 * Active-time mapping: each gap longer than GAP_MS between fixes (t0 to t1)
 * keeps its first HOP_MS and loses the rest.
 */
function activeClock(fixes: TracePoint[]) {
  const gaps: { t0: number; t1: number }[] = [];
  for (let i = 1; i < fixes.length; i++) {
    if (fixes[i].t - fixes[i - 1].t > GAP_MS) gaps.push({ t0: fixes[i - 1].t, t1: fixes[i].t });
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

export function schedule(fixes: TracePoint[], captures: Capture[], startedAt: number): Schedule {
  const groups = groupCaptures(captures);
  const { toActive, toWalk } = activeClock(fixes);
  const startT = fixes[0]?.t ?? startedAt;
  const endT = Math.max(fixes.at(-1)?.t ?? startT, ...captures.map((c) => c.t), startT + 1);
  const start = toActive(startT);
  const end = toActive(endT);
  const pauses = groups.reduce((s, g) => s + g.ms, 0);
  // Nothing to draw: no point running an empty path; captures still get their moment.
  const movingMs = fixes.length < 2 ? 0 : Math.max(MIN_MOVING_MS, PATH_AND_PAUSES_MS - pauses);
  return {
    start,
    end,
    movingMs,
    groups: groups.map((g) => ({ ...g, activeT: Math.min(Math.max(toActive(g.t), start), end) })),
    totalMs: movingMs + pauses,
    toActive,
    toWalk,
  };
}

export type Cursor =
  | { kind: 'moving'; walkT: number }
  | { kind: 'paused'; walkT: number; group: PauseGroup; index: number; elapsed: number }
  | { kind: 'done'; walkT: number };

/** Where the replay is, `ms` after the path started running. */
export function cursorAt(s: Schedule, ms: number): Cursor {
  const span = s.end - s.start;
  const rate = s.movingMs > 0 ? span / s.movingMs : 0; // active ms per replay ms while moving
  let replay = 0;
  let a = s.start;
  const moveTo = (target: number) => (rate > 0 ? (target - a) / rate : 0);
  for (let i = 0; i < s.groups.length; i++) {
    const g = s.groups[i];
    const moveMs = moveTo(g.activeT);
    if (ms < replay + moveMs) return { kind: 'moving', walkT: s.toWalk(a + (ms - replay) * rate) };
    replay += moveMs;
    a = g.activeT;
    if (ms < replay + g.ms) return { kind: 'paused', walkT: s.toWalk(a), group: g, index: i, elapsed: ms - replay };
    replay += g.ms;
  }
  const rest = moveTo(s.end);
  if (ms < replay + rest) return { kind: 'moving', walkT: s.toWalk(a + (ms - replay) * rate) };
  return { kind: 'done', walkT: s.toWalk(s.end) };
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

export function timedRuns(fixes: TracePoint[]): TimedRun[] {
  const runs: TimedRun[] = [];
  fixes.forEach((f, i) => {
    if (i === 0 || f.t - fixes[i - 1].t > GAP_MS) runs.push([]);
    runs[runs.length - 1].push({ t: f.t, p: [f.lon, f.lat] });
  });
  return runs;
}
