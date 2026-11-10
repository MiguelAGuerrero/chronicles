// @layer core
/** The room Respond keeps from what it stands over, the moment or the keyboard. */
export const RESPOND_GAP = 12;

/**
 * Where Respond stands (fix respond-bottom), as a distance up from the screen's foot: just above the moment it answers
 * (`foot`, its strip or card), or above the keyboard while a reply is written, whichever is higher, never the two added
 * (audit 2). It never rises past `topClear` (under the viewer's top buttons and its thread chip) with a long note under
 * it (audit 1), except to stay above the keyboard: the note being written must stay in view.
 */
export function respondLift(p: { foot: number; keyboard: number; window: number; topClear: number; bar: number }): number {
  const above = Math.max(p.foot, p.keyboard) + RESPOND_GAP;
  const ceiling = p.window - p.topClear - p.bar;
  return Math.max(p.keyboard + RESPOND_GAP, Math.min(above, ceiling));
}
