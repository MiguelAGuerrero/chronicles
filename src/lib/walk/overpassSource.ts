// @layer adapter
import { tileRect } from '../tileMath';
import { OVERPASS_BUSY, OVERPASS_URL, junctionsFromWays, overpassPause, overpassQuery, overpassRuntimeError, retryAfterS, waysFromOverpass } from './overpass';
import type { WalkSource } from './types';

/*
 * The Overpass fallback (WK1b): the network side. A POST whose body is the tile's bounds as a query: no
 * custom headers, key or identifier (WK18). The public instance rate-limits (429), runs out of workers (502,
 * 503), times out (504, or a 200 whose remark is a runtime error) or fails before answering (a throw: offline,
 * or a 502 page the browser hides, a body that isn't JSON, or the reader giving up at its deadline): each pauses
 * every request instead of retrying at once, for longer each time in a row, until a good answer comes (WK4; fix
 * overpass-hardening). Another failure (a 400, a 500) is null without a pause and leaves the streak as it is. Every request sent counts toward OVERPASS_SESSION_CAP, which lasts
 * until the app restarts, so a slow Overture (which falls back here, WK1b) can never turn into a flood. Any
 * failure is `null`, never a tile. One request at a time: the reader's queue guarantees it, and the streak
 * assumes it.
 */

/** The first pause after a busy answer. */
export const RATE_PAUSE_MS = 60_000;
/** Pauses in a row double up to this. */
export const MAX_PAUSE_MS = 16 * 60_000;
/** Requests one app session (until a restart) may send, refused ones too: a few full reads (12 tiles each), far under the instance's guidance. */
export const OVERPASS_SESSION_CAP = 60;

export function createOverpassSource(o: { fetch: typeof fetch; now: () => number; url?: string }): WalkSource {
  let pausedUntil = 0;
  let strikes = 0;
  let asked = 0;
  const busy = (retryAfter: number | null = null) => {
    strikes++;
    pausedUntil = o.now() + overpassPause(strikes, RATE_PAUSE_MS, MAX_PAUSE_MS, retryAfter);
    return null;
  };
  return {
    async read(x, y, signal) {
      if (o.now() < pausedUntil || asked >= OVERPASS_SESSION_CAP) return null;
      asked++;
      const r = tileRect(x, y);
      try {
        const res = await o.fetch(o.url ?? OVERPASS_URL, { method: 'POST', body: `data=${encodeURIComponent(overpassQuery(r.s, r.w, r.n, r.e))}`, signal });
        if (OVERPASS_BUSY.includes(res.status)) return busy(retryAfterS(res.headers?.get?.('retry-after'), o.now()));
        if (!res.ok) return null;
        const json = await res.json();
        if (overpassRuntimeError(json)) return busy();
        strikes = 0;
        const ways = waysFromOverpass(json);
        return { x, y, from: 'overpass', ways, junctions: junctionsFromWays(ways) };
      } catch {
        // Offline, a page the browser hides, a body that isn't JSON, or the reader giving up at its deadline: the
        // reader's deadline is the only abort there is, and it means the instance was too slow (audit 7).
        return busy();
      }
    },
  };
}
