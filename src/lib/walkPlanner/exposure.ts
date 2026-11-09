// @layer core
import { distanceM } from '../geo';
import type { LngLat } from '../types';
import type { CategoryId } from '../discovery/types';
import type { Cell } from '../kindWalk/density';

/*
 * How much of the kind a route passes (WP14-WP16): its length graded by the dense cells it runs through, at the cells' own
 * resolution (a run is never narrower than one cell) and from counts of every place, found or not, so a find never changes it. It
 * says where along the route, never where a place is.
 */

/** A cell reaches this far from its centre: half the diagonal of a 400 m cell. */
export const REACH_M = 300;
/** No run is narrower than a cell. */
export const MIN_RUN_M = 400;
const STEP_M = 20;

export type Grade = 0 | 1 | 2 | 3;
export interface Run {
  fromM: number;
  toM: number;
  grade: Grade;
}

function gradeOf(count: number, max: number): Grade {
  return Math.max(1, Math.min(3, Math.ceil((3 * count) / max))) as Grade;
}

/** The route's length in runs of one grade: 0 away from the kind, 1 to 3 as the cells passed are fewer or denser. */
export function gradeRuns(path: readonly LngLat[], cells: readonly Cell[]): Run[] {
  if (path.length < 2) return [];
  const max = Math.max(1, ...cells.map((c) => c.count));
  const raw: Grade[] = [];
  let carried = 0;
  const total = path.reduce((s, p, i) => (i ? s + distanceM(path[i - 1], p) : 0), 0);
  // One grade per STEP_M of the route, by the densest cell within reach of that point.
  for (let i = 1; i < path.length; i++) {
    const d = distanceM(path[i - 1], path[i]);
    let m = STEP_M - carried;
    while (m <= d) {
      const f = m / d;
      const p: LngLat = [path[i - 1][0] + (path[i][0] - path[i - 1][0]) * f, path[i - 1][1] + (path[i][1] - path[i - 1][1]) * f];
      let g: Grade = 0;
      for (const c of cells) if (distanceM(p, c.at) <= REACH_M) g = Math.max(g, gradeOf(c.count, max)) as Grade;
      raw.push(g);
      m += STEP_M;
    }
    carried = (carried + d) % STEP_M;
  }
  if (!raw.length) return [{ fromM: 0, toM: total, grade: 0 }];
  let runs: Run[] = [];
  raw.forEach((g, i) => {
    const last = runs[runs.length - 1];
    if (last && last.grade === g) last.toM = (i + 1) * STEP_M;
    else runs.push({ fromM: i * STEP_M, toM: (i + 1) * STEP_M, grade: g });
  });
  // A run narrower than a cell takes the grade of its longer neighbour, until none is.
  for (;;) {
    let short = -1;
    for (let i = 0; i < runs.length; i++) if (runs.length > 1 && runs[i].toM - runs[i].fromM < MIN_RUN_M && (short < 0 || runs[i].toM - runs[i].fromM < runs[short].toM - runs[short].fromM)) short = i;
    if (short < 0) break;
    const left = runs[short - 1];
    const right = runs[short + 1];
    const takes = !left ? right : !right ? left : left.toM - left.fromM >= right.toM - right.fromM ? left : right;
    runs[short] = { ...runs[short], grade: takes.grade };
    const merged: Run[] = [];
    for (const r of runs) {
      const l = merged[merged.length - 1];
      if (l && l.grade === r.grade) l.toM = r.toM;
      else merged.push({ ...r });
    }
    runs = merged;
  }
  runs[runs.length - 1].toM = Math.max(runs[runs.length - 1].toM, total);
  return runs;
}

/** The share of the route's length that runs through the kind at all (0 to 1): what the density setting asks for, never shown. */
export function kindShare(runs: readonly Run[]): number {
  const total = runs.length ? runs[runs.length - 1].toM : 0;
  if (!total) return 0;
  return runs.filter((r) => r.grade > 0).reduce((s, r) => s + (r.toM - r.fromM), 0) / total;
}

/** A word for a strip's grade, for a screen reader (WP15). */
const GRADE_WORD = ['none', 'a little', 'some', 'plenty'] as const;

/** The strip said in words: how much of the kind at the start, in the middle and near the end (WP15). */
export function stripLabel(grades: readonly Grade[]): string {
  const third = (i: number) => {
    const part = grades.slice(Math.floor((i * grades.length) / 3), Math.floor(((i + 1) * grades.length) / 3));
    const mean = part.length ? part.reduce<number>((s, g) => s + g, 0) / part.length : 0;
    return GRADE_WORD[mean < 0.4 ? 0 : mean < 1.4 ? 1 : mean < 2.2 ? 2 : 3];
  };
  return `The kind along this route: ${third(0)} at the start, ${third(1)} in the middle, ${third(2)} near the end`;
}

/** The strip: the route from start to end as `n` equal cells of a grade each, flat (WP15). */
export function strip(runs: readonly Run[], n = 24): Grade[] {
  const total = runs.length ? runs[runs.length - 1].toM : 0;
  if (!total) return Array(n).fill(0);
  return Array.from({ length: n }, (_, i) => {
    const mid = ((i + 0.5) / n) * total;
    return (runs.find((r) => mid >= r.fromM && mid < r.toM) ?? runs[runs.length - 1]).grade;
  });
}

export interface Exposure {
  /** How much of the kind the route passes, in a clause. */
  line: string;
  /** How much of the route is only getting there, in a clause; null when it is little. */
  getting: string | null;
}

/** The words for a route's exposure (WP14): no digit, no percent, no count. */
export function exposureWords(runs: readonly Run[], startM: number, totalM: number): Exposure {
  const total = runs.length ? runs[runs.length - 1].toM : totalM;
  const share = kindShare(runs);
  const strong = runs.filter((r) => r.grade >= 2).reduce((s, r) => s + (r.toM - r.fromM), 0) / (total || 1);
  const amount = strong >= 0.45 || share >= 0.7 ? 'plenty' : share >= 0.3 ? 'some' : 'little';
  const thirds = [0, 0, 0];
  for (const r of runs) {
    if (r.grade === 0) continue;
    for (let t = 0; t < 3; t++) {
      const a = Math.max(r.fromM, (t / 3) * total);
      const b = Math.min(r.toM, ((t + 1) / 3) * total);
      if (b > a) thirds[t] += (b - a) * r.grade;
    }
  }
  const sum = thirds[0] + thirds[1] + thirds[2];
  const where = sum === 0 ? '' : thirds[0] / sum >= 0.6 ? 'mostly near the start' : thirds[2] / sum >= 0.6 ? 'mostly near the end' : thirds[1] / sum >= 0.6 ? 'mostly in the middle' : 'along much of the way';
  const line = amount === 'little' ? 'Little of it along the way' : `${amount === 'plenty' ? 'Plenty' : 'Some'} ${where || 'along the way'}`;
  const gettingShare = totalM ? startM / totalM : 0;
  const getting = gettingShare >= 0.5 ? 'Much of the way is getting there' : gettingShare >= 0.25 ? 'Part of the way is getting there' : null;
  return { line, getting };
}

export interface Also {
  kind: CategoryId;
  level: 'some' | 'plenty';
}

/**
 * The other kinds with a presence along a route (WP28), by kind and never by place: the route graded by each kind's dense cells at
 * their resolution, every place counted found or not. A kind with little along it is not named. In the kinds' fixed order.
 */
export function alsoPasses(path: readonly LngLat[], cellsByKind: Partial<Record<CategoryId, readonly Cell[]>>, order: readonly CategoryId[], except: CategoryId): Also[] {
  const out: Also[] = [];
  for (const kind of order) {
    if (kind === except) continue;
    const cells = cellsByKind[kind];
    if (!cells || !cells.length) continue;
    const runs = gradeRuns(path, cells);
    const total = runs.length ? runs[runs.length - 1].toM : 0;
    if (!total) continue;
    const share = kindShare(runs);
    const strong = runs.filter((r) => r.grade >= 2).reduce((t, r) => t + (r.toM - r.fromM), 0) / total;
    if (share < 0.15) continue;
    out.push({ kind, level: strong >= 0.45 || share >= 0.7 ? 'plenty' : 'some' });
  }
  return out;
}
