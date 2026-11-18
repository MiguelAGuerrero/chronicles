// @layer shell
import type { Archive } from '../activity/release';
import { archiveTilesFor, regionUrl, type ArchiveFile } from '../discovery/archiveManifest';
import { boundsOf } from '../geo';
import { TileReader } from '../net/tileReader';
import { tilesIn } from '../tileMath';
import type { LngLat } from '../types';
import { STORES_ZOOM, storesFromFeatures, type PackFeature, type StoresSource } from './storesRead';

/*
 * The stores pack's network side (QC14, QC29): the places archive's manifest names the region's pack, and its z12 tiles are read by the
 * generic tile reader the archive uses (`net/tileReader`), not a second one. Called only after the walker picks an entry; a request is a
 * byte range of the pack's file under the Pages site's base, with no identifier, header or query of its own. Any failure is no stores:
 * `readStores` leaves nothing and says nothing, and the tiles' shops keep serving the same table.
 */
export interface StoresPackDeps {
  /** The manifest's pack for a point and the pass-over of a missing file: the places archive's own (`discovery/archive/shell.ts`). */
  manifest: {
    storesFileAt(at: LngLat): Promise<ArchiveFile | null>;
    storesMissing(file: string): void;
  };
  io: {
    base: string;
    open(url: string): Archive;
    decode(bytes: ArrayBuffer, x: number, y: number): (PackFeature & { id: string })[];
  };
  tileMs?: number;
  readMs?: number;
}

export function createStoresPack(d: StoresPackDeps): StoresSource {
  const reader = new TileReader<PackFeature & { id: string }>({
    open: (file) => d.io.open(regionUrl(d.io.base, file)),
    decode: d.io.decode,
    zoom: STORES_ZOOM,
    tileMs: d.tileMs ?? 15_000,
    readMs: d.readMs ?? 20_000,
  });
  return {
    async read(at: LngLat, radiusM: number) {
      const file = await d.manifest.storesFileAt(at);
      if (!file) return [];
      const r = await reader.read(file.file, archiveTilesFor(tilesIn(boundsOf([at], radiusM)!)));
      if (!r.ok) {
        if (r.missing) d.manifest.storesMissing(file.file);
        return [];
      }
      return storesFromFeatures(r.items);
    },
  };
}
