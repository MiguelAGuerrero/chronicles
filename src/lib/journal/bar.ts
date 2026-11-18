// @layer core
/**
 * What the sheet keeps free at its foot under the journal's toolbar (JN41, decision 0178; audit 40, 43;
 * chronicle-journal audit 63): the toolbar's own height and the messages that stand above it, both (tend tabs audit
 * 34; the owner's answer of Nov 18, decision 0208, in place of audit 62's taller of the two), plus, while the keyboard
 * is up, the room an iPhone keeps for its own row (`under`, never part of `barH`) and the keyboard's lift.
 */
export function footRoom(r: { barH: number; aboveH: number; under: number; lift: number }): number {
  return r.barH + r.aboveH + r.under + r.lift;
}
