// @layer shell
// @instance: the outing on the device's tiles and the app's ports
import { PMTiles } from 'pmtiles';
import { db } from '../db';
import { placesArchive } from '../discovery/archive';
import { PLACES_BASE } from '../discovery/archiveManifest';
import { net } from '../net';
import { fetchTiles } from '../discovery/tileFetch';
import { placesFromTilePois } from '../discovery/tilePois';
import { loadSettings } from '../explore/settings';
import { outlines } from '../areas/outlineReader';
import { boundsOf, withoutPauses } from '../geo';
import { deriveSegments } from '../streets';
import { tilesIn } from '../tileMath';
import { ports } from '../ports';
import { createOutingPrefs } from './prefs';
import { readTrace } from '../rides';
import { createOutingService } from './service';
import { walksNear } from './visited';
import { placeCandidates } from './sources';
import { createStoresPack } from './storesPack';
import { decodeStoresTile } from './storesRead';

export const outingPrefs = createOutingPrefs(ports);

export const outingService = createOutingService({
  async read(at, radiusM) {
    const [url, build] = await Promise.all([db.getMeta('tile_url'), db.getMeta('tile_build')]);
    if (!url) return null;
    const tiles = tilesIn(boundsOf([at], radiusM + 300)!);
    const [f, settings, finds, archive] = await Promise.all([fetchTiles(url, tiles), loadSettings(), db.listFinds(), placesArchive.read(tiles, at).catch(() => null)]);
    // The tiles' own places, and the places archive's beside them (one place once, by its key).
    const own = placesFromTilePois(f.pois, build ?? '');
    const keys = new Set(own.map((p) => p.key));
    const places = [...own, ...(archive?.places ?? []).filter((p) => !keys.has(p.key))];
    return {
      // OJ38, OJ40: the attractions Explore could mark, of the kinds switched on; one not found yet keeps its name for arrival.
      spots: placeCandidates(places, settings.hidden, new Set(finds.map((x) => x.key))),
      shops: places.map((p) => ({ name: p.name, at: p.at, classes: p.classes })),
      segments: deriveSegments(f.roads, f.names, build ?? ''),
    };
  },
  // OJ47: the walked fixes of the outings that were near, read as every trace is (its start, pauses and stills), and Explore's range.
  async walkedNear(at) {
    const [rows, walks, settings] = await Promise.all([db.listWalkAreas(), db.listWalks(), loadSettings()]);
    const byId = new Map(walks.map((w) => [w.id, w]));
    const fixes: { lon: number; lat: number }[] = [];
    for (const id of walksNear(rows, at)) {
      const walk = byId.get(id);
      if (!walk) continue;
      const [pauses, stills, points] = await Promise.all([db.getPauses(id), db.getStills(id).catch(() => []), db.getPoints(id)]);
      for (const f of readTrace(withoutPauses(points, pauses), walk.started_at, pauses, stills).walked) fixes.push({ lon: f.lon, lat: f.lat });
    }
    return { fixes, rangeM: settings.rangeM };
  },
  // QC14, QC29: the stores pack the places archive's manifest names, read by tile and only after an entry is picked; none, or a failed
  // read, leaves the tiles' shops serving the vocabulary.
  stores: createStoresPack({
    manifest: placesArchive,
    io: { base: process.env.EXPO_PUBLIC_PLACES_BASE ?? PLACES_BASE, open: (url) => new PMTiles(net.source(url)), decode: decodeStoresTile },
  }),
});

/** OJ42: the towns of every recorded outing, so a town not among them can be looked at first. */
export async function walkedTowns(): Promise<{ name: string; at: [number, number] }[]> {
  const walks = await db.listWalks();
  return outlines.townsOf(walks.map((w) => w.id));
}
