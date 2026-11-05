// @layer view
import { useEffect, useState } from 'react';
import type { LngLat } from '../types';
import { ringWords, tilesAround } from './layer';
import { walkBuild, walkReader } from './walkApp';

export interface AreaWords {
  /** Still reading the ring's tiles. */
  reading: boolean;
  /** The area in words, or null when too little is known to say (or nothing could be read). */
  words: string | null;
}

/**
 * The area card's line about how the area treats someone on foot (WK11): read when the card opens, from the
 * device where the tiles are kept, never for an area nobody opens. Independent of the map's switch. Words only.
 */
export function useAreaWords(centre: LngLat, radiusM: number, active: boolean): AreaWords {
  const key = `${centre[0].toFixed(5)},${centre[1].toFixed(5)},${radiusM}`;
  const [done, setDone] = useState<{ key: string; words: string | null } | null>(null);
  useEffect(() => {
    if (!active) return;
    let live = true;
    void (async () => {
      const build = await walkBuild().catch(() => null);
      const read = await walkReader.read(tilesAround(centre, radiusM), build ?? 'unknown');
      if (live) setDone({ key, words: read.tiles.size ? ringWords(read.tiles, centre, radiusM) : null });
    })();
    return () => {
      live = false;
    };
    // The centre is read through its key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, key]);
  const here = active && done?.key === key ? done : null;
  return { reading: active && !here, words: here?.words ?? null };
}
