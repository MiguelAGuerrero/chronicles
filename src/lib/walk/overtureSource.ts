// @layer adapter
import type { Archive } from '../activity/release';
import { waysFromOvertureTile } from './overtureSegments';
import type { WalkSource } from './types';

/*
 * Overture's transportation tiles, the primary walkability source (WK1): the network side. One release's
 * transportation.pmtiles, read by byte range, with no key and nothing about the user, from the bucket the
 * places come from. The release is the one the places reader follows (AD6). Deadlines and one request at a
 * time are the reader's (`walk/reader.ts`); this only asks.
 */

const Z = 14;

/** `open` and `release` are given, so a test hands it a fake archive. */
export function createOvertureSource(o: { release: () => Promise<string | null>; open: (release: string) => Archive }): WalkSource {
  let archive: { release: string; file: Archive } | null = null;
  return {
    async read(x, y) {
      const release = await o.release().catch(() => null);
      if (!release) return null;
      if (archive?.release !== release) archive = { release, file: o.open(release) };
      const file = archive.file;
      try {
        const t = await file.getZxy(Z, x, y);
        // No tile: open ground or water. A tile with no roads, not a failure.
        return { x, y, from: 'overture', ways: t ? waysFromOvertureTile(t.data, x, y) : [] };
      } catch {
        // pmtiles keeps a failed header for good: the next read opens the archive afresh.
        if (archive?.file === file) archive = null;
        return null;
      }
    },
  };
}
