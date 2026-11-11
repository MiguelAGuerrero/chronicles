// @layer core
import type { FormWord } from './placeForm';
import { FEATURES, type Feature, type Territory } from './placeFormTerritory';
import type { Measures } from './placeSignals';

/*
 * How the territories are learned (specs/place-form PF28), from labelled real places. Dev tooling: the app reads the table this produces
 * (`placeFormTerritories.ts`), never this module, and no reference place is carried into the app. Pure and deterministic.
 *
 * A territory is a box in the measures' space (counts on a log scale, shares scaled alike), built around the strictly confirmed places of a word, then:
 * - widened by MARGIN, so a place a little beyond the known ones still reads;
 * - open on the sides where more, or less, does not change the word (a grid is "at least" this many junctions), closed only by a counter-example;
 * - cut back, by the fewest lost positives, until no place the owner confirmed as something else, or as no word, lies inside it.
 * A place the owner marked "?" is neither a positive nor a counter-example for the words it accepts.
 */

/** The widening, in the scaled space: about a factor of 1.35 on a count, 0.1 on a share. */
export const MARGIN = 0.3;
/** The distance a territory keeps from a counter-example, in the scaled space: a place just beyond a confirmed no-word place is not obvious either. */
export const CUT_MARGIN = 0.15;

/** A labelled place: the owner's word (null: no word), a second word accepted (null: silence accepted too), and its measures. */
export interface Labelled {
  id: string;
  word: FormWord | null;
  accept?: FormWord | null;
  m: Measures;
}

const SCALE: Record<Feature, { to: (v: number) => number; from: (v: number) => number }> = {
  junctionsPerKm2: { to: Math.log1p, from: Math.expm1 },
  placesPerKm2: { to: Math.log1p, from: Math.expm1 },
  buildingsPerKm2: { to: Math.log1p, from: Math.expm1 },
  highwayShare: { to: (v) => v * 3, from: (v) => v / 3 },
  busyStreetM: { to: (v) => Math.log1p(v / 100), from: (v) => Math.expm1(v) * 100 },
  frontageShare: { to: (v) => v * 3, from: (v) => v / 3 },
};

/** Which sides of a word's box start open: [down, up] for each feature. */
const OPEN: Record<FormWord, Record<Feature, [boolean, boolean]>> = {
  grid: { junctionsPerKm2: [false, true], placesPerKm2: [false, true], buildingsPerKm2: [false, true], highwayShare: [true, false], busyStreetM: [false, true], frontageShare: [false, true] },
  mainStreet: { junctionsPerKm2: [false, true], placesPerKm2: [false, true], buildingsPerKm2: [false, true], highwayShare: [true, false], busyStreetM: [false, false], frontageShare: [false, true] },
  village: { junctionsPerKm2: [true, false], placesPerKm2: [true, false], buildingsPerKm2: [false, false], highwayShare: [true, false], busyStreetM: [true, false], frontageShare: [false, true] },
  exit: { junctionsPerKm2: [true, false], placesPerKm2: [false, false], buildingsPerKm2: [true, false], highwayShare: [false, true], busyStreetM: [true, false], frontageShare: [false, true] },
};

export const WORD_IDS: readonly FormWord[] = ['exit', 'grid', 'mainStreet', 'village'];
const accepts = (p: Labelled, w: FormWord | null) => p.word === w || (p.accept !== undefined && p.accept === w);

type Box = { lo: number[]; hi: number[] };

/** The territory of every word that has at least two confirmed places and can be made free of counter-examples; the others are null. */
export function learnTerritories(rows: readonly Labelled[], margin = MARGIN, cutMargin = CUT_MARGIN): Record<FormWord, Territory | null> {
  const point = (m: Measures) => FEATURES.map((f) => SCALE[f].to(m[f]));
  const out = {} as Record<FormWord, Territory | null>;
  for (const w of WORD_IDS) {
    const pos = rows.filter((r) => r.word === w && r.accept === undefined).map((r) => point(r.m));
    const neg = rows.filter((r) => !accepts(r, w)).map((r) => point(r.m));
    out[w] = pos.length >= 2 ? learnOne(w, pos, neg, margin, cutMargin) : null;
  }
  return out;
}

function learnOne(w: FormWord, positives: number[][], negatives: number[][], margin: number, cutMargin: number): Territory | null {
  let P = positives;
  const n = FEATURES.length;
  const box: Box = { lo: Array(n).fill(-Infinity), hi: Array(n).fill(Infinity) };
  FEATURES.forEach((f, k) => {
    const [openDown, openUp] = OPEN[w][f];
    const vals = P.map((p) => p[k]);
    if (!openDown) box.lo[k] = Math.min(...vals) - margin;
    if (!openUp) box.hi[k] = Math.max(...vals) + margin;
  });
  const inside = (x: number[]) => x.every((v, k) => v >= box.lo[k] && v <= box.hi[k]);
  for (let guard = 0; guard < 1000; guard++) {
    const bad = negatives.find(inside);
    if (!bad) break;
    let best: { k: number; side: 'lo' | 'hi'; val: number; lost: number } | null = null;
    for (let k = 0; k < n; k++) {
      const raise = bad[k] + cutMargin + 1e-6;
      const lower = bad[k] - cutMargin - 1e-6;
      const lostLo = P.filter((p) => p[k] < raise).length;
      const lostHi = P.filter((p) => p[k] > lower).length;
      if (raise <= box.hi[k] && (!best || lostLo < best.lost)) best = { k, side: 'lo', val: raise, lost: lostLo };
      if (lower >= box.lo[k] && (!best || lostHi < best.lost)) best = { k, side: 'hi', val: lower, lost: lostHi };
    }
    if (!best) return null;
    if (best.side === 'lo') {
      box.lo[best.k] = best.val;
      P = P.filter((p) => p[best!.k] >= best!.val);
    } else {
      box.hi[best.k] = best.val;
      P = P.filter((p) => p[best!.k] <= best!.val);
    }
    if (P.length < 2) return null;
  }
  const t = {} as Territory;
  FEATURES.forEach((f, k) => {
    // Rounded inward (lower bounds up, upper bounds down), so rounding can only shrink a territory and never let a counter-example in.
    const q = f === 'highwayShare' || f === 'frontageShare' ? 1000 : 100;
    const lo = Number.isFinite(box.lo[k]) ? Math.ceil(SCALE[f].from(box.lo[k]) * q) / q : null;
    const hi = Number.isFinite(box.hi[k]) ? Math.floor(SCALE[f].from(box.hi[k]) * q) / q : null;
    // A measure is never below zero, so a lower bound at or under zero is no bound.
    t[f] = { lo: lo !== null && lo <= 0 ? null : lo, hi };
  });
  return t;
}
