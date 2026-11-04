import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import { PMTiles } from 'pmtiles';
import { useEffect, useState } from 'react';
import type { TileFeature } from '../areas/tilePlaces';
import { db } from '../db';
import { activityFromOverture, overturePlacesFromTile, type ActivityPoint, type OverturePlace } from './points';
import { newestRelease, overtureUrl, OvertureReader, releaseDue, releasesListUrl } from './release';

/*
 * Overture Maps Places, read by tile (AD3-AD8): the network side. Each read
 * asks for the z14 tiles it covers out of the release's one PMTiles file, by
 * byte range, with no key and nothing about the user. Any failure leaves the
 * read to OpenStreetMap alone (AD7). Places are never stored: only what is
 * measured from them. The robust parts are `OvertureReader` (pure, tested).
 */

const LIST_MS = 8000;
/** One tile's load, and one read, give up after these (activity-density audit 2). */
const TILE_MS = 15_000;
const READ_MS = 20_000;
/** After a failed release check, the next waits this long, so an offline read isn't held up each time. */
const RETRY_MS = 10 * 60_000;
const Z = 14;

let known: string | null = null;
let checking: Promise<string | null> | null = null;
let failedAt = 0;
/** Releases listed but missing this session (403, 404): passed over for the one before (activity-density audit 6). */
const missing = new Set<string>();

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
    if (stored && !missing.has(stored)) known = stored;
    const now = Date.now();
    const due = releaseDue(at ? Number(at) : null, now) || (known != null && missing.has(known));
    if (!due || now - failedAt < RETRY_MS) return known;
    try {
      const newest = newestRelease(await fetchText(releasesListUrl(), LIST_MS), missing);
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

/**
 * The release known, for screens that judge staleness (activity-density audit 8): checked once when the screen
 * mounts, so a walk opened straight from a launch knows it without visiting the Explore tab.
 */
export function useOvertureRelease(): string | null {
  const [release, setRelease] = useState<string | null>(known);
  useEffect(() => {
    let live = true;
    ensureOvertureRelease()
      .then((r) => live && setRelease(r))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  return release;
}

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

const reader = new OvertureReader({ open: (release) => new PMTiles(overtureUrl(release)), decode, tileMs: TILE_MS, readMs: READ_MS });

/**
 * AD3, AD7, AD8: the Overture places that count in these z14 tiles, with the
 * release they came from; null when Overture can't be read (the caller measures
 * from OpenStreetMap alone). Each tile is fetched once per release this session.
 */
export async function readOverture(tiles: [number, number][], shouldStop?: () => boolean): Promise<{ release: string; points: ActivityPoint[] } | null> {
  const release = await ensureOvertureRelease().catch(() => null);
  if (!release || shouldStop?.()) return null;
  const r = await reader.read(release, tiles, shouldStop);
  if (r.ok) return { release, points: activityFromOverture(r.places) };
  // Listed but not there (not yet up, or gone): the one before it is used from the next read.
  if (r.missing) missing.add(release);
  return null;
}
