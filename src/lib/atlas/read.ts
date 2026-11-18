// @layer shell
// @instance: the atlas's reads (atlas/readShell.ts) on the app's ports, tiles, outlines, Overture and archive
import { readOverture } from '../activity/overture';
import { outlines } from '../areas/outlineReader';
import { placesArchive } from '../discovery/archive';
import { fetchTileBodies, fetchTiles } from '../discovery/tileFetch';
import { exploreBusy } from '../explore/exploreRun';
import { offPage } from '../landing/runOffPage';
import { ports } from '../ports';
import { createAtlasRead } from './readShell';

export { profileFrom, type Extent } from './profile';

export const { nearReads, readNear, readRing, atlasBusy } = createAtlasRead({
  ...ports,
  io: { outlines, fetchTiles, fetchTileBodies, readOverture, archive: placesArchive, ring: (input) => offPage.ring(input), exploreBusy },
});
