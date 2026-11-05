// @layer view
import { useEffect, useRef } from 'react';
import { tilesNear } from '../tileMath';
import type { LngLat } from '../types';
import { useStore } from '../useStore';
import { alongRoute, carStretches, warningLine } from './ahead';
import { routeSegments } from './layer';
import { MAX_TILES } from './limits';
import { aheadWatch, walkBuild, walkReader } from './walkApp';

/** Tiles within this of the route are read (WK4): the street under it and the footways beside. */
const ROUTE_TILE_M = 100;

/**
 * The quiet heads-up ahead of a stretch built around cars (WK15): the line to show, or null. It reads the
 * route's tiles once per route (from the device where kept) and says nothing when there is no data (WK3).
 * It never changes the route (WK16): it takes the route and the walker's position and gives back words.
 */
export function useRouteWarning(route: readonly LngLat[] | null, here: LngLat | null): string | null {
  const key = route && route.length > 1 ? `${route[0].join(',')}>${route[route.length - 1].join(',')}#${route.length}` : null;
  /** The distance last found along this route, so a route that retraces itself is read on the leg being walked. */
  const lastAlong = useRef<number | null>(null);
  useEffect(() => {
    lastAlong.current = null;
    if (!key || !route) {
      aheadWatch.stretches(null, []);
      return;
    }
    // At once, before the tiles are read: the old route's stretches are never judged against the new route's metres
    // (walkability audit 7).
    aheadWatch.route(key);
    let live = true;
    void (async () => {
      const build = await walkBuild().catch(() => null);
      const read = await walkReader.read(tilesNear([...route], ROUTE_TILE_M, MAX_TILES), build ?? 'unknown', () => !live);
      if (!live || !read.tiles.size) return;
      const { segments, bands } = routeSegments(read.tiles);
      aheadWatch.stretches(key, carStretches(route, segments, bands));
    })();
    return () => {
      live = false;
    };
    // The route is read when its ends or length change, not on every new array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    if (key && route && here) {
      const along = alongRoute(route, here, lastAlong.current ?? undefined);
      lastAlong.current = along;
      aheadWatch.at(along);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [here, key]);
  const show = useStore(aheadWatch.store, (s) => s.show);
  return key && show ? warningLine(show) : null;
}
