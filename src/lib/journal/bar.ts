// @layer core
/**
 * What the sheet keeps free at its foot under the journal's toolbar (JN41, decision 0178; audit 40, 43;
 * chronicle-journal audit 62, 63): the toolbar's own height or the messages above it, whichever is taller, plus,
 * while the keyboard is up, the room an iPhone keeps for its own row (`under`, never part of `barH`) and the
 * keyboard's lift.
 */
export function footRoom(r: { barH: number; aboveH: number; under: number; lift: number }): number {
  return Math.max(r.barH, r.aboveH) + r.under + r.lift;
}
