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

/** AD6: the newest release in a bucket listing, or null with none. Releases are dates, so they sort as text. */
export function newestRelease(xml: string): string | null {
  const found = [...xml.matchAll(/<Prefix>tiles\/(\d{4}-\d{2}-\d{2}\.\d+)\/<\/Prefix>/g)].map((m) => m[1]);
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
  get(release: string, x: number, y: number, load: () => Promise<T>): Promise<T> {
    const key = `${release}/${x}/${y}`;
    const have = this.map.get(key);
    if (have) return have;
    const p = load();
    this.map.set(key, p);
    p.catch(() => {
      if (this.map.get(key) === p) this.map.delete(key);
    });
    while (this.map.size > this.cap) this.map.delete(this.map.keys().next().value!);
    return p;
  }
}
