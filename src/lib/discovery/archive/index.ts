// @layer shell
// @instance: the places archive (discovery/archive/shell.ts) on the app's ports, read through lib/net
import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import { PMTiles } from 'pmtiles';
import type { TileFeature } from '../../areas/tilePlaces';
import { net } from '../../net';
import { ports } from '../../ports';
import { ARCHIVE_ZOOM, PLACES_BASE } from '../archiveManifest';
import { createPlacesArchive } from './shell';

/** The archive's `places` layer as features (the schema itself is read by `archivePois.ts`). */
function decode(bytes: ArrayBuffer, x: number, y: number): TileFeature[] {
  const layer = new VectorTile(new PbfReader(new Uint8Array(bytes))).layers.places;
  if (!layer) return [];
  const out: TileFeature[] = [];
  for (let i = 0; i < layer.length; i++) {
    const f = layer.feature(i).toGeoJSON(x, y, ARCHIVE_ZOOM);
    out.push({ geometry: f.geometry as TileFeature['geometry'], properties: (f.properties ?? {}) as Record<string, unknown> });
  }
  return out;
}

async function fetchText(url: string): Promise<string> {
  const res = await net.fetch(url, { signal: AbortSignal.timeout(8000), credentials: 'omit', referrerPolicy: 'no-referrer' });
  if (!res.ok) throw new Error(`Bad response code: ${res.status}`);
  return res.text();
}

export const placesArchive = createPlacesArchive({
  ...ports,
  io: {
    // The e2e build serves its own archive; the app's address stays empty until PW16 is recorded.
    base: process.env.EXPO_PUBLIC_PLACES_BASE ?? PLACES_BASE,
    fetchText,
    open: (url) => new PMTiles(net.source(url)),
    decode,
  },
});
