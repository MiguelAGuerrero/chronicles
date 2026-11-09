// @layer shell
import { TileReader } from '../net/tileReader';
import { countsOverture, OvertureSchemaError, type OverturePlace } from './points';
import type { Archive, OvertureRead } from './release';

/*
 * Reading Overture's tiles robustly (AD7, AD8, activity-density audit 2, 3, 5, 9): the generic `TileReader`
 * (`net/tileReader.ts`) with Overture's rules: z14, only places that count (AD4), and a 403, a 404 or tiles that
 * no longer decode (fix net-rules) mean the release is missing.
 */

export { TileMemo } from '../net/tileReader';

export class OvertureReader {
  private reader: TileReader<OverturePlace>;
  constructor(o: {
    open: (release: string) => Archive;
    decode: (bytes: ArrayBuffer, x: number, y: number) => OverturePlace[];
    /** Which places are held; those that count by default (AD4). */
    keep?: (p: OverturePlace) => boolean;
    tileMs: number;
    readMs: number;
    cap?: number;
  }) {
    this.reader = new TileReader<OverturePlace>({
      ...o,
      keep: o.keep ?? countsOverture,
      zoom: 14,
      missing: (e) => e instanceof OvertureSchemaError || /\b40[34]\b/.test(String(e)),
    });
  }

  /** How many places the memo holds, settled tiles only. */
  held(): number {
    return this.reader.held();
  }

  async read(release: string, tiles: [number, number][], shouldStop?: () => boolean): Promise<OvertureRead> {
    const r = await this.reader.read(release, tiles, shouldStop);
    return r.ok ? { ok: true, places: r.items } : r;
  }
}
