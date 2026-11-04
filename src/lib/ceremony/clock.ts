// @layer core
/**
 * One tick of a ceremony's clock (RR7, audits 2 and 6). Held, or paused under
 * a viewer, it stands still. A tick longer than MAX_TICK_MS (a locked screen,
 * a hidden tab, a stall) counts as only that much, so the replay waits rather
 * than skipping to the card. A clock at or past the total ends the ceremony,
 * even a total of 0, or one that shrank under it when the story was rebuilt.
 */
export const MAX_TICK_MS = 250;

export interface CeremonyClockState {
  ms: number;
  held: boolean;
}

export function tickClock(c: CeremonyClockState, dt: number, o: { paused: boolean; total: number }): { clock: CeremonyClockState; end: boolean } {
  if (c.held || o.paused) return { clock: c, end: false };
  if (c.ms >= o.total) return { clock: c, end: true };
  const ms = Math.min(o.total, c.ms + Math.min(MAX_TICK_MS, Math.max(0, dt)));
  return { clock: { ...c, ms }, end: ms >= o.total };
}
