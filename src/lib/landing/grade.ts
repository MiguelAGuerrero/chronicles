import type { ActivityPoint } from '../activity/points';
import { projector } from '../geo';
import type { LngLat, StreetSegment } from '../types';
import { Buckets, nearestOn, type XY } from './spatial';

/**
 * Density along the streets, and its grades (AD9, AD10). Pure: places and
 * streets come in from any source.
 *
 * Each place counts toward its nearest named street within `frontageM`. Every
 * named street is sampled each `stepM`, and a sample's density is the weighted
 * places on the same street near it, each fading linearly to nothing at
 * `kernelM` (the simple form of kernel density along a network). Grades are
 * fractions of the read's own high point, above a floor that holds everywhere.
 */
export const GRADE_RULES = {
  /** A place counts toward its nearest named street within this. */
  frontageM: 40,
  /** How far along a street one place is felt: about a block. */
  kernelM: 120,
  /** The street is sampled this often. */
  stepM: 10,
  /** Below this density nothing grades, however quiet the town: about three full places within a block. */
  floor: 2,
  /** Medium and strong also need at least this density, so one small cluster is never "strong" on its own. */
  mediumMin: 3,
  strongMin: 4,
  /**
   * The town's own high point: this share of its sampled street length (where any place is felt) is denser.
   * A share rather than the very top, so one stacked mall doesn't make the rest of town faint.
   */
  peakShare: 0.05,
  /** Strong and medium are these fractions of the high point; anything above the floor below them is faint. */
  strongOfPeak: 0.7,
  mediumOfPeak: 0.4,
} as const;

export type Grade = 1 | 2 | 3;

/** One sample along a named street. */
export interface Sample {
  at: LngLat;
  xy: XY;
  name: string;
  density: number;
  /** Which segment, which of its lines, and the sample's place along that line. */
  seg: number;
  line: number;
  k: number;
}

/** Stretches of one street at one grade, for drawing (AD12). */
export interface GradedLine {
  name: string;
  grade: Grade;
  lines: LngLat[][];
}

export interface Grading {
  samples: Sample[];
  /** Each sample's grade, 0 for none. */
  grades: Uint8Array;
  graded: GradedLine[];
  /** The stretches, each with its samples' indices, in the order of `graded`'s lines. */
  stretches: { name: string; grade: Grade; members: number[]; line: LngLat[] }[];
}

interface Input {
  centre: LngLat;
  points: ActivityPoint[];
  segments: StreetSegment[];
}

/** AD9: the density along every named street that has a place on it. */
export function densityAlong(o: Input): Sample[] {
  const R = GRADE_RULES;
  const toXY = projector(o.centre);
  const kx = toXY([o.centre[0] + 1, o.centre[1]])[0];
  const ky = toXY([o.centre[0], o.centre[1] + 1])[1];
  const toLL = (p: XY): LngLat => [o.centre[0] + p[0] / kx, o.centre[1] + p[1] / ky];

  const named = o.segments
    .map((s, i) => ({ i, name: s.name, lines: s.geometry.map((l) => l.map(toXY)) }))
    .filter((s): s is { i: number; name: string; lines: XY[][] } => !!s.name);
  // Pieces bucketed by points along them every half cell, for "the nearest named street".
  const cell = R.frontageM * 2;
  const pieces = new Buckets<number>(cell);
  named.forEach((n, ni) => {
    for (const line of n.lines)
      for (let k = 0; k < line.length; k++) {
        pieces.add(line[k], ni);
        if (k === 0) continue;
        const [a, b] = [line[k - 1], line[k]];
        const steps = Math.floor(Math.hypot(b[0] - a[0], b[1] - a[1]) / (cell / 2));
        for (let j = 1; j <= steps; j++) pieces.add([a[0] + ((b[0] - a[0]) * j) / (steps + 1), a[1] + ((b[1] - a[1]) * j) / (steps + 1)], ni);
      }
  });

  // Each place onto its nearest named street within reach.
  const onStreet = new Map<string, Buckets<{ q: XY; w: number }>>();
  for (const p of o.points) {
    if (!(p.weight > 0)) continue;
    const xy = toXY(p.at);
    let best: { q: XY; d: number; name: string } | null = null;
    const seen = new Set<number>();
    pieces.each(xy, R.frontageM + cell / 2, (ni) => {
      if (seen.has(ni)) return;
      seen.add(ni);
      for (const l of named[ni].lines) {
        if (l.length < 2) continue;
        const r = nearestOn(xy, l);
        if (r.d <= R.frontageM && (!best || r.d < best.d)) best = { ...r, name: named[ni].name };
      }
    });
    if (!best) continue;
    const b = best as { q: XY; d: number; name: string };
    let bucket = onStreet.get(b.name);
    if (!bucket) onStreet.set(b.name, (bucket = new Buckets(R.kernelM)));
    bucket.add(b.q, { q: b.q, w: p.weight });
  }

  // Sample the streets that have places, and measure.
  const samples: Sample[] = [];
  for (const n of named) {
    const bucket = onStreet.get(n.name);
    if (!bucket) continue;
    n.lines.forEach((line, li) => {
      let k = 0;
      const push = (xy: XY) => {
        let density = 0;
        bucket.each(xy, R.kernelM, (_v, _q, d) => (density += _v.w * (1 - d / R.kernelM)));
        samples.push({ at: toLL(xy), xy, name: n.name, density, seg: n.i, line: li, k: k++ });
      };
      if (!line.length) return;
      push(line[0]);
      for (let j = 1; j < line.length; j++) {
        const [a, b] = [line[j - 1], line[j]];
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const steps = Math.max(1, Math.round(len / R.stepM));
        for (let s = 1; s <= steps; s++) push([a[0] + ((b[0] - a[0]) * s) / steps, a[1] + ((b[1] - a[1]) * s) / steps]);
      }
    });
  }
  return samples;
}

/** The value at a share of a sorted list. */
const quantile = (sorted: number[], q: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(q * sorted.length)))];

/** AD10: grades judged against the read itself, above a floor that holds everywhere. */
export function gradeStreets(o: Input): Grading {
  const R = GRADE_RULES;
  const samples = densityAlong(o);
  const grades = new Uint8Array(samples.length);
  // Judged against the town: fractions of its high point, over every sample where a place is felt, so the
  // same pattern at four times the places grades the same (AD10). The floor and minimums hold everywhere.
  const felt = samples.map((s) => s.density).filter((d) => d > 0).sort((a, b) => a - b);
  if (felt.length) {
    const peak = quantile(felt, 1 - R.peakShare);
    const strongCut = Math.max(peak * R.strongOfPeak, R.strongMin);
    const mediumCut = Math.max(peak * R.mediumOfPeak, R.mediumMin);
    samples.forEach((s, i) => {
      if (s.density < R.floor) return;
      grades[i] = s.density >= strongCut ? 3 : s.density >= mediumCut ? 2 : 1;
    });
  }
  // Consecutive samples of one line at one grade are a stretch, reaching halfway to their neighbours.
  const stretches: Grading['stretches'] = [];
  const mid = (a: LngLat, b: LngLat): LngLat => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let i = 0;
  while (i < samples.length) {
    const g = grades[i];
    let j = i;
    const same = (x: number, y: number) => samples[x].seg === samples[y].seg && samples[x].line === samples[y].line;
    while (j + 1 < samples.length && same(i, j + 1) && grades[j + 1] === g) j++;
    if (g) {
      const line: LngLat[] = [];
      if (i > 0 && same(i - 1, i)) line.push(mid(samples[i - 1].at, samples[i].at));
      for (let k = i; k <= j; k++) line.push(samples[k].at);
      if (j + 1 < samples.length && same(j, j + 1)) line.push(mid(samples[j].at, samples[j + 1].at));
      if (line.length >= 2) stretches.push({ name: samples[i].name, grade: g as Grade, members: Array.from({ length: j - i + 1 }, (_, k) => i + k), line });
    }
    i = j + 1;
  }
  // For drawing: one entry per street and grade.
  const byKey = new Map<string, GradedLine>();
  for (const s of stretches) {
    const key = `${s.grade}|${s.name}`;
    const have = byKey.get(key);
    if (have) have.lines.push(s.line);
    else byKey.set(key, { name: s.name, grade: s.grade, lines: [s.line] });
  }
  return { samples, grades, graded: [...byKey.values()], stretches };
}
