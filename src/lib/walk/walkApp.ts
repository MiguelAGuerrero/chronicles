// @layer shell
import { PMTiles } from 'pmtiles';
import { ensureOvertureRelease, readOverture } from '../activity/overture';
import { transportationUrl } from '../activity/release';
import { ports } from '../ports';
import { createAheadWatch } from './aheadWatch';
import type { PlacePoint } from './cells';
import { chain } from './chain';
import { createOverpassSource } from './overpassSource';
import { createOvertureSource } from './overtureSource';
import { createWalkReader } from './reader';
import { net } from '../net';
import { createOverpassGate } from '../net/overpassGate';

/**
 * Walkability's instance (WK1-WK4): Overture first, Overpass when it can't answer, read through the device's
 * cache. Views call `walkReader.read(tiles, build)` with the Overture release (`ensureOvertureRelease`).
 */
const overture = createOvertureSource({ release: ensureOvertureRelease, open: (r) => new PMTiles(net.source(transportationUrl(r))) });
/** The app's one Overpass gate (DK8): walkability's fallback and after dark share its back-off and its daily count. */
export const overpassGate = createOverpassGate({ now: () => Date.now() });
const overpass = createOverpassSource({ fetch: ((u: RequestInfo | URL, init?: RequestInit) => net.fetch(String(u), init)) as typeof fetch, now: () => Date.now(), gate: overpassGate });

export const walkReader = createWalkReader(ports, chain(overture, overpass));
export { ensureOvertureRelease as walkBuild };

/**
 * UF6, UF17: the places the area already reads (Overture's, by the same tiles and cache as the busy streets), as weighted
 * points; null when they can't be read, and the cells are then judged on form alone.
 */
export async function walkPlaces(tiles: [number, number][], shouldStop?: () => boolean): Promise<PlacePoint[] | null> {
  const got = await readOverture(tiles, shouldStop).catch(() => null);
  return got ? got.points.map((p) => ({ at: p.at, weight: p.weight })) : null;
}


/** The heads-up ahead (WK15): what has been said on this route, and what shows now. */
export const aheadWatch = createAheadWatch(ports);
