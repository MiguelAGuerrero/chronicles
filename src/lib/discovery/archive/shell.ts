// @layer shell
import type { Archive } from '../../activity/release';
import type { TileFeature } from '../../areas/tilePlaces';
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
  let manifest: Manifest | null = null;
  let failedAt: number | null = null;
  let recheck = false;
  /** Files the manifest listed that answered 403/404 this session, and those the manifest was read again for (audit 4). */
  const missing = new Set<string>();
  const rechecked = new Set<string>();
  const usable = (region: { current: { file: string; version: string }; previous: { file: string; version: string }[] }) =>
    [region.current, ...region.previous].find((f) => !missing.has(f.file)) ?? null;
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
      // Direct getMeta/setMeta, so the meta scan sees the keys (meta.test.ts; declared in META).
      const kept = await p.db.getMeta('places_archive_manifest');
      manifest = kept ? parseManifest(kept) : null;
    }
    const checkedAt = Number(await p.db.getMeta('places_archive_checked_at')) || null;
    if (recheck || manifestDue(checkedAt, failedAt, now)) {
      try {
        const text = await p.io.fetchText(regionUrl(p.io.base, 'manifest.json'));
        const m = parseManifest(text);
        if (m) {
          manifest = m;
          await p.db.setMeta('places_archive_manifest', text);
        }
        await p.db.setMeta('places_archive_checked_at', String(now));
        failedAt = null;
        recheck = false;
      } catch {
        failedAt = now;
      }
    }
    return manifest;
  }

  return {
    /** Loads the manifest when it is due (at most daily), so the version is known before any read (places-worth-the-stop audit 3). */
    async refresh(): Promise<void> {
      if (p.io.base) await ensureManifest().catch(() => null);
    },
    /** PW10: the version the loaded manifest names for a point; null before it is read, outside every region, or with no address. */
    versionAt(at: LngLat): string | null {
      if (!p.io.base || !manifest) return null;
      const region = pickRegion(manifest, at);
      return region ? (usable(region)?.version ?? null) : null;
    },
    /** PW1-PW3: the archive's places for a read's z14 tiles around `centre`, with the version they came from; null when there are none to read. */
    async read(tiles: [number, number][], centre: LngLat, shouldStop?: () => boolean): Promise<ArchiveRead> {
      if (!p.io.base) return null;
      const m = await ensureManifest().catch(() => null);
      const region = m ? pickRegion(m, centre) : null;
      const file = region ? usable(region) : null;
      if (!file || shouldStop?.()) return null;
      const r = await reader.read(file.file, archiveTilesFor(tiles), shouldStop);
      if (!r.ok) {
        // Listed but missing (Pages lagging, or a newer version replaced it): pass it over for the previous one, and
        // read the manifest again once for it, never on every read (audit 4).
        if (r.missing) {
          missing.add(file.file);
          if (!rechecked.has(file.file)) {
            rechecked.add(file.file);
            recheck = true;
          }
        }
        return null;
      }
      const version = file.version;
      return { version, places: r.items.map(({ id: _id, ...pl }) => ({ ...pl, build: version })) };
    },
  };
}
