// @layer core
import type { Band } from './types';

/*
 * An area said in words from its streets (WK11). The shares are never shown (WK12): nothing is a score,
 * no number, percentage, rank or comparison between areas. Pure.
 */

export type BandLengths = Record<Band, number>;

/** Metres of street per band; a segment with no band is `unknown`. */
export function bandLengths(segments: readonly { id: string; length_m: number }[], bands: ReadonlyMap<string, Band>): BandLengths {
  const out: BandLengths = { foot: 0, mixed: 0, car: 0, unknown: 0 };
  for (const s of segments) out[bands.get(s.id) ?? 'unknown'] += s.length_m;
  return out;
}

/** Said only when at least half the street is known; below that a read says nothing. */
const KNOWN_MIN = 0.5;
const MOSTLY = 0.6;
const A_GOOD_SHARE = 0.25;

export function areaWords(l: BandLengths): string | null {
  const known = l.foot + l.mixed + l.car;
  const all = known + l.unknown;
  if (all <= 0 || known / all < KNOWN_MIN) return null;
  const [foot, mixed, car] = [l.foot / known, l.mixed / known, l.car / known];
  if (car >= MOSTLY) return 'Mostly built around cars';
  if (foot >= MOSTLY) return 'Mostly easy on foot';
  if (mixed >= MOSTLY) return 'Mostly mixed';
  if (foot >= A_GOOD_SHARE && car >= A_GOOD_SHARE) return 'A mix of easy and car-oriented streets';
  return 'A mix of streets';
}
