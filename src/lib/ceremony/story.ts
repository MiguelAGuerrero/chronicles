// @layer core
/**
 * The story of a walk or a day (RR20): what happened, in time order, read
 * once from the walk's trace and captures. No timing, no look: a ceremony
 * decides how to tell it (decision 0086).
 */
import { facedAt, hasMore, type Faced } from '../moment';
import { distanceM } from '../geo';
import { groupCaptures, timedRuns, traceUntil, walkerAt, type TimedRun } from '../replay';
import type { Day } from '../days';
import type { ReplayData } from '../summary';
import type { LngLat } from '../types';
import type { Story, StoryEvent, StoryMoment, StoryPass, StoryPath } from './types';

/** What a walk's story is read from: the replay's data, with where and when each passed place was passed. */
export type WalkInput = Pick<ReplayData, 'walk' | 'fixes' | 'walkedFixes' | 'breaks' | 'pauses' | 'runs' | 'rideRuns' | 'rideTimed' | 'captures'> & {
  passed: { name: string; generic: boolean; at?: LngLat; t?: number }[];
  /** Standstills, kept in `fixes` as their two ends: the time between is a stand, not a gap. */
  stays?: { t0: number; t1: number }[];
};

/** Within this of where a capture was taken, you were still there (the standstill radius, 0010). */
const STILL_M = 25;

/** Index of the last element of a sorted list at or before t, or -1. */
function lastAtOrBefore(ts: number[], t: number): number {
  let lo = 0, hi = ts.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (ts[mid] <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}

/** Metres along the path at walk time t; a gap adds none, so across one it stands still. */
export function metresAt(p: StoryPath, t: number): number {
  const i = lastAtOrBefore(p.ts, t);
  if (i < 0) return 0;
  if (i >= p.ts.length - 1) return p.ms[p.ms.length - 1];
  const f = (t - p.ts[i]) / (p.ts[i + 1] - p.ts[i] || 1);
  return p.ms[i] + (p.ms[i + 1] - p.ms[i]) * f;
}

/** The first walk time within [t0, t1] at which the path is `m` metres along. */
export function timeAtMetres(p: StoryPath, m: number, t0: number, t1: number): number {
  let lo = lastAtOrBefore(p.ts, t0);
  if (lo < 0) lo = 0;
  let hi = lastAtOrBefore(p.ts, t1);
  if (hi < lo) return t0;
  if (m <= metresAt(p, t0)) return t0;
  // First index in (lo, hi] whose metres reach m.
  let a = lo + 1, b = hi, j = -1;
  while (a <= b) {
    const mid = (a + b) >> 1;
    if (p.ms[mid] >= m) { j = mid; b = mid - 1; } else a = mid + 1;
  }
  if (j < 0) return t1;
  const dm = p.ms[j] - p.ms[j - 1];
  const t = dm > 0 ? p.ts[j - 1] + ((m - p.ms[j - 1]) / dm) * (p.ts[j] - p.ts[j - 1]) : p.ts[j];
  return Math.min(t1, Math.max(t0, t));
}

/** A path drawn up to walk time t (Infinity: whole): the solid trace and the dashed rides so far, ending at the walker (R5). */
export function pathDrawnAt(p: StoryPath, t: number): { trace: LngLat[][]; rides: LngLat[][] } {
  if (t === Infinity) return { trace: p.drawn, rides: p.rideRuns };
  return { trace: traceUntil(p.walked, p.drawn, t), rides: traceUntil(p.rideTimed, p.rideRuns, t) };
}

/** Where the walker is at walk time t. */
export const positionAt = (p: StoryPath, t: number): LngLat | null => walkerAt(p.dot, t);

/**
 * Runs split only where the walker was really away (audit 5): a standstill is
 * kept in the trace as its two end fixes (smoothDwells), minutes apart at one
 * spot, which reads as a gap. Two runs whose join lies inside a known stay,
 * with no pause between them, are one: standing there, not the app closed.
 */
function joinStills(runs: TimedRun[], pauses: WalkInput['pauses'], stays: { t0: number; t1: number }[]): TimedRun[] {
  const out: TimedRun[] = [];
  for (const run of runs) {
    const prev = out[out.length - 1];
    const a = prev?.[prev.length - 1];
    const b = run[0];
    const stand = a && b && stays.some((s) => s.t0 <= a.t && s.t1 >= b.t) && !pauses.some((p) => p.started_at < b.t && (p.ended_at ?? Infinity) > a.t);
    if (stand) prev.push(...run);
    else out.push([...run]);
  }
  return out;
}

function pathOf(r: WalkInput): StoryPath | null {
  if (r.fixes.length < 2) return null;
  const dot = joinStills(timedRuns(r.fixes, r.pauses), r.pauses, r.stays ?? []);
  const ts: number[] = [];
  const ms: number[] = [];
  const runOf: number[] = [];
  const ps: LngLat[] = [];
  let m = 0;
  dot.forEach((run, k) =>
    run.forEach((pt, i) => {
      if (i > 0) m += distanceM(run[i - 1].p, pt.p);
      ts.push(pt.t);
      ms.push(m);
      runOf.push(k);
      ps.push(pt.p);
    }),
  );
  return {
    id: r.walk.id,
    dot,
    walked: timedRuns(r.walkedFixes, r.breaks),
    drawn: r.runs,
    rideTimed: r.rideTimed,
    rideRuns: r.rideRuns,
    ts,
    ms,
    runOf,
    ps,
    start: ts[0],
    end: ts[ts.length - 1],
  };
}

/**
 * When you got to where a moment was made and when you moved on: the trace
 * within STILL_M of that spot around its captures, in the same run, never
 * before `lo` (the last moment's leaving) or after `hi` (the next moment).
 */
function stillSpan(p: StoryPath, tFirst: number, tLast: number, lo: number, hi: number): [number, number] {
  let arrive = tFirst;
  let leave = tLast;
  const a0 = positionAt(p, tFirst);
  const a1 = positionAt(p, tLast);
  let i = lastAtOrBefore(p.ts, tFirst);
  // Never across a run's edge (audit 21): a capture in a gap or a pause, or at a run's last fix, leaves the break a break.
  if (a0 && inRun(p, tFirst)) {
    for (; i >= 0 && p.ts[i] >= lo; i--) {
      if (distanceM(p.ps[i], a0) > STILL_M) break;
      arrive = Math.min(arrive, p.ts[i]);
      if (i > 0 && p.runOf[i - 1] !== p.runOf[i]) break;
    }
  }
  let j = lastAtOrBefore(p.ts, tLast) + 1;
  if (a1 && inRun(p, tLast) && j < p.ts.length && j > 0 && p.runOf[j] === p.runOf[j - 1]) {
    for (; j < p.ts.length && p.ts[j] <= hi; j++) {
      if (distanceM(p.ps[j], a1) > STILL_M) break;
      leave = Math.max(leave, p.ts[j]);
      if (j + 1 < p.ts.length && p.runOf[j + 1] !== p.runOf[j]) break;
    }
  }
  return [arrive, leave];
}

/** Whether walk time t falls on the trace: at a fix, or between two of one run (not in a gap or a pause). */
function inRun(p: StoryPath, t: number): boolean {
  const k = lastAtOrBefore(p.ts, t);
  return k >= 0 && (p.ts[k] === t || (k + 1 < p.ts.length && p.runOf[k + 1] === p.runOf[k]));
}

/** Moves and breaks along a path between walk times a and b. */
function span(p: StoryPath, a: number, b: number, out: StoryEvent[]) {
  if (b <= a) return;
  p.dot.forEach((run, k) => {
    if (!run.length) return;
    const s = run[0].t;
    const e = run[run.length - 1].t;
    if (e > a && s < b) {
      const t0 = Math.max(a, s);
      const t1 = Math.min(b, e);
      if (t1 > t0) out.push({ kind: 'move', pathId: p.id, t0, t1, m0: metresAt(p, t0), m1: metresAt(p, t1) });
    }
    const next = p.dot[k + 1];
    if (!next?.length) return;
    const g0 = Math.max(a, e);
    const g1 = Math.min(b, next[0].t);
    if (g1 > g0) out.push({ kind: 'break', pathId: p.id, t0: g0, t1: g1, from: positionAt(p, g0), to: g1 >= next[0].t ? next[0].p : positionAt(p, g1) });
  });
}

const looseMoments = (captures: Faced[]): StoryMoment[] =>
  groupCaptures(captures).map((g) => ({
    kind: 'moment',
    captures: g.captures,
    at: g.at,
    arrive: g.captures[0].t,
    leave: g.captures[g.captures.length - 1].t,
    pathId: null,
    onTrace: false,
  }));

const eventStart = (e: StoryEvent) => (e.kind === 'moment' ? e.arrive : e.t0);
const eventEnd = (e: StoryEvent) => (e.kind === 'moment' ? e.leave : e.t1);

/** Assembles a story from entries in time order, with travel from each to the next where no trace says the way. */
function builder() {
  const events: StoryEvent[] = [];
  const paths: Record<string, StoryPath> = {};
  const passes: StoryPass[] = [];
  let last: { at: LngLat | null; t: number } | null = null;
  const travelTo = (at: LngLat | null, t: number) => {
    if (!last) return;
    const to = at ?? last.at;
    events.push({ kind: 'travel', t0: last.t, t1: Math.max(last.t, t), from: last.at, to, m: last.at && to ? distanceM(last.at, to) : 0 });
  };
  return {
    moment(m: StoryMoment) {
      travelTo(m.at, m.arrive);
      events.push(m);
      last = { at: m.at ?? last?.at ?? null, t: Math.max(m.leave, last?.t ?? -Infinity) };
    },
    walk(s: Story) {
      const path = Object.values(s.paths)[0];
      const first = path ? positionAt(path, s.start) : null;
      travelTo(first, s.start);
      events.push(...s.events);
      Object.assign(paths, s.paths);
      passes.push(...s.passes);
      last = { at: (path ? positionAt(path, s.end) : null) ?? last?.at ?? null, t: s.end };
    },
    story(): Story {
      const moments = events.filter((e): e is StoryMoment => e.kind === 'moment');
      return {
        start: events.length ? Math.min(...events.map(eventStart)) : 0,
        end: events.length ? Math.max(...events.map(eventEnd)) : 0,
        paths,
        events,
        passes,
        captures: moments.flatMap((m) => m.captures),
      };
    },
  };
}

/** A walk's story: its path, moves and breaks along it, its moments, the places it passed. */
export function walkStory(r: WalkInput): Story {
  const path = pathOf(r);
  const groups = groupCaptures(r.captures);
  if (!path) {
    // No trace to follow: the moments, from one to the next.
    const b = builder();
    for (const m of looseMoments(r.captures)) b.moment(m);
    return b.story();
  }
  const events: StoryEvent[] = [];
  let cursor = path.start;
  // A moment the trace doesn't cover (in a gap or a pause) is where it was taken: the break before it
  // lands there, and the break after it leaves from there (audit 30).
  let offTrace: { at: LngLat; leave: number } | null = null;
  const from = (n: number) => {
    const e = events[n];
    if (offTrace && e?.kind === 'break' && e.t0 === offTrace.leave) e.from = offTrace.at;
    offTrace = null;
  };
  groups.forEach((g, i) => {
    const tFirst = g.captures[0].t;
    // A stacked moment's stop runs to its last piece (MS17), not its time, which is its first's.
    const tLast = Math.max(...g.captures.map(lastPieceT));
    const next = groups[i + 1]?.captures[0].t ?? Infinity;
    const [arrive, leave] = stillSpan(path, tFirst, tLast, cursor, next);
    const n = events.length;
    span(path, cursor, arrive, events);
    from(n);
    const onTrace = inRun(path, tFirst) && inRun(path, tLast);
    const at = g.at ?? positionAt(path, tFirst);
    const before = events[events.length - 1];
    if (!onTrace && g.at && before?.kind === 'break' && before.t1 === arrive) before.to = g.at;
    events.push({ kind: 'moment', captures: g.captures, at, arrive, leave, pathId: path.id, onTrace });
    if (!onTrace && g.at) offTrace = { at: g.at, leave };
    cursor = Math.max(cursor, leave);
  });
  const n = events.length;
  span(path, cursor, path.end, events);
  from(n);
  const passes: StoryPass[] = r.passed.flatMap((p) => (p.at && p.t != null ? [{ pathId: path.id, t: p.t, at: p.at, name: p.name, generic: p.generic }] : []));
  const moments = events.filter((e): e is StoryMoment => e.kind === 'moment');
  return {
    start: Math.min(path.start, ...events.map(eventStart)),
    end: Math.max(path.end, ...events.map(eventEnd)),
    paths: { [path.id]: path },
    events,
    passes: passes.sort((a, b) => a.t - b.t),
    captures: moments.flatMap((m) => m.captures),
  };
}

/**
 * A day's story (RR16): its loose moments and its walks in time order, with
 * travel from each to the next. A walk whose replay could not be read (or
 * has no trace) shows its moments as loose ones.
 */
export function dayStory(day: Day, walks: Map<string, WalkInput | null>): Story {
  const b = builder();
  let pending: Faced[] = [];
  const flush = () => {
    for (const m of looseMoments(pending)) b.moment(m);
    pending = [];
  };
  for (const e of day.entries) {
    if (e.kind === 'moment') {
      pending.push(e.capture);
      continue;
    }
    flush();
    const r = walks.get(e.walk.id);
    const s = r ? walkStory(r) : null;
    if (!s || !Object.keys(s.paths).length) {
      for (const m of looseMoments(r?.captures ?? e.captures)) b.moment(m);
      continue;
    }
    b.walk(s);
  }
  flush();
  return b.story();
}

/** A moment's last piece's time: a stack's stop ends there (MS17). */
const lastPieceT = (c: Faced): number => (c.pieces?.length ? Math.max(c.t, ...c.pieces.map((p) => p.t)) : c.t);

/**
 * The story's moments in order, each its captures: the screen reader's way through (RR17, RR22). A stacked moment is
 * stepped through piece by piece, in capture order (MS17), each shown as the moment at that piece (`facedAt`).
 */
export const storySteps = (s: Story): Faced[][] =>
  s.events.flatMap((e) => (e.kind === 'moment' ? [e.captures.flatMap((c) => (hasMore(c) ? [...c.pieces].sort((a, b) => a.t - b.t).map((p) => facedAt(c, p.id)) : [c]))] : []));

/**
 * The position a step's footer says, counted in moments ("2 of 3"), never over a moment's pieces: null on a piece of a
 * stack (MS9) or when the step holds one moment.
 */
export function stepPosition(items: Faced[], i: number): string | null {
  const item = items[i];
  if (!item || hasMore(item)) return null;
  const ids = [...new Set(items.map((x) => x.id))];
  return ids.length > 1 ? `${ids.indexOf(item.id) + 1} of ${ids.length}` : null;
}

/**
 * Where the screen reader's steps stand (audit 18): the same step, or the
 * next moment when the one showing was deleted, or null when none is left.
 */
export function stepAt(steps: Faced[][], at: { step: number; item: number }): { step: number; item: number } | null {
  for (let step = at.step, item = at.item; step < steps.length; step++, item = 0) if (item < steps[step].length) return { step, item };
  return null;
}
