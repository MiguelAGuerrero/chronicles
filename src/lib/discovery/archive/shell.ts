// @layer shell
import type { Archive } from '../../activity/release';
import type { TileFeature } from '../../areas/tilePlaces';
import { metaStore } from '../../meta';
import { TileReader } from '../../net/tileReader';
import type { Ports } from '../../ports/types';
import type { LngLat } from '../../types';
import { ARCHIVE_ZOOM, archiveTilesFor, manifestDue, parseManifest, pickRegion, regionUrl, type Manifest } from '../archiveManifest';
import { placesFromArchive } from '../archivePois';
import type { Place } from '../types';

/*
 * The places archive's network side (PW1-PW3, decision 0102): the manifest at most daily, the region holding the
 * read, and the read's z12 tiles from that region's current file through the generic tile reader. Any failure is
 * no archive (PW3): the caller goes on with the map's own places. A factory given its ports and io, so tests run
 * it over fakes; the app's instance is `index.ts`.
 */

export interface ArchiveIo {
  /** Where the manifest and archives are served; empty until PW16 is recorded, and then nothing is asked. */
  base: string;
  fetchText(url: string): Promise<string>;
  open(url: string): Archive;
  decode(bytes: ArrayBuffer, x: number, y: number): TileFeature[];
}

export type ArchiveRead = { version: string; places: Place[] } | null;

export function createPlacesArchive(p: Pick<Ports, 'db' | 'clock'> & { io: ArchiveIo; tileMs?: number; readMs?: number }) {
  const meta = metaStore(p.db);
  let manifest: Manifest | null = null;
  let failedAt: number | null = null;
  let recheck = false;
  const reader = new TileReader<Place & { id: string }>({
    open: (file) => p.io.open(regionUrl(p.io.base, file)),
    // The version is stamped after the read: the reader's decoder sees only the tile.
    decode: (bytes, x, y) => placesFromArchive(p.io.decode(bytes, x, y), '').map((pl) => ({ ...pl, id: pl.key })),
    zoom: ARCHIVE_ZOOM,
    tileMs: p.tileMs ?? 15_000,
    readMs: p.readMs ?? 20_000,
  });

  async function ensureManifest(): Promise<Manifest | null> {
    const now = p.clock.now();
    if (!manifest) {
      const kept = await meta.get('places_archive_manifest');
      manifest = kept ? parseManifest(kept) : null;
    }
    if (recheck || manifestDue(await meta.get('places_archive_checked_at'), failedAt, now)) {
      try {
        const text = await p.io.fetchText(regionUrl(p.io.base, 'manifest.json'));
        const m = parseManifest(text);
        if (m) {
          manifest = m;
          await meta.set('places_archive_manifest', text);
        }
        await meta.set('places_archive_checked_at', now);
        failedAt = null;
        recheck = false;
      } catch {
        failedAt = now;
      }
    }
    return manifest;
  }

  return {
    /** PW1-PW3: the archive's places for a read's z14 tiles around `centre`, with the version they came from; null when there are none to read. */
    async read(tiles: [number, number][], centre: LngLat, shouldStop?: () => boolean): Promise<ArchiveRead> {
      if (!p.io.base) return null;
      const m = await ensureManifest().catch(() => null);
      const region = m ? pickRegion(m, centre) : null;
      if (!region || shouldStop?.()) return null;
      const r = await reader.read(region.current.file, archiveTilesFor(tiles), shouldStop);
      if (!r.ok) {
        // The file the manifest named is gone (a newer version replaced it): read the manifest again next time.
        if (r.missing) recheck = true;
        return null;
      }
      const version = region.current.version;
      return { version, places: r.items.map(({ id: _id, ...pl }) => ({ ...pl, build: version })) };
    },
  };
}
