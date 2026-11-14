// @layer core
/**
 * Where the journal's capture controls are drawn (JN35, decision 0175): in the row under the open line, or in the
 * bar at the foot. Always one of the two, never both, so the camera and the mic are one tap away in every state.
 */
export type ControlsAt = 'foot' | 'line';

export type Where = {
  /** No page is shown (a thread, the threads, Hidden): the field itself is in the bar (JN28). */
  inBar: boolean;
  /** The sheet has opened: until then the page, and the row on it, are not seen. */
  opened: boolean;
  /** The row under the line is wholly in view (not pulled down out of sight, JN37). */
  rowInView: boolean;
  /** The field has the keyboard: the bar sits on it (JN30, JN36). */
  typing: boolean;
  /** The line's last save failed: "Not kept yet" and Retry are the bar's (JN13, JN39). */
  failed: boolean;
  /** Where a voice note under way was begun: it stays there, so Stop is under the finger that began it (JN38). */
  recordingIn?: ControlsAt | null;
};

/**
 * What the sheet keeps free at its foot (audit 40, 43; chronicle-journal audit 62, 63): the bar's own height or the
 * messages above it, whichever is taller, whether the bar is drawn or not, so the sheet's length never changes as the
 * controls move between the bar and the row; plus, while the keyboard is up, the room an iPhone keeps for its own row
 * (`under`, never part of `barH`) and the keyboard's lift.
 */
export function footRoom(r: { barH: number; aboveH: number; under: number; lift: number }): number {
  return Math.max(r.barH, r.aboveH) + r.under + r.lift;
}

export function controlsAt(w: Where): ControlsAt {
  if (w.inBar || !w.opened || w.typing || w.failed || !w.rowInView || w.recordingIn === 'foot') return 'foot';
  return 'line';
}
