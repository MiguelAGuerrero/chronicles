// @layer core
import type { LngLat } from '../types';

/*
 * The places archive's manifest (PW2, decision 0103): which file is current for each region, read from the
 * `chronicles-data` Pages site. The only file that knows the manifest's shape; the network side is
 * `discovery/archive/shell.ts`.
 */

/**
 * Where the manifest and archives are served: chronicles-data's Pages site (PW16, recorded Nov 10: a cross-origin byte
 * range of the real archive answered 206 with `access-control-allow-origin: *`, and its tiles decode). The host is on
 * `ALLOWED_HOSTS` and `lib/net`'s table. Any failure there is no archive (PW3).
 */
export const PLACES_BASE = 'https://miguelaguerrero.github.io/chronicles-data/';

/** The archive's tile zoom: sparse points pack far smaller at z12 than at z14 (hosting audit). */
export const ARCHIVE_ZOOM = 12;

/** PW2: the manifest is checked at most this often, and a failed check waits this long. */
export const MANIFEST_CHECK_MS = 24 * 3600_000;
export const MANIFEST_RETRY_MS = 10 * 60_000;

export interface ArchiveFile {
  file: string;
  version: string;
  bounds: [number, number, number, number];
  /** PP11: a hash of the places in each z8 block (`8/x/y`), from the places pipeline; absent in older manifests. */
  blocks?: Record<string, string>;
}

/** The places pipeline's block zoom (PP11). */
export const BLOCK_ZOOM = 8;
const BLOCK_KEY = /^8\/\d+\/\d+$/;
const BLOCK_HASH = /^[0-9a-f]{16}$/;

export interface Region {
  id: string;
  current: ArchiveFile;
  /** Older versions still served, newest first: used when the current one is missing (audit 4). */
  previous: ArchiveFile[];
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
  const out: ArchiveFile = { file: f.file, version: f.version, bounds: [b[0], b[1], b[2], b[3]] };
  const blocks = f.blocks as unknown;
  if (blocks && typeof blocks === 'object' && !Array.isArray(blocks)) {
    const entries = Object.entries(blocks as Record<string, unknown>);
    if (entries.every(([k, v]) => BLOCK_KEY.test(k) && typeof v === 'string' && BLOCK_HASH.test(v))) out.blocks = Object.fromEntries(entries) as Record<string, string>;
  }
  return out;
}

/** PP11: the z8 block holding a point, as the pipeline names it. */
export function blockKey([lon, lat]: LngLat): string {
  const n = 2 ** BLOCK_ZOOM;
  const r = (lat * Math.PI) / 180;
  const x = Math.floor(((lon + 180) / 360) * n);
  const y = Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n);
  return `${BLOCK_ZOOM}/${Math.min(Math.max(x, 0), n - 1)}/${Math.min(Math.max(y, 0), n - 1)}`;
}

/**
 * PP13: what an area built at a point records as its archive: the hash of its block's places when the file has
 * blocks (`b:` and the hash, `b:none` for a block with none), so it is rebuilt only when they change; else the
 * file's version, as before.
 */
export function archiveTag(file: ArchiveFile, at: LngLat): string {
  return file.blocks ? `b:${file.blocks[blockKey(at)] ?? 'none'}` : file.version;
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
  for (const r of m.regions as { id?: unknown; current?: unknown; previous?: unknown }[]) {
    const current = fileOf(r?.current);
    if (!current || typeof r.id !== 'string') return null;
    const previous = (Array.isArray(r.previous) ? r.previous : []).map(fileOf).filter((f): f is ArchiveFile => f != null);
    regions.push({ id: r.id, current, previous });
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
