// @layer core
import type { OverturePlace } from './points';

/*
 * Overture's releases, the pure parts (AD3, AD6). The reader is
 * `activity/reader.ts`; the network side is `activity/overture.ts`.
 */

/** Overture's public bucket: tiles per release, listed and read with no key or account. */
export const OVERTURE_BUCKET = 'https://overturemaps-extras-us-west-2.s3.amazonaws.com';

/** AD3: one release's places, a single PMTiles file read by byte range. */
export const overtureUrl = (release: string) => `${OVERTURE_BUCKET}/tiles/${release}/places.pmtiles`;

/** Walkability (WK1): the same release's transportation, read by byte range like its places. */
export const transportationUrl = (release: string) => `${OVERTURE_BUCKET}/tiles/${release}/transportation.pmtiles`;

/** Town outlines (TO1): the same release's divisions, read by byte range like its places. */
/** Overture's buildings, read for a count only (specs/place-form PF3). */
export const buildingsUrl = (release: string) => `${OVERTURE_BUCKET}/tiles/${release}/buildings.pmtiles`;

export const overtureDivisionsUrl = (release: string) => `${OVERTURE_BUCKET}/tiles/${release}/divisions.pmtiles`;

/** The bucket's listing of releases. */
export const releasesListUrl = () => `${OVERTURE_BUCKET}/?list-type=2&prefix=tiles/&delimiter=/`;

/**
 * AD6: the newest release in a bucket listing, or null with none, passing over releases found missing
 * (listed before their files are up, or gone): activity-density audit 6.
 */
export function newestRelease(xml: string, skip: ReadonlySet<string> = new Set()): string | null {
  const found = [...xml.matchAll(/<Prefix>tiles\/(\d{4}-\d{2}-\d{2}\.\d+)\/<\/Prefix>/g)].map((m) => m[1]).filter((r) => !skip.has(r));
  if (!found.length) return null;
  return found.sort((a, b) => {
    const [da, na] = a.split('.');
    const [db, nb] = b.split('.');
    return da === db ? Number(na) - Number(nb) : da < db ? -1 : 1;
  })[found.length - 1];
}

/** AD6: the release is checked at most this often. */
export const RELEASE_CHECK_MS = 24 * 3600_000;
export const releaseDue = (checkedAt: number | null, now: number) => checkedAt == null || now - checkedAt >= RELEASE_CHECK_MS;

/** One release's archive, as the reader needs it: a tile by z/x/y (pmtiles' `PMTiles`). */
export interface Archive {
  getZxy(z: number, x: number, y: number, signal?: AbortSignal): Promise<{ data: ArrayBuffer } | undefined>;
}

export type OvertureRead = { ok: true; places: OverturePlace[] } | { ok: false; missing: boolean };
