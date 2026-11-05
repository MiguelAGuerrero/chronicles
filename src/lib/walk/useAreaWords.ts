// @layer view
import { useEffect, useState } from 'react';
import type { LngLat } from '../types';
import { cellsFor } from './cells';
import { FORM } from './form';
import { tilesAround } from './layer';
import { cellWords, countCells } from './summary';
import { walkBuild, walkPlaces, walkReader } from './walkApp';

export interface AreaWords {
  /** Still reading the tiles around. */
  reading: boolean;
  /** The area in words, or null when too little is known to say (or nothing could be read). */
  words: string | null;
}

/**
 * The area card's line about how the area is built for someone on foot (UF13): the cells inside its ring, said in words. Read
 * when the card opens, from the device where the tiles are kept, never for an area nobody opens. Independent of the
 * Walkability layer. Words only.
 */
export function useAreaWords(centre: LngLat, radiusM: number, active: boolean): AreaWords {
  const key = `${centre[0].toFixed(5)},${centre[1].toFixed(5)},${radiusM}`;
  const [done, setDone] = useState<{ key: string; words: string | null } | null>(null);
  useEffect(() => {
    if (!active) return;
    let live = true;
    void (async () => {
      const build = await walkBuild().catch(() => null);
      // The ring's cells each need their whole neighbourhood read: the ring and one neighbourhood beyond it.
      const tiles = tilesAround(centre, radiusM + FORM.radiusM);
      const read = await walkReader.read(tiles, build ?? 'unknown', () => !live);
      if (!live) return;
      if (!read.tiles.size) return setDone({ key, words: null });
      const places = await walkPlaces(tiles, () => !live);
      if (live) setDone({ key, words: cellWords(countCells(cellsFor(read.tiles, read.junctions, places), centre, radiusM)) });
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
