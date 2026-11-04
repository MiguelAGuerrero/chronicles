// @layer core
/**
 * One tick of a ceremony's clock (RR7, audits 2 and 6). Held, or paused under
 * a viewer, it stands still. A tick longer than MAX_TICK_MS (a locked screen,
 * a hidden tab, a stall) counts as only that much, so the replay waits rather
 * than skipping to the card. A clock at or past the total ends the ceremony,
 * even a total of 0, or one that shrank under it when the story was rebuilt.
 */
import type { Showing } from './types';

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

/**
 * Where a rebuilt telling reaches a time of day (audit 22): the first time
 * into it whose clock is at or past `clock`. A story rebuilt mid-path (a
 * moment deleted, Undo, a note's words edited) carries on from the same
 * place, never skipping moments ahead. Needs a clock that never runs back.
 */
export function msAtClock(s: Showing, clock: number): number {
  let lo = 0;
  let hi = s.total;
  for (let k = 0; k < 40 && hi - lo > 1; k++) {
    const mid = (lo + hi) / 2;
    const c = s.frame(mid).clock;
    if (c != null && c < clock) lo = mid;
    else hi = mid;
  }
  return hi >= s.total ? Math.max(0, s.total - 1) : hi;
}

/**
 * Where a rebuilt telling (`next`) takes up from `ms` into the old one
 * (audits 22, 31, 33): the same time of day; where the clock stands still (a
 * stop, a loose moment), as long before it moves on again as there was. A
 * moment deleted from the pile was already shown, so counting from the end of
 * the standing still keeps the place even when an earlier one in it goes.
 */
export function reanchor(old: Showing, next: Showing, ms: number): number {
  if (old === next) return ms;
  const last = Math.max(0, next.total - 1);
  const clock = old.frame(ms).clock;
  if (clock == null) return Math.min(ms, last);
  const left = Math.max(0, msAtClock(old, clock + 1) - ms);
  const start = msAtClock(next, clock);
  const end = msAtClock(next, clock + 1);
  return Math.min(last, Math.max(start, Math.min(end - left, Math.max(start, end - 1))));
}
