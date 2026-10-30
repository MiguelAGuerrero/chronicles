import { distanceM } from './geo';
import type { Capture, LngLat, TracePoint } from './types';

/**
 * Timing for the end-of-session ceremony. The concept doc fixes the shape
 * (five beats, always in the same order) and the length (about forty seconds
 * whatever the walk's length); this turns a walk into that schedule.
 */

export const FOG_MS = 4000;
/** Beats two and three together: the path runs, captures interrupt. */
export const PATH_AND_PAUSES_MS = 30_000;
const MIN_MOVING_MS = 10_000;
const MAX_PAUSES_MS = PATH_AND_PAUSES_MS - MIN_MOVING_MS;
const BASE_PAUSE_MS = 3000;
const EXTRA_PER_CAPTURE_MS = 1200;
const MAX_VOICE_MS = 8000;
const GROUP_M = 40;
const GROUP_GAP_MS = 120_000;

export interface PauseGroup {
  /** Walk time at which the path stops for this group. */
  t: number;
  at: LngLat | null;
  captures: Capture[];
  /** Replay time this pause lasts. */
  ms: number;
}

export interface Schedule {
  start: number;
  end: number;
  movingMs: number;
  groups: PauseGroup[];
  totalMs: number;
}

/** Captures taken close together, in space and time, share one pause. */
export function groupCaptures(captures: Capture[]): PauseGroup[] {
  const groups: PauseGroup[] = [];
  for (const c of [...captures].sort((a, b) => a.t - b.t)) {
    const pos: LngLat | null = c.lat != null && c.lon != null ? [c.lon, c.lat] : null;
    const g = groups[groups.length - 1];
    const near = g && c.t - g.t <= GROUP_GAP_MS && (!g.at || !pos || distanceM(g.at, pos) <= GROUP_M);
    if (near) g.captures.push(c);
    else groups.push({ t: c.t, at: pos, captures: [c], ms: 0 });
  }
  for (const g of groups) {
    const voice = Math.max(0, ...g.captures.filter((c) => c.kind === 'voice').map((c) => Math.min(Number(c.body) || 0, MAX_VOICE_MS)));
    g.ms = Math.max(BASE_PAUSE_MS + EXTRA_PER_CAPTURE_MS * (g.captures.length - 1), voice + 500);
  }
  const total = groups.reduce((s, g) => s + g.ms, 0);
  if (total > MAX_PAUSES_MS) for (const g of groups) g.ms = Math.round((g.ms * MAX_PAUSES_MS) / total);
  return groups;
}

export function schedule(fixes: TracePoint[], captures: Capture[], startedAt: number): Schedule {
  const groups = groupCaptures(captures);
  const start = fixes[0]?.t ?? startedAt;
  const end = Math.max(fixes.at(-1)?.t ?? start, ...captures.map((c) => c.t), start + 1);
  const pauses = groups.reduce((s, g) => s + g.ms, 0);
  const movingMs = Math.max(MIN_MOVING_MS, PATH_AND_PAUSES_MS - pauses);
  return { start, end, movingMs, groups, totalMs: movingMs + pauses };
}

export type Cursor =
  | { kind: 'moving'; walkT: number }
  | { kind: 'paused'; walkT: number; group: PauseGroup; index: number }
  | { kind: 'done'; walkT: number };

/** Where the replay is, `ms` after the path started running. */
export function cursorAt(s: Schedule, ms: number): Cursor {
  const rate = (s.end - s.start) / s.movingMs; // walk ms per replay ms while moving
  let replay = 0;
  let walkT = s.start;
  for (let i = 0; i < s.groups.length; i++) {
    const g = s.groups[i];
    const gT = Math.min(Math.max(g.t, s.start), s.end);
    const moveMs = (gT - walkT) / rate;
    if (ms < replay + moveMs) return { kind: 'moving', walkT: walkT + (ms - replay) * rate };
    replay += moveMs;
    walkT = gT;
    if (ms < replay + g.ms) return { kind: 'paused', walkT, group: g, index: i };
    replay += g.ms;
  }
  const rest = (s.end - walkT) / rate;
  if (ms < replay + rest) return { kind: 'moving', walkT: walkT + (ms - replay) * rate };
  return { kind: 'done', walkT: s.end };
}

/** The trace up to walk time t, as runs, ending exactly at the interpolated position. */
export function traceUntil(runs: { t: number; p: LngLat }[][], t: number): LngLat[][] {
  const out: LngLat[][] = [];
  for (const run of runs) {
    if (run.length === 0 || run[0].t > t) break;
    const line: LngLat[] = [];
    for (let i = 0; i < run.length; i++) {
      if (run[i].t <= t) {
        line.push(run[i].p);
        continue;
      }
      const a = run[i - 1];
      const b = run[i];
      const f = (t - a.t) / (b.t - a.t || 1);
      line.push([a.p[0] + (b.p[0] - a.p[0]) * f, a.p[1] + (b.p[1] - a.p[1]) * f]);
      break;
    }
    out.push(line);
  }
  return out;
}
