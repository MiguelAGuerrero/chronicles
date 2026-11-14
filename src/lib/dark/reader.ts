// @layer shell
import type { Ports } from '../ports/types';
import { MAX_TILES } from '../walk/limits';
import { DARK_CODE } from './overpass';
import type { DarkFacts, DarkSource, DarkTile } from './types';

/*
 * Reading after-dark tiles (DK9, DK14): the device's copy first, kept thirty days; else one source request at a time, a deadline on
 * each, and a failed tile not asked again for two minutes. A failure never fails a read: an older kept tile beats none, and no
 * guess is made. Timers and held state, so a shell: tests run it over `fakePorts()` and a fake source.
 */

/** DK9: a kept tile is read again after this (lighting and opening hours change slowly). */
export const DARK_KEEP_MS = 30 * 24 * 3600_000;
/** DK14: a tile that failed is not asked again for this long. */
export const DARK_RETRY_MS = 2 * 60_000;
/** One tile's request gives up after this. */
export const DARK_TILE_MS = 20_000;

export const darkTileKey = (x: number, y: number) => `${x}/${y}`;

export interface DarkRead {
  /** The tiles had, in the order asked. */
  tiles: DarkTile[];
  /** How many asked for could not be had. */
  failed: number;
}

export interface DarkReader {
  read(tiles: readonly (readonly [number, number])[], shouldStop?: () => boolean): Promise<DarkRead>;
}

export function createDarkReader(p: Pick<Ports, 'db' | 'clock'>, source: DarkSource, o: { tileMs?: number } = {}): DarkReader {
  const tileMs = o.tileMs ?? DARK_TILE_MS;
  const inflight = new Map<string, Promise<DarkFacts | null>>();
  const failedAt = new Map<string, number>();
  const settled = new Map<string, DarkTile>();
  let queue: Promise<unknown> = Promise.resolve();

  const request = async (x: number, y: number): Promise<DarkFacts | null> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ctl = new AbortController();
    try {
      return await Promise.race([
        source.read(x, y, ctl.signal),
        new Promise<null>((resolve) => {
          timer = setTimeout(() => {
            ctl.abort();
            resolve(null);
          }, tileMs);
        }),
      ]);
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };

  const ask = (x: number, y: number): Promise<DarkFacts | null> => {
    const key = darkTileKey(x, y);
    const have = inflight.get(key);
    if (have) return have;
    const run = queue.then(() => request(x, y));
    queue = run;
    inflight.set(key, run);
    void run.then(() => inflight.delete(key));
    return run;
  };

  return {
    async read(tiles, shouldStop) {
      const want = tiles.slice(0, MAX_TILES);
      const kept = await p.db.getDarkTiles(want.map(([x, y]) => darkTileKey(x, y))).catch(() => [] as DarkTile[]);
      const byKey = new Map(kept.filter((t) => t.code === DARK_CODE).map((t) => [t.key, t]));
      const out: DarkTile[] = [];
      let failed = 0;
      for (const [x, y] of want) {
        const key = darkTileKey(x, y);
        const now = p.clock.now();
        const have = settled.get(key) ?? byKey.get(key);
        if (have && now - have.read_at < DARK_KEEP_MS) {
          out.push(have);
          continue;
        }
        if (shouldStop?.()) break;
        const failedWhen = failedAt.get(key);
        if (failedWhen === undefined || now - failedWhen >= DARK_RETRY_MS) {
          const got = await ask(x, y);
          if (got) {
            failedAt.delete(key);
            const row: DarkTile = { key, x, y, code: DARK_CODE, read_at: p.clock.now(), ways: got.ways, places: got.places };
            settled.set(key, row);
            out.push(row);
            await p.db.putDarkTiles([row]).catch(() => {});
            continue;
          }
          failedAt.set(key, p.clock.now());
        }
        // Could not be read now: an older tile is better than none (DK14).
        if (have) out.push(have);
        else failed++;
      }
      return { tiles: out, failed };
    },
  };
}
