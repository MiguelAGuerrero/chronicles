// @layer shell
// @instance: the road engine on the map's own tiles
import { db } from '../db';
import { decodeTile } from '../discovery/tileDecode';
import { fetchTileBodies } from '../discovery/tileFetch';
import { createRoads } from './service';
import { createTileRoads } from './tilesSource';

const pause = () => new Promise<void>((r) => setTimeout(r, 0));

export const roads = createRoads({
  source: createTileRoads({
    async bodies(tiles, zoom, shouldStop) {
      const url = await db.getMeta('tile_url');
      if (!url) throw new Error('No tiles yet');
      return fetchTileBodies(url, tiles, zoom, shouldStop);
    },
    decode: (bytes, z, x, y) => decodeTile(bytes, z, x, y, ['roads']).roads,
    pause,
  }),
  pause,
});
