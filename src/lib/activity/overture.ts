import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import { PMTiles } from 'pmtiles';
import type { TileFeature } from '../areas/tilePlaces';
import { db } from '../db';
import { activityFromOverture, overturePlacesFromTile, type ActivityPoint, type OverturePlace } from './points';
import { newestRelease, overtureUrl, releaseDue, releasesListUrl, TileMemo } from './release';

/*
 * Overture Maps Places, read by tile (AD3-AD8): the network side. Each read
 * asks for the z14 tiles it covers out of the release's one PMTiles file, by
 * byte range, with no key and nothing about the user. Any failure leaves the
 * read to OpenStreetMap alone (AD7). Places are never stored: only what is
 * measured from them.
 */

const LIST_MS = 8000;
const TILE_MS = 15_000;
/** After a failed release check, the next waits this long, so an offline read isn't held up each time. */
const RETRY_MS = 10 * 60_000;
const Z = 14;

let known: string | null = null;
let checking: Promise<string | null> | null = null;
let failedAt = 0;

/** The release last known, without asking (null before the first check, or with none ever found). */
export const knownRelease = () => known;

async function fetchText(url: string, ms: number): Promise<string> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctl.signal });
    if (!res.ok) throw new Error(`${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

/** AD6: the newest release Overture lists, checked at most once a day; the last known one otherwise. */
export function ensureOvertureRelease(): Promise<string | null> {
  if (checking) return checking;
  checking = (async () => {
    const [stored, at] = await Promise.all([db.getMeta('overture_release'), db.getMeta('overture_checked_at')]).catch(() => [null, null]);
    known = stored ?? known;
    const now = Date.now();
    if (!releaseDue(at ? Number(at) : null, now) || now - failedAt < RETRY_MS) return known;
    try {
      const newest = newestRelease(await fetchText(releasesListUrl(), LIST_MS));
      if (newest) {
        known = newest;
        await db.setMeta('overture_release', newest);
      }
      await db.setMeta('overture_checked_at', String(now));
    } catch {
      failedAt = now;
    }
    return known;
  })().finally(() => {
    checking = null;
  });
  return checking;
}

const memo = new TileMemo<OverturePlace[]>(64);
let archive: { release: string; file: PMTiles } | null = null;

function decode(bytes: ArrayBuffer, x: number, y: number): OverturePlace[] {
  const layer = new VectorTile(new PbfReader(new Uint8Array(bytes))).layers.place;
  if (!layer) return [];
  const features: TileFeature[] = [];
  for (let i = 0; i < layer.length; i++) {
    const f = layer.feature(i).toGeoJSON(x, y, Z);
    features.push({ geometry: f.geometry as TileFeature['geometry'], properties: (f.properties ?? {}) as Record<string, unknown> });
  }
  return overturePlacesFromTile(features);
}

/**
 * AD3, AD7, AD8: the Overture places that count in these z14 tiles, with the
 * release they came from; null when Overture can't be read (the caller measures
 * from OpenStreetMap alone). Each tile is fetched once per release this session.
 */
export async function readOverture(tiles: [number, number][], shouldStop?: () => boolean): Promise<{ release: string; points: ActivityPoint[] } | null> {
  const release = await ensureOvertureRelease().catch(() => null);
  if (!release || shouldStop?.()) return null;
  if (archive?.release !== release) archive = { release, file: new PMTiles(overtureUrl(release)) };
  const file = archive.file;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TILE_MS);
  const poll = shouldStop ? setInterval(() => shouldStop() && ctl.abort(), 200) : null;
  try {
    const lists = await Promise.all(
      tiles.map(([x, y]) =>
        memo.get(release, x, y, async () => {
          const t = await file.getZxy(Z, x, y, ctl.signal);
          return t ? decode(t.data, x, y) : [];
        }),
      ),
    );
    // A place near a tile's edge is in both tiles' buffers: once by its id.
    const byId = new Map<string, OverturePlace>();
    for (const list of lists) for (const p of list) if (!byId.has(p.id)) byId.set(p.id, p);
    return { release, points: activityFromOverture([...byId.values()]) };
  } catch (e) {
    // The release is gone (Overture keeps only a few): look for the newest again on the next read.
    if (/\b40[34]\b/.test(String(e))) await db.setMeta('overture_checked_at', '0').catch(() => {});
    return null;
  } finally {
    clearTimeout(timer);
    if (poll) clearInterval(poll);
  }
}
