import { countsOverture, type OverturePlace } from './points';

/*
 * Overture's releases and tiles, the pure parts (AD3, AD6, AD8). The network
 * side is `activity/overture.ts`.
 */

/** Overture's public bucket: tiles per release, listed and read with no key or account. */
export const OVERTURE_BUCKET = 'https://overturemaps-extras-us-west-2.s3.amazonaws.com';

/** AD3: one release's places, a single PMTiles file read by byte range. */
export const overtureUrl = (release: string) => `${OVERTURE_BUCKET}/tiles/${release}/places.pmtiles`;

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

/**
 * AD8: tiles read once per release while the app is open, however many reads
 * ask, even at the same time. A failed load is forgotten so the next read tries
 * again. Bounded, the oldest first out.
 */
export class TileMemo<T> {
  private map = new Map<string, Promise<T>>();
  constructor(private cap = 64) {}
  get size() {
    return this.map.size;
  }
  private values = new Map<string, T>();
  /** The values of tiles already loaded. */
  settled(): T[] {
    return [...this.values.values()];
  }
  get(release: string, x: number, y: number, load: () => Promise<T>): Promise<T> {
    const key = `${release}/${x}/${y}`;
    const have = this.map.get(key);
    if (have) return have;
    const p = load();
    this.map.set(key, p);
    p.then(
      (v) => {
        if (this.map.get(key) === p) this.values.set(key, v);
      },
      () => {
        if (this.map.get(key) === p) this.map.delete(key);
      },
    );
    while (this.map.size > this.cap) {
      const oldest = this.map.keys().next().value!;
      this.map.delete(oldest);
      this.values.delete(oldest);
    }
    return p;
  }
}

/** One release's archive, as the reader needs it: a tile by z/x/y (pmtiles' `PMTiles`). */
export interface Archive {
  getZxy(z: number, x: number, y: number, signal?: AbortSignal): Promise<{ data: ArrayBuffer } | undefined>;
}

export type OvertureRead = { ok: true; places: OverturePlace[] } | { ok: false; missing: boolean };

const Z = 14;

/**
 * Reads Overture's places for z14 tiles out of one release's archive (AD3, AD7, AD8), robust to what a phone's
 * network does (activity-density audit 2, 3, 5, 9):
 * - each tile loads once per release (`TileMemo`), under its own timeout and abort, never a reader's, so one
 *   reader cancelling never fails another waiting on the same tile;
 * - a reader gives up at its own deadline or when told to stop, and gets `ok: false`, whatever the archive does
 *   (pmtiles' header fetch takes no signal and can hang);
 * - a failure drops the archive, so the next read opens it afresh (pmtiles keeps a failed header for good);
 * - only places that count are held (`keep`), and a 403 or 404 says the release is missing.
 */
export class OvertureReader {
  private memo: TileMemo<OverturePlace[]>;
  private archive: { release: string; file: Archive } | null = null;
  constructor(
    private o: {
      open: (release: string) => Archive;
      decode: (bytes: ArrayBuffer, x: number, y: number) => OverturePlace[];
      /** Which places are held; those that count by default (AD4). */
      keep?: (p: OverturePlace) => boolean;
      /** One tile's load gives up after this. */
      tileMs: number;
      /** One read gives up after this. */
      readMs: number;
      cap?: number;
    },
  ) {
    this.memo = new TileMemo(o.cap ?? 64);
  }

  /** How many places the memo holds, settled tiles only. */
  held(): number {
    return this.memo.settled().reduce((n, list) => n + list.length, 0);
  }

  private fileFor(release: string): Archive {
    if (this.archive?.release !== release) this.archive = { release, file: this.o.open(release) };
    return this.archive.file;
  }

  private load(release: string, x: number, y: number) {
    return this.memo.get(release, x, y, async () => {
      const file = this.fileFor(release);
      const ctl = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const t = await Promise.race([
          file.getZxy(Z, x, y, ctl.signal),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              ctl.abort();
              reject(new Error('timeout'));
            }, this.o.tileMs);
          }),
        ]);
        const places = t ? this.o.decode(t.data, x, y) : [];
        return places.filter(this.o.keep ?? countsOverture);
      } catch (e) {
        // A failed or stalled archive is opened afresh on the next read.
        if (this.archive?.file === file) this.archive = null;
        throw e;
      } finally {
        clearTimeout(timer);
      }
    });
  }

  read(release: string, tiles: [number, number][], shouldStop?: () => boolean): Promise<OvertureRead> {
    return new Promise<OvertureRead>((resolve) => {
      let done = false;
      const finish = (r: OvertureRead) => {
        if (done) return;
        done = true;
        clearTimeout(deadline);
        if (poll) clearInterval(poll);
        resolve(r);
      };
      const deadline = setTimeout(() => finish({ ok: false, missing: false }), this.o.readMs);
      const poll = shouldStop ? setInterval(() => shouldStop() && finish({ ok: false, missing: false }), 200) : null;
      Promise.all(tiles.map(([x, y]) => this.load(release, x, y))).then(
        (lists) => {
          // A place near a tile's edge is in both tiles' buffers: once by its id.
          const byId = new Map<string, OverturePlace>();
          for (const list of lists) for (const p of list) if (!byId.has(p.id)) byId.set(p.id, p);
          finish({ ok: true, places: [...byId.values()] });
        },
        (e) => finish({ ok: false, missing: /\b40[34]\b/.test(String(e)) }),
      );
    });
  }
}
