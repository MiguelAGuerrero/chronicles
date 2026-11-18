// @layer shell
// @instance: the outing on the device's tiles and the app's ports
import { PMTiles } from 'pmtiles';
import { db } from '../db';
import { placesArchive } from '../discovery/archive';
import { PLACES_BASE } from '../discovery/archiveManifest';
import { net } from '../net';
import { fetchTiles } from '../discovery/tileFetch';
import { placesFromTilePois } from '../discovery/tilePois';
import { boundsOf } from '../geo';
import { deriveSegments } from '../streets';
import { tilesIn } from '../tileMath';
import { ports } from '../ports';
import { createOutingPrefs } from './prefs';
import { createOutingService } from './service';
import { createStoresPack } from './storesPack';
import { decodeStoresTile } from './storesRead';

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
  // QC14, QC29: the stores pack the places archive's manifest names, read by tile and only after an entry is picked; none, or a failed
  // read, leaves the tiles' shops serving the vocabulary.
  stores: createStoresPack({
    manifest: placesArchive,
    io: { base: process.env.EXPO_PUBLIC_PLACES_BASE ?? PLACES_BASE, open: (url) => new PMTiles(net.source(url)), decode: decodeStoresTile },
  }),
});
