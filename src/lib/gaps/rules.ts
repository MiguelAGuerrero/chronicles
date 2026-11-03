/**
 * Filling gaps (the concept doc's "Filling gaps" tab, G1-G14). The paces and
 * the two confidence lines are first guesses, to tune on real walks.
 */
export const GAP_RULES = {
  /** A gap is longer than this without a fix (G1): the trace already breaks there. */
  gapMs: 60_000,
  /** ...and no longer than this: past it, anything could have happened (G1). */
  maxMs: 30 * 60_000,
  /** The fixes either side are at least this far apart in a straight line: closer, you were around here (G1). */
  minM: 40,
  /** Each end joins every street within this of its fix (G2). */
  joinM: 40,
  /** A way needing more than this was not walked (G3). */
  maxPace: 2.5,
  /** A walking pace: the time allowed is the gap's time at this pace (G4). */
  pace: 1.4,
  /** Walking fairly directly: up to this much longer than the likely way (G4). */
  direct: 1.25,
  /** Filled by itself with this share certain under the time budget (G5)... */
  auto: 0.9,
  /** ...else offered with this share certain under the direct budget (G6). */
  offer: 0.5,
  /** What to read: the time budget, or at least this many times the straight distance, around the gap (G8)... */
  readStraight: 2,
  /** ...but never more than this across, so a long gap reads a few tiles, not a city. */
  readMaxM: 4000,
  /** Points along a filled stretch: one every this far, and at least one every this long (G11). */
  stepM: 10,
  stepMs: 20_000,
} as const;
