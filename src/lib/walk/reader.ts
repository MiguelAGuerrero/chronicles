// @layer shell
import type { Ports } from '../ports/types';
import { WALK_CODE } from './bands';
import { MAX_TILES } from './limits';
import { walkTileKey } from './match';
import type { TileFacts, WalkSource, WalkTile, WayFacts } from './types';

/*
 * Reading walkability tiles robustly (WK2-WK4, WK18): the device's cache first, one source request at a
 * time, a deadline on each, and a failure never fails a read. Timers and held state, so a shell: it is
 * given its ports and its source, so tests run it with fakes.
 */

export { MAX_TILES } from './limits';
/** WK3: a tile that failed is not asked again for this long. */
export const RETRY_MS = 2 * 60_000;
/** WK3: one tile's request gives up after this. */
export const TILE_MS = 10_000;
/** WK1b: a tile Overpass gave is read from Overture again after this. */
export const OVERPASS_KEEP_MS = 30 * 60_000;

export interface WalkRead {
  /** Ways per tile, keyed `walkTileKey`. A tile not here has no data (WK3, WK10). */
  tiles: Map<string, WayFacts[]>;
  /** How many tiles asked for could not be had. */
  failed: number;
}

export interface WalkReader {
  /** WK2: the ways of these z14 tiles for this Overture release, from the device where kept, else from the source. */
  read(tiles: readonly (readonly [number, number])[], build: string): Promise<WalkRead>;
}

export function createWalkReader(p: Pick<Ports, 'db' | 'clock'>, source: WalkSource, o: { tileMs?: number } = {}): WalkReader {
  const tileMs = o.tileMs ?? TILE_MS;
  const inflight = new Map<string, Promise<TileFacts | null>>();
  const failedAt = new Map<string, number>();
  /** WK4: every request waits for the one before it. */
  let queue: Promise<unknown> = Promise.resolve();

  const request = async (x: number, y: number): Promise<TileFacts | null> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        source.read(x, y),
        new Promise<null>((resolve) => {
          timer = setTimeout(() => resolve(null), tileMs);
        }),
      ]);
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };

  const ask = (x: number, y: number): Promise<TileFacts | null> => {
    const key = walkTileKey(x, y);
    const have = inflight.get(key);
    if (have) return have;
    const run = queue.then(() => request(x, y));
    queue = run;
    inflight.set(key, run);
    void run.then(() => inflight.delete(key));
    return run;
  };

  return {
    async read(tiles, build) {
      const want = tiles.slice(0, MAX_TILES);
      const keys = want.map(([x, y]) => walkTileKey(x, y));
      const kept = await p.db.getWalkTiles(keys).catch(() => [] as WalkTile[]);
      const byKey = new Map(kept.filter((t) => t.code === WALK_CODE).map((t) => [t.key, t]));
      const out = new Map<string, WayFacts[]>();
      let failed = 0;
      for (const [x, y] of want) {
        const key = walkTileKey(x, y);
        const now = p.clock.now();
        const have = byKey.get(key);
        if (have && (have.from === 'overture' ? have.build === build : now - have.read_at < OVERPASS_KEEP_MS)) {
          out.set(key, have.ways);
          continue;
        }
        const failedWhen = failedAt.get(key);
        if (failedWhen === undefined || now - failedWhen >= RETRY_MS) {
          const got = await ask(x, y);
          if (got) {
            failedAt.delete(key);
            out.set(key, got.ways);
            const row: WalkTile = { key, x, y, build: got.from === 'overture' ? build : 'overpass', code: WALK_CODE, from: got.from, read_at: p.clock.now(), ways: got.ways };
            await p.db.putWalkTiles([row]).catch(() => {});
            continue;
          }
          failedAt.set(key, p.clock.now());
        }
        // Could not be read now: an older Overpass tile is better than none (WK3).
        if (have && have.from === 'overpass') out.set(key, have.ways);
        else failed++;
      }
      return { tiles: out, failed };
    },
  };
}
