// @layer adapter
import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import { PMTiles } from 'pmtiles';
import { ensureOvertureRelease } from '../activity/overture';
import { overtureDivisionsUrl } from '../activity/release';
import { outlineTileFrom } from './divisionTiles';
import type { OutlineSource } from './outlineRead';
import { OUTLINE_ZOOM } from './outlines';
import type { TileFeature } from './tilePlaces';

/*
 * Town outlines from Overture's divisions (TO1, decision 0082): the network
 * side. One release's divisions.pmtiles, read by byte range at z12, with no
 * key and nothing about the user, from the bucket the places come from
 * (decision 0080). The release is the one the places reader follows.
 */

/** One tile's read gives up after this. */
const TILE_MS = 15_000;

let archive: { release: string; file: PMTiles } | null = null;
const fileFor = (release: string) => {
  if (archive?.release !== release) archive = { release, file: new PMTiles(overtureDivisionsUrl(release)) };
  return archive.file;
};

function decode(bytes: ArrayBuffer, x: number, y: number) {
  const vt = new VectorTile(new PbfReader(new Uint8Array(bytes)));
  const layer = (id: string): TileFeature[] => {
    const l = vt.layers[id];
    const out: TileFeature[] = [];
    for (let i = 0; l && i < l.length; i++) {
      const f = l.feature(i).toGeoJSON(x, y, OUTLINE_ZOOM);
      out.push({ geometry: f.geometry as TileFeature['geometry'], properties: (f.properties ?? {}) as Record<string, unknown> });
    }
    return out;
  };
  return { division_area: layer('division_area'), division: layer('division') };
}

export const overtureOutlines: OutlineSource = {
  release: () => ensureOvertureRelease(),
  async tile(release, x, y) {
    const file = fileFor(release);
    const ctl = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const t = await Promise.race([
        file.getZxy(OUTLINE_ZOOM, x, y, ctl.signal),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            ctl.abort();
            reject(new Error('timeout'));
          }, TILE_MS);
        }),
      ]);
      // No tile: open sea, or past the archive's reach. Nothing there is a town.
      return outlineTileFrom(x, y, release, 0, t ? decode(t.data, x, y) : {});
    } catch (e) {
      // pmtiles keeps a failed header for good: the next read opens the archive afresh.
      if (archive?.file === file) archive = null;
      throw e;
    } finally {
      clearTimeout(timer);
    }
  },
};
