// @layer shell
import type { Archive } from '../activity/release';
import { regionUrl, type ArchiveFile } from '../discovery/archiveManifest';
import type { Bounds } from '../geo';
import { TileReader } from '../net/tileReader';
import type { LngLat } from '../types';
import { fixturesFromFeatures, fixtureTiles, FIXTURES_ZOOM, inBounds, type FixturesSource, type PackFeature } from './read';

/*
 * The fixtures pack's network side (TF14, TF21): the places archive's manifest names the region's pack, and its z12 tiles
 * are read by the generic tile reader the archive uses (`net/tileReader`), not a second one. A request is a byte range of
 * the pack's file under the Pages site's base, with no identifier, header or query of its own. Only a view's own tiles are
 * read, at most FIXTURE_TILES_MAX of them, and a read stops when told to. Any failure is no fixtures. Nothing is stored.
 * No screen calls it yet (G13 built the data set; the card's line and the map's layer come after, TF6-TF13).
 */
export interface FixturesPackDeps {
  /** The manifest's pack for a point and the pass-over of a missing file: the places archive's own (`discovery/archive/shell.ts`). */
  manifest: {
    fixturesFileAt(at: LngLat): Promise<ArchiveFile | null>;
    fixturesMissing(file: string): void;
  };
  io: {
    base: string;
    open(url: string): Archive;
    decode(bytes: ArrayBuffer, x: number, y: number): (PackFeature & { id: string })[];
  };
  tileMs?: number;
  readMs?: number;
}

export function createFixturesPack(d: FixturesPackDeps): FixturesSource {
  const reader = new TileReader<PackFeature & { id: string }>({
    open: (file) => d.io.open(regionUrl(d.io.base, file)),
    decode: d.io.decode,
    zoom: FIXTURES_ZOOM,
    tileMs: d.tileMs ?? 15_000,
    readMs: d.readMs ?? 20_000,
  });
  return {
    async read(bounds: Bounds, shouldStop?: () => boolean) {
      const tiles = fixtureTiles(bounds);
      if (!tiles || !d.io.base || shouldStop?.()) return [];
      const file = await d.manifest.fixturesFileAt([(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2]);
      if (!file || shouldStop?.()) return [];
      const r = await reader.read(file.file, tiles, shouldStop);
      if (!r.ok) {
        if (r.missing) d.manifest.fixturesMissing(file.file);
        return [];
      }
      return fixturesFromFeatures(r.items).filter((f) => inBounds(bounds, f.at));
    },
  };
}
