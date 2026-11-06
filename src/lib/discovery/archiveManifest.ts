// @layer core
import type { LngLat } from '../types';

/*
 * The places archive's manifest (PW2, decision 0102): which file is current for each region, read from the
 * `chronicles-data` Pages site. The only file that knows the manifest's shape; the network side is
 * `discovery/archive/shell.ts`.
 */

/**
 * Where the manifest and archives are served. Empty until PW16 is recorded (a real archive read by byte range
 * from the host): with no address the reader asks for nothing and Explore goes on as it does today.
 */
export const PLACES_BASE = '';

/** The archive's tile zoom: sparse points pack far smaller at z12 than at z14 (hosting audit). */
export const ARCHIVE_ZOOM = 12;

/** PW2: the manifest is checked at most this often, and a failed check waits this long. */
export const MANIFEST_CHECK_MS = 24 * 3600_000;
export const MANIFEST_RETRY_MS = 10 * 60_000;

export interface ArchiveFile {
  file: string;
  version: string;
  bounds: [number, number, number, number];
}

export interface Region {
  id: string;
  current: ArchiveFile;
}

export interface Manifest {
  regions: Region[];
}

/** An archive's file name: a versioned name in the manifest's own folder, never a path. */
const FILE = /^places-[a-z0-9]+-\d{8}(?:\.\d+)?\.pmtiles$/;

function fileOf(v: unknown): ArchiveFile | null {
  const f = v as Partial<ArchiveFile> | null;
  if (!f || typeof f.file !== 'string' || !FILE.test(f.file) || typeof f.version !== 'string') return null;
  const b = f.bounds;
  if (!Array.isArray(b) || b.length !== 4 || !b.every((n) => Number.isFinite(n))) return null;
  return { file: f.file, version: f.version, bounds: [b[0], b[1], b[2], b[3]] };
}

/** PW2: the manifest, or null for anything that isn't one (then no archive is read). */
export function parseManifest(text: string): Manifest | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  const m = raw as { schema?: unknown; regions?: unknown } | null;
  if (!m || m.schema !== 1 || !Array.isArray(m.regions)) return null;
  const regions: Region[] = [];
  for (const r of m.regions as { id?: unknown; current?: unknown }[]) {
    const current = fileOf(r?.current);
    if (!current || typeof r.id !== 'string') return null;
    regions.push({ id: r.id, current });
  }
  return { regions };
}

/** PW2: the region whose box holds the point; null outside every region. */
export function pickRegion(m: Manifest, at: LngLat): Region | null {
  return m.regions.find(({ current: { bounds: [w, s, e, n] } }) => at[0] >= w && at[0] <= e && at[1] >= s && at[1] <= n) ?? null;
}

/** PW2: whether to check the manifest now (at most daily; a failed check waits 10 min). */
export function manifestDue(checkedAt: number | null, failedAt: number | null, now: number): boolean {
  if (failedAt != null && now - failedAt < MANIFEST_RETRY_MS) return false;
  return checkedAt == null || now - checkedAt >= MANIFEST_CHECK_MS;
}

/** PW2: the z12 tiles holding a read's z14 tiles, each once, in order. */
export function archiveTilesFor(tiles: [number, number][], from = 14): [number, number][] {
  const shift = 2 ** (from - ARCHIVE_ZOOM);
  const out = new Map<string, [number, number]>();
  for (const [x, y] of tiles) {
    const t: [number, number] = [Math.floor(x / shift), Math.floor(y / shift)];
    out.set(`${t[0]}/${t[1]}`, t);
  }
  return [...out.values()];
}

/** A region's archive by its versioned name, next to the manifest. */
export const regionUrl = (base: string, file: string) => `${base.replace(/\/?$/, '/')}${file}`;
