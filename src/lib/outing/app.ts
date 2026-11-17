// @layer shell
// @instance: the outing on the device's tiles and the app's ports
import { db } from '../db';
import { fetchTiles } from '../discovery/tileFetch';
import { placesFromTilePois } from '../discovery/tilePois';
import { boundsOf } from '../geo';
import { deriveSegments } from '../streets';
import { tilesIn } from '../tileMath';
import { ports } from '../ports';
import { createOutingPrefs } from './prefs';
import { createOutingService } from './service';

export const outingPrefs = createOutingPrefs(ports);

export const outingService = createOutingService({
  async read(at, radiusM) {
    const [url, build] = await Promise.all([db.getMeta('tile_url'), db.getMeta('tile_build')]);
    if (!url) return null;
    const tiles = tilesIn(boundsOf([at], radiusM + 300)!);
    const f = await fetchTiles(url, tiles);
    const places = placesFromTilePois(f.pois, build ?? '');
    return {
      shops: places.map((p) => ({ name: p.name, at: p.at, classes: p.classes })),
      segments: deriveSegments(f.roads, f.names, build ?? ''),
    };
  },
  // QC14: no pack is published yet; the tiles' shops serve the vocabulary until the manifest names one.
  stores: null,
});
