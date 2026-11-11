// @layer shell
// @instance: complexes on the app's db and Overture's tiles through the app's network policy
import { PMTiles } from 'pmtiles';
import { buildingsUrl, overtureUrl } from '../activity/release';
import { db } from '../db';
import { net } from '../net';
import { createOvertureSource } from './overtureReader';
import { createComplexes } from './shell';

/** A `buildings` tile is 0.35 to 0.9 MB: more time than a places tile gets. */
const TILE_MS = 25_000;
const READ_MS = 60_000;

export const complexes = createComplexes({
  source: createOvertureSource({ open: (release, file) => new PMTiles(net.source(file === 'buildings' ? buildingsUrl(release) : overtureUrl(release))), tileMs: TILE_MS, readMs: READ_MS }),
  store: db,
  now: () => Date.now(),
});
