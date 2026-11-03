import { MAX_DERIVE_VIEWS, PLACES_ZOOM } from '../components/map/types';
import { db } from './db';
import { fetchTiles } from './discovery/tileFetch';
import type { Collector } from './finish';
import { boundsOf } from './geo';
import { tileAt, tileRect, tilesIn, tilesNear } from './tileMath';
import type { LngLat } from './types';

/** Place points are read this far around the walk's middle, as the map's own wide read covers about a z10 view. */
const PLACES_M = 10_000;
/** Streets are read this far around the walk, as `walkBounds` pads it. */
const NEAR_M = 150;

/**
 * A snap's reads done in code from the tiles, with no camera moves (Filling
 * gaps, G12): a decision on the replay card snaps the walk again while the
 * map stays as it is. Decoded tiles give the same street ids as the map's
 * read (tileDecode). Each view is one z14 tile; any failure rejects, and the
 * snap waits for the next replay.
 */
export function tileCollector(): Collector {
  const url = () => db.getMeta('tile_url').then((u) => {
    if (!u) throw new Error('No tile URL yet');
    return u;
  });
  return {
    // The tiles along the walk, at most as many as the map's own read takes (audit 6).
    plan: (_bounds, trace) =>
      tilesNear(trace, NEAR_M, MAX_DERIVE_VIEWS).map(([x, y]) => {
        const r = tileRect(x, y);
        return [(r.w + r.e) / 2, (r.s + r.n) / 2] as LngLat;
      }),
    collect: async (centers) => {
      const tiles = [...new Map(centers.map((c) => tileAt(c)).map((r) => [`${r.x},${r.y}`, [r.x, r.y] as [number, number]])).values()];
      return fetchTiles(await url(), tiles);
    },
    collectPlaces: async (center) => {
      const f = await fetchTiles(await url(), tilesIn(boundsOf([center], PLACES_M)!, PLACES_ZOOM), PLACES_ZOOM).catch(() => null);
      return f ? f.places : null;
    },
  };
}
