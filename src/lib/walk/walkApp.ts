// @layer shell
import { PMTiles } from 'pmtiles';
import { ensureOvertureRelease } from '../activity/overture';
import { transportationUrl } from '../activity/release';
import { ports } from '../ports';
import { chain } from './chain';
import { createOverpassSource } from './overpassSource';
import { createOvertureSource } from './overtureSource';
import { createWalkReader } from './reader';

/**
 * Walkability's instance (WK1-WK4): Overture first, Overpass when it can't answer, read through the device's
 * cache. Views call `walkReader.read(tiles, build)` with the Overture release (`ensureOvertureRelease`).
 */
const overture = createOvertureSource({ release: ensureOvertureRelease, open: (r) => new PMTiles(transportationUrl(r)) });
const overpass = createOverpassSource({ fetch: (...a) => fetch(...a), now: () => Date.now() });

export const walkReader = createWalkReader(ports, chain(overture, overpass));
export { ensureOvertureRelease as walkBuild };
