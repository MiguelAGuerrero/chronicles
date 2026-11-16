// @layer shell
import type { Archive } from '../activity/release';
import type { TileFeature } from '../areas/tilePlaces';
import { ARCHIVE_ZOOM, archiveTilesFor, manifestDue, parseManifest, pickRegion, regionUrl, type ArchiveFile, type Manifest } from '../discovery/archiveManifest';
import { TileReader } from '../net/tileReader';
import type { Ports } from '../ports/types';
import type { LngLat } from '../types';
import { storefrontsFromTile, type Storefront } from './read';

/*
 * The storefront pack's network side (SF6, SF7, decision 0108's interface, as the places archive's, specs/storefronts): the
 * manifest at most daily, the region holding the read, and the read's z12 tiles from that region's current file through the
 * generic tile reader. Nothing is stored but the manifest and when it was checked (SF6, SF18): the places live for the
 * session and never enter the place cache. A factory given its ports and io, so tests run it over fakes; the app's instance is
 * `index.ts`.
 */

export interface StorefrontIo {
  /** The folder the manifest and packs are served from; empty asks for nothing (the layer is then not offered, SF2). */
  base: string;
  fetchText(url: string): Promise<string>;
  open(url: string): Archive;
  decode(bytes: ArrayBuffer, x: number, y: number): TileFeature[];
}

/** SF7: why a read gave what it gave: places, a covered area with none, no region over the map, or a read that failed. */
export type StorefrontState = 'ok' | 'empty' | 'uncovered' | 'failed';
export interface StorefrontRead {
  state: StorefrontState;
  places: Storefront[];
}

const NONE = (state: StorefrontState): StorefrontRead => ({ state, places: [] });
const PREFIX = 'storefronts';

export function createStorefronts(p: Pick<Ports, 'db' | 'clock'> & { io: StorefrontIo; tileMs?: number; readMs?: number }) {
  let manifest: Manifest | null = null;
  let failedAt: number | null = null;
  let recheck = false;
  const missing = new Set<string>();
  const rechecked = new Set<string>();
  const usable = (region: { current: ArchiveFile; previous: ArchiveFile[] }) => [region.current, ...region.previous].find((f) => !missing.has(f.file)) ?? null;
  const reader = new TileReader<Storefront & { id: string }>({
    open: (file) => p.io.open(regionUrl(p.io.base, file)),
    decode: (bytes, x, y) => storefrontsFromTile(p.io.decode(bytes, x, y)).map((s) => ({ ...s, id: `${s.type}|${s.name}|${s.at[0]}|${s.at[1]}` })),
    zoom: ARCHIVE_ZOOM,
    tileMs: p.tileMs ?? 15_000,
    readMs: p.readMs ?? 20_000,
  });

  async function ensureManifest(): Promise<Manifest | null> {
    const now = p.clock.now();
    if (!manifest) {
      // Direct getMeta/setMeta, so the meta scan sees the keys (meta.test.ts; declared in META).
      const kept = await p.db.getMeta('storefronts_manifest');
      manifest = kept ? parseManifest(kept, PREFIX) : null;
    }
    const checkedAt = Number(await p.db.getMeta('storefronts_checked_at')) || null;
    if (recheck || manifestDue(checkedAt, failedAt, now)) {
      try {
        const text = await p.io.fetchText(regionUrl(p.io.base, 'manifest.json'));
        const m = parseManifest(text, PREFIX);
        if (m) {
          manifest = m;
          await p.db.setMeta('storefronts_manifest', text);
        }
        await p.db.setMeta('storefronts_checked_at', String(now));
        failedAt = null;
        recheck = false;
      } catch {
        failedAt = now;
      }
    }
    return manifest;
  }

  return {
    /** Loads the manifest when it is due, so a layer knows whether a pack exists before the first read. */
    async refresh(): Promise<void> {
      if (p.io.base) await ensureManifest().catch(() => null);
    },
    /** SF6, SF7: the storefronts for a read's z14 tiles around `centre`; never throws, and says which of four things it is. */
    async read(tiles: [number, number][], centre: LngLat, shouldStop?: () => boolean): Promise<StorefrontRead> {
      if (!p.io.base) return NONE('uncovered');
      const m = await ensureManifest().catch(() => null);
      if (!m) return NONE('failed');
      const region = pickRegion(m, centre);
      if (!region) return NONE('uncovered');
      const file = usable(region);
      if (!file || shouldStop?.()) return NONE('failed');
      const r = await reader.read(file.file, archiveTilesFor(tiles), shouldStop);
      if (!r.ok) {
        // Listed but missing: pass it over for the previous one, and read the manifest again once for it.
        if (r.missing) {
          missing.add(file.file);
          if (!rechecked.has(file.file)) {
            rechecked.add(file.file);
            recheck = true;
          }
        }
        return NONE('failed');
      }
      const places = r.items.map(({ id: _id, ...s }) => s);
      return { state: places.length ? 'ok' : 'empty', places };
    },
  };
}
