// @layer shell
import { overpassPause } from '../walk/overpass';

/*
 * The one gate in front of the public Overpass instance (after dark DK8; walkability WK4, fix overpass-hardening). Walkability's
 * fallback and after dark's tiles share one back-off and one daily count, so two layers never ask more than one would have. A busy
 * answer pauses both, for longer each time in a row, until a good answer; every request sent counts toward OVERPASS_SESSION_CAP,
 * which starts over a day after its window's first request; after dark stops at DARK_CAP of it, so walkability's fallback always
 * has the rest. One request at a time across both: each source's reader queues its own, and the streak assumes it.
 */

/** The first pause after a busy answer. */
export const RATE_PAUSE_MS = 60_000;
/** Pauses in a row double up to this. */
export const MAX_PAUSE_MS = 16 * 60_000;
/** Requests one app session may send in a window, refused ones too, for both layers together. */
export const OVERPASS_SESSION_CAP = 60;
/** After dark's share of the cap (DK8, steward S10): walkability's fallback keeps the other twenty. */
export const DARK_CAP = 40;
/** The cap starts over this long after the first request of its window (the owner, Nov 5: daily). */
export const CAP_WINDOW_MS = 24 * 3600_000;

export interface OverpassGate {
  /** Whether `who` may send a request now; a yes counts it. */
  take(who: 'walk' | 'dark'): boolean;
  /** A busy answer (429, 502-504, a runtime error, a throw): pause both, `retryAfterS` honoured. */
  pause(retryAfterS?: number | null): void;
  /** A good answer: the streak starts over. */
  ok(): void;
}

export function createOverpassGate(o: { now: () => number }): OverpassGate {
  let pausedUntil = 0;
  let strikes = 0;
  let asked = 0;
  let dark = 0;
  let windowStart = 0;
  return {
    take(who) {
      const now = o.now();
      if (asked > 0 && now - windowStart >= CAP_WINDOW_MS) {
        asked = 0;
        dark = 0;
      }
      if (now < pausedUntil || asked >= OVERPASS_SESSION_CAP || (who === 'dark' && dark >= DARK_CAP)) return false;
      if (asked === 0) windowStart = now;
      asked++;
      if (who === 'dark') dark++;
      return true;
    },
    pause(retryAfterS = null) {
      strikes++;
      pausedUntil = o.now() + overpassPause(strikes, RATE_PAUSE_MS, MAX_PAUSE_MS, retryAfterS);
    },
    ok() {
      strikes = 0;
    },
  };
}
