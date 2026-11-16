// @layer adapter
// @instance: the shop pack (shop marks/shell.ts) on the app's ports, read through lib/net
import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import { PMTiles } from 'pmtiles';
import type { TileFeature } from '../areas/tilePlaces';
import { ARCHIVE_ZOOM } from '../discovery/archiveManifest';
import { net } from '../net';
import { ports } from '../ports';
import { createShopMarks } from './shell';

/**
 * SM2: where the shop manifest and packs are served; empty until a pack is published, and then the Shop marks row is not
 * offered and nothing is asked. The e2e build points at `/shop-marks-e2e/` on the harness's server.
 */
export const SHOP_MARKS_BASE = process.env.EXPO_PUBLIC_SHOP_MARKS_BASE ?? '';

/** The pack's `shop marks` layer as features (the record's fields are read by `read.ts`, which drops every other). */
function decode(bytes: ArrayBuffer, x: number, y: number): TileFeature[] {
  const layer = new VectorTile(new PbfReader(new Uint8Array(bytes))).layers.shops;
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

export const shopMarks = createShopMarks({
  ...ports,
  io: { base: SHOP_MARKS_BASE, fetchText, open: (url) => new PMTiles(net.source(url)), decode },
});
