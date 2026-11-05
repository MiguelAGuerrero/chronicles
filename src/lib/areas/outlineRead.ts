// @layer shell
import type { Ports } from '../ports/types';
import type { LngLat } from '../types';
import { townPlaces } from './borders';
import { BORDER_ZOOM, OUTLINE_TILES_MAX, OUTLINE_ZOOM, outlineSet, outlineTileKey, outlineTilesFor, stampRelease, tileCurrent, withoutNested, type OutlineSet, type OutlineTile } from './outlines';

/** Where town outlines come from, tile by tile (today Overture's divisions, `overtureOutlines.ts`). */
export interface OutlineSource {
  /** The edition to read, or null when none is known (offline before the first check). */
  release(): Promise<string | null>;
  /** One tile's towns, at zoom z; rejects when it can't be read. */
  tile(release: string, x: number, y: number, z: number): Promise<OutlineTile>;
}

/** What a read found: complete when every tile under its points is known; tooMany when they were too many to read. */
export interface OutlineRead {
  set: OutlineSet;
  complete: boolean;
  tooMany: boolean;
}

/** The ward ids kept in meta `outline_nested`; anything unreadable is none. */
function parseIds(raw: string | null): string[] {
  try {
    const v: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** The cache is looked through for at most this many tiles, however many points ask (no network). */
const KNOWN_TILES_MAX = 64;

/**
 * Town outlines, read by tile and kept (TO8, TO12): a tile read once is
 * kept on the phone and never read again, so later answers need no network.
 * A read is complete only when every tile under its points is known; the
 * caller places by points otherwise and tries again later.
 */
export function createOutlines(p: Pick<Ports, 'db' | 'clock'> & { source: OutlineSource }) {
  /** The wards found so far (fix ward-subdivision audit 1): a piece in one tile is told from a town by a point in another. */
  let nested: Set<string> | null = null;
  let remembering: Promise<unknown> = Promise.resolve();
  const wards = async (): Promise<Set<string>> => (nested ??= new Set(parseIds(await p.db.getMeta('outline_nested').catch(() => null))));
  const remember = (ids: string[]) => {
    remembering = remembering.then(async () => {
      const have = await wards();
      const fresh = ids.filter((id) => !have.has(id));
      if (!fresh.length) return;
      for (const id of fresh) have.add(id);
      await p.db.setMeta('outline_nested', JSON.stringify([...have])).catch(() => {});
    });
    return remembering;
  };

  /** One fetch per tile at a time, whoever asks. */
  const inflight = new Map<string, Promise<OutlineTile | null>>();

  const fetchTile = (release: string, x: number, y: number, z: number): Promise<OutlineTile | null> => {
    const key = outlineTileKey(x, y, z);
    const have = inflight.get(key);
    if (have) return have;
    const job = p.source
      .tile(release, x, y, z)
      .then(async (t) => {
        const { nested: found, ...rest } = t;
        const tile = { ...rest, key, z, x, y, release: stampRelease(t.release), read_at: p.clock.now() };
        await p.db.putOutlineTiles([tile]);
        if (found?.length) await remember(found);
        return tile;
      })
      .catch(() => null)
      .finally(() => inflight.delete(key));
    inflight.set(key, job);
    return job;
  };

  /** Kept tiles cut by the current decoder; an older one is as good as missing. */
  const keptTiles = async (keys: string[]): Promise<OutlineTile[]> => withoutNested((await p.db.getOutlineTiles(keys).catch(() => [] as OutlineTile[])).filter(tileCurrent), await wards());

  /** The tiles under these points at zoom z: kept ones, then the rest read (`read` for z12, `borders` for z10). */
  const readAt = async (points: LngLat[], z: number, shouldStop: () => boolean): Promise<OutlineRead> => {
    const tiles = outlineTilesFor(points, OUTLINE_TILES_MAX, z);
    if (!tiles) {
      const first = outlineTilesFor(points.slice(0, 1), 1, z) ?? [];
      const kept = await keptTiles(first.map(([x, y]) => outlineTileKey(x, y, z)));
      return { set: outlineSet(kept), complete: false, tooMany: true };
    }
    const keys = tiles.map(([x, y]) => outlineTileKey(x, y, z));
    const kept = await keptTiles(keys);
    const have = new Set(kept.map((t) => t.key));
    const missing = tiles.filter(([x, y]) => !have.has(outlineTileKey(x, y, z)));
    if (!missing.length) return { set: outlineSet(kept), complete: true, tooMany: false };
    if (shouldStop()) return { set: outlineSet(kept), complete: false, tooMany: false };
    const release = await p.source.release().catch(() => null);
    if (!release || shouldStop()) return { set: outlineSet(kept), complete: false, tooMany: false };
    const read = await Promise.all(missing.map(([x, y]) => fetchTile(release, x, y, z)));
    const got = read.filter((t): t is OutlineTile => !!t);
    return { set: outlineSet(withoutNested([...kept, ...got], await wards())), complete: got.length === missing.length, tooMany: false };
  };

  return {
    /** The outlines kept for the tiles under these points, with no network. */
    async known(points: LngLat[], z: number = OUTLINE_ZOOM): Promise<OutlineSet> {
      const tiles = outlineTilesFor(points, KNOWN_TILES_MAX, z) ?? [];
      return outlineSet(await keptTiles(tiles.map(([x, y]) => outlineTileKey(x, y, z))));
    },

    /** The outlines under these points, reading the tiles not kept yet (at most OUTLINE_TILES_MAX). */
    read(points: LngLat[], shouldStop: () => boolean = () => false): Promise<OutlineRead> {
      return readAt(points, OUTLINE_ZOOM, shouldStop);
    },

    /** TB5: the towns these walks were in (their Area rows of level town), each once: what a replay or a day tints. */
    async townsOf(walkIds: string[]): Promise<{ name: string; at: LngLat }[]> {
      if (!walkIds.length) return [];
      const ids = new Set(walkIds);
      const [rows, areas] = await Promise.all([p.db.listWalkAreas(), p.db.listAreas()]);
      const keys = new Set(rows.filter((r) => ids.has(r.walk_id)).map((r) => r.area_key));
      return townPlaces(areas.filter((a) => keys.has(a.key)));
    },

    /**
     * TB6, TB7: whole borders to draw around these points, from the z10 tiles under them
     * (kept, else read). Deciding stays on `read`'s z12 tiles.
     */
    borders(points: LngLat[], shouldStop: () => boolean = () => false): Promise<OutlineRead> {
      return readAt(points, BORDER_ZOOM, shouldStop);
    },
  };
}

export type Outlines = ReturnType<typeof createOutlines>;
