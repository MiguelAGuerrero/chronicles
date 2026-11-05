// @layer adapter
import { tileRect } from '../tileMath';
import { OVERPASS_URL, overpassQuery, waysFromOverpass } from './overpass';
import type { WalkSource } from './types';

/*
 * The Overpass fallback (WK1b): the network side. A POST whose body is the tile's bounds as a query: no
 * custom headers, key or identifier (WK18). Public instances rate-limit (429) and time out (504): either
 * pauses every request for RATE_PAUSE_MS instead of retrying at once (WK4). Any failure is `null`.
 */

export const RATE_PAUSE_MS = 60_000;

export function createOverpassSource(o: { fetch: typeof fetch; now: () => number; url?: string }): WalkSource {
  let pausedUntil = 0;
  return {
    async read(x, y, signal) {
      if (o.now() < pausedUntil) return null;
      const r = tileRect(x, y);
      try {
        const res = await o.fetch(o.url ?? OVERPASS_URL, { method: 'POST', body: `data=${encodeURIComponent(overpassQuery(r.s, r.w, r.n, r.e))}`, signal });
        if (res.status === 429 || res.status === 504) {
          pausedUntil = o.now() + RATE_PAUSE_MS;
          return null;
        }
        if (!res.ok) return null;
        return { x, y, from: 'overpass', ways: waysFromOverpass(await res.json()) };
      } catch {
        return null;
      }
    },
  };
}
