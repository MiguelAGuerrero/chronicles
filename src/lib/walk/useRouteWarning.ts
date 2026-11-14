// @layer view
import { useEffect, useRef, useState } from 'react';
import { tilesNear } from '../tileMath';
import type { LngLat } from '../types';
import { useStore } from '../useStore';
import { alongRoute, areaStretches, carStretches, mergeStretches, warningLine, type Stretch } from './ahead';
import { aheadReads, headsUp, unlitStretches, watchKeys } from '../dark/ahead';
import { darkApp } from '../dark/darkApp';
import { isDark } from '../dark/sun';
import { cellsFor } from './cells';
import { routeSegments } from './layer';
import { MAX_TILES } from './limits';
import { aheadWatch, walkBuild, walkPlaces, walkReader } from './walkApp';

/** Tiles within this of the route are read (WK4): the street under it, the footways beside, and a cell's whole neighbourhood (UF1). */
const ROUTE_TILE_M = 500;

/**
 * The quiet heads-up ahead of a stretch built around cars (WK15): the line to show, or null. It reads the
 * route's tiles once per route (from the device where kept) and says nothing when there is no data (WK3).
 * It never changes the route (WK16): it takes the route and the walker's position and gives back words.
 */
export function useRouteWarning(route: readonly LngLat[] | null, here: LngLat | null, on: { walk: boolean; dark: boolean }): { line: string; kind: Stretch['kind'] } | null {
  // Only while a layer that speaks is on (the owner's call, 2026-11-05; after dark DK13): the walker asked for the information, and no
  // route tile is read otherwise (the vision review S2, S3). After dark's unlit line only between sunset and sunrise (DK10),
  // judged at the route's start when it is read.
  const start = route && route.length > 1 ? route[0] : null;
  // The clock, looked at each minute while After dark is on, so a walk that goes on past sunset starts to hear it.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!on.dark) return;
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [on.dark]);
  const plan = headsUp({ walkOn: on.walk, darkOn: on.dark, dark: start ? isDark(start, now) : false });
  const reads = `${plan.readWalk ? 'w' : ''}${plan.readDark ? 'd' : ''}`;
  const keys = reads && route && route.length > 1 ? watchKeys(route, reads) : null;
  // The read's key holds what is read; the heads-up remembers lines by the route alone, so sunset never clears one (after-dark audit 5).
  const key = keys?.read ?? null;
  const watchKey = keys?.watch ?? null;
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
    aheadWatch.route(watchKey);
    let live = true;
    const reads = key.slice(key.lastIndexOf('|') + 1);
    const readWalk = reads.includes('w');
    const readDark = reads.includes('d');
    const tiles = tilesNear([...route], ROUTE_TILE_M, MAX_TILES);
    // Walkability's stretches go on as soon as they are had; the after-dark read never holds them (after-dark audit 2).
    void aheadReads(
      {
        walk: readWalk
          ? async () => {
              const build = await walkBuild().catch(() => null);
              const read = await walkReader.read(tiles, build ?? 'unknown', () => !live);
              if (!live || !read.tiles.size) return [];
              const { segments, bands } = routeSegments(read.tiles);
              // Two reasons to speak (UF15): a stretch of fast road, and ground built around cars the route enters.
              const places = await walkPlaces(tiles, () => !live);
              if (!live) return [];
              const areas = areaStretches(route, cellsFor(read.tiles, read.junctions, places));
              return mergeStretches(carStretches(route, segments, bands), areas);
            }
          : null,
        // After dark (DK10): streets mapped as unlit, said only where walkability has nothing to say.
        dark: readDark ? async () => unlitStretches(route, (await darkApp.reader.read(tiles, () => !live)).tiles.flatMap((t) => t.ways)) : null,
      },
      (list) => {
        if (live) aheadWatch.stretches(watchKey, list);
      },
    );
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
  return key && show ? { line: warningLine(show), kind: show.kind } : null;
}
