// @layer adapter
import type { OverpassGate } from '../net/overpassGate';
import { tileRect } from '../tileMath';
import { OVERPASS_BUSY, OVERPASS_URL, overpassRuntimeError, retryAfterS } from '../walk/overpass';
import { darkFromOverpass, darkQuery } from './overpass';
import type { DarkSource } from './types';

/*
 * After dark's network side (DK8): a POST whose body is the tile's box as a query, with no custom headers, key or identifier, and
 * never the walker's position. It asks only when the app's one Overpass gate lets it (one back-off, one daily count shared with
 * walkability's fallback, after dark at most DARK_CAP of it). Any failure is null, never a tile; a busy answer pauses the gate.
 */

export function createDarkSource(o: { fetch: typeof fetch; gate: OverpassGate; url?: string; now?: () => number }): DarkSource {
  const now = o.now ?? (() => 0);
  return {
    async read(x, y, signal) {
      if (!o.gate.take('dark')) return null;
      const r = tileRect(x, y);
      try {
        const res = await o.fetch(o.url ?? OVERPASS_URL, { method: 'POST', body: `data=${encodeURIComponent(darkQuery(r.s, r.w, r.n, r.e))}`, signal });
        if (OVERPASS_BUSY.includes(res.status)) {
          o.gate.busy(retryAfterS(res.headers?.get?.('retry-after'), now()));
          return null;
        }
        if (!res.ok) return null;
        const json = await res.json();
        if (overpassRuntimeError(json)) {
          o.gate.busy();
          return null;
        }
        o.gate.ok();
        return { x, y, ...darkFromOverpass(json) };
      } catch {
        // Offline, a page the browser hides, a body that isn't JSON, or the reader giving up at its deadline.
        o.gate.busy();
        return null;
      }
    },
  };
}
