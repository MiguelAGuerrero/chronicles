// @layer core
/**
 * One tick of a ceremony's clock (RR7, audits 2 and 6). Held, or paused under
 * a viewer, it stands still. A tick longer than MAX_TICK_MS (a locked screen,
 * a hidden tab, a stall) counts as only that much, so the replay waits rather
 * than skipping to the card. A clock at or past the total ends the ceremony,
 * even a total of 0, or one that shrank under it when the story was rebuilt.
 */
import type { Jump, Landing, Showing } from './types';

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

/** A press of Next moves the time and nothing else: a held replay stays held (RY15), and a wait never stops it (RY16). */
export function seekClock(c: CeremonyClockState, ms: number): CeremonyClockState {
  return { ...c, ms: Math.max(0, ms) };
}

/**
 * Where a press of Next goes (RY13, RY17): the landing of the first moment that has not begun, never back in time.
 * `aimed` is the moment the last press went to: until it has begun, the next press goes to the one after, so two
 * presses are two moments. Null when no moment lies ahead.
 */
export function nextStop(stops: Landing[], ms: number, aimed: number | null = null): { ms: number; t0: number } | null {
  const from = aimed != null && aimed > ms ? aimed : ms;
  const s = stops.find((x) => x.t0 > from);
  return s ? { ms: Math.max(ms, s.land), t0: s.t0 } : null;
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

/**
 * The replay's time as its frame loop keeps it (replay ceremony RC5-RC8, decision 0206): the time into the telling it
 * was last read against, held or not, ended or not, the last press of Next, and when its last frame was taken on the
 * caller's own clock (`at`; null before the first). One `requestAnimationFrame` loop owns it, outside the screen's
 * rendering (`components/ceremony/useCeremonyLoop`); every decision about it is here, with the time as an argument.
 */
export interface LoopState {
  epoch: number;
  ms: number;
  held: boolean;
  ended: boolean;
  showing: Showing | null;
  /** The moment the last press of Next went to, and the press itself (RY13, RY21). */
  aimed: number | null;
  jump: Jump | null;
  at: number | null;
}

/** A display frame may come this much early and still be drawn: a 60 Hz screen's frames are 16 to 17 ms apart, never exactly a sixtieth. */
const FRAME_SLACK_MS = 4;

/** A beat from its start: the time restarts at each new epoch (the beat's start), not held. */
export const freshLoop = (epoch: number, showing: Showing | null): LoopState => ({ epoch, ms: 0, held: false, ended: false, showing, aimed: null, jump: null, at: null });

/**
 * The loop read against the telling on screen: afresh when the epoch moved on (Watch again, the path after the fog);
 * re-anchored when the telling was rebuilt mid-path (a moment deleted, Undo, a note edited: the same time of day,
 * `reanchor`), its last press forgotten, since it said nothing of the new times; itself otherwise.
 */
export function loopAgainst(c: LoopState, epoch: number, showing: Showing | null): LoopState {
  if (c.epoch !== epoch) return freshLoop(epoch, showing);
  if (c.showing && showing && c.showing !== showing) return { ...c, ms: reanchor(c.showing, showing, c.ms), showing, aimed: null, jump: null };
  return c.showing === showing ? c : { ...c, showing };
}

/**
 * One display frame at `now` (the caller's clock, ms). The same state back means the frame is not taken: it came
 * sooner than `frameMs` after the last one (the engine's ceiling on frames a second, RC6; 0 takes every frame).
 * A frame that is taken moves the time by what really passed since the last (RC5), as `tickClock` counts it: nothing
 * while held or paused, a quarter second at most, never past the total. `end` is said once, the frame the time is up.
 */
export function stepLoop(c: LoopState, now: number, o: { paused: boolean; total: number; frameMs: number }): { state: LoopState; end: boolean } {
  if (c.at != null && o.frameMs > 0 && now >= c.at && now - c.at < o.frameMs - FRAME_SLACK_MS) return { state: c, end: false };
  const { clock, end } = tickClock(c, c.at == null ? 0 : now - c.at, o);
  return { state: { ...c, ms: clock.ms, at: now, ended: c.ended || end }, end: end && !c.ended };
}

/** Hold, or go on (RR7). */
export const holdLoop = (c: LoopState): LoopState => ({ ...c, held: !c.held });

/** A moment lies ahead (RY17). */
export const loopCanNext = (c: LoopState): boolean => !c.ended && !!c.showing && nextStop(c.showing.stops, c.ms, c.aimed) != null;

/** A press of Next (RY13-RY17): to the next moment's landing, held staying held; the same state when none lies ahead. */
export function nextLoop(c: LoopState): LoopState {
  const to = c.showing && !c.ended ? nextStop(c.showing.stops, c.ms, c.aimed) : null;
  return to ? { ...c, ...seekClock(c, to.ms), aimed: to.t0, jump: { from: c.ms, at: to.ms } } : c;
}

/**
 * The least time between two frames the replay draws (RC6): the engine's own number (`REPLAY_ENGINE.frameMs`), or what
 * a replay's link asks as whole frames a second (`fps`, 5 to 120), so a ceiling can be tried on a phone without a build.
 */
export function frameMsFor(token: number, asked?: string | null): number {
  const fps = asked == null || !/^\d{1,3}$/.test(asked) ? NaN : Number(asked);
  return fps >= 5 && fps <= 120 ? 1000 / fps : token;
}
