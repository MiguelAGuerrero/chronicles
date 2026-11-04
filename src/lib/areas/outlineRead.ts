// @layer shell
import type { Ports } from '../ports/types';
import type { LngLat } from '../types';
import { OUTLINE_TILES_MAX, outlineSet, outlineTileKey, outlineTilesFor, type OutlineSet, type OutlineTile } from './outlines';

/** Where town outlines come from, tile by tile (today Overture's divisions, `overtureOutlines.ts`). */
export interface OutlineSource {
  /** The edition to read, or null when none is known (offline before the first check). */
  release(): Promise<string | null>;
  /** One tile's towns; rejects when it can't be read. */
  tile(release: string, x: number, y: number): Promise<OutlineTile>;
}

/** What a read found: complete when every tile under its points is known; tooMany when they were too many to read. */
export interface OutlineRead {
  set: OutlineSet;
  complete: boolean;
  tooMany: boolean;
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
  /** One fetch per tile at a time, whoever asks. */
  const inflight = new Map<string, Promise<OutlineTile | null>>();

  const fetchTile = (release: string, x: number, y: number): Promise<OutlineTile | null> => {
    const key = outlineTileKey(x, y);
    const have = inflight.get(key);
    if (have) return have;
    const job = p.source
      .tile(release, x, y)
      .then(async (t) => {
        const tile = { ...t, key, x, y, read_at: p.clock.now() };
        await p.db.putOutlineTiles([tile]);
        return tile;
      })
      .catch(() => null)
      .finally(() => inflight.delete(key));
    inflight.set(key, job);
    return job;
  };

  return {
    /** The outlines kept for the tiles under these points, with no network. */
    async known(points: LngLat[]): Promise<OutlineSet> {
      const tiles = outlineTilesFor(points, KNOWN_TILES_MAX) ?? [];
      return outlineSet(await p.db.getOutlineTiles(tiles.map(([x, y]) => outlineTileKey(x, y))).catch(() => []));
    },

    /** The outlines under these points, reading the tiles not kept yet (at most OUTLINE_TILES_MAX). */
    async read(points: LngLat[], shouldStop: () => boolean = () => false): Promise<OutlineRead> {
      const tiles = outlineTilesFor(points, OUTLINE_TILES_MAX);
      // Too wide to read (a long ride): placed by points, for good, so it isn't tried again on every launch.
      if (!tiles) return { set: await this.known(points.slice(0, 1)), complete: false, tooMany: true };
      const keys = tiles.map(([x, y]) => outlineTileKey(x, y));
      const kept = await p.db.getOutlineTiles(keys).catch(() => [] as OutlineTile[]);
      const have = new Set(kept.map((t) => t.key));
      const missing = tiles.filter(([x, y]) => !have.has(outlineTileKey(x, y)));
      if (!missing.length) return { set: outlineSet(kept), complete: true, tooMany: false };
      if (shouldStop()) return { set: outlineSet(kept), complete: false, tooMany: false };
      const release = await p.source.release().catch(() => null);
      if (!release || shouldStop()) return { set: outlineSet(kept), complete: false, tooMany: false };
      const read = await Promise.all(missing.map(([x, y]) => fetchTile(release, x, y)));
      const got = read.filter((t): t is OutlineTile => !!t);
      return { set: outlineSet([...kept, ...got]), complete: got.length === missing.length, tooMany: false };
    },
  };
}

export type Outlines = ReturnType<typeof createOutlines>;
