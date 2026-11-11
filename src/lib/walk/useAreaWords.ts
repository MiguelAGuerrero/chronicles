// @layer view
import { useEffect, useState } from 'react';
import type { LngLat } from '../types';
import { cellsFor } from './cells';
import { FORM } from './form';
import { inFormRegion } from './formRegion';
import { tilesAround } from './layer';
import { placeForm, type FormWord } from './placeForm';
import { measureRings } from './placeSignals';
import { cellWords, countCells } from './summary';
import { walkBuild, walkBuildings, walkPlaces, walkReader } from './walkApp';

export interface AreaWords {
  /** Still reading the tiles around. */
  reading: boolean;
  /** The area in words, or null when too little is known to say (or nothing could be read). */
  words: string | null;
  /** How the ground around its middle is laid out (specs/place-form), or null: no word fits, it is ambiguous, or it could not be read or is outside the region (PF17, PF18, PF29). */
  form: FormWord | null;
}

/**
 * The area card's lines about the ground: how it is built for someone on foot (UF13), the cells inside its ring said in words, and how it is laid out (the place-form word). Read
 * when the card opens, from the device where the tiles are kept, never for an area nobody opens. Independent of the
 * Walkability layer. Words only.
 */
export function useAreaWords(centre: LngLat, radiusM: number, active: boolean): AreaWords {
  const key = `${centre[0].toFixed(5)},${centre[1].toFixed(5)},${radiusM}`;
  const [done, setDone] = useState<{ key: string; words: string | null; form: FormWord | null } | null>(null);
  useEffect(() => {
    if (!active) return;
    let live = true;
    void (async () => {
      const build = await walkBuild().catch(() => null);
      // The ring's cells each need their whole neighbourhood read: the ring and one neighbourhood beyond it.
      const tiles = tilesAround(centre, radiusM + FORM.radiusM);
      const read = await walkReader.read(tiles, build ?? 'unknown', () => !live);
      if (!live) return;
      if (!read.tiles.size) return setDone({ key, words: null, form: null });
      const places = await walkPlaces(tiles, () => !live);
      if (!live) return;
      const words = cellWords(countCells(cellsFor(read.tiles, read.junctions, places), centre, radiusM));
      // PF3, PF18: the place-form word, only inside the region the rule was learned and held in; the buildings are one more read of the same tiles, and a failed one is no word (PF17).
      let form: FormWord | null = null;
      if (inFormRegion(centre) && places) {
        const buildings = await walkBuildings(tiles, () => !live);
        if (!live) return;
        form = placeForm(measureRings({ at: centre, radiusM, tilesRead: [...read.tiles.keys()], ways: [...read.tiles.values()].flat(), junctions: [...read.junctions.values()].flat(), places, buildings }));
      }
      setDone({ key, words, form });
    })();
    return () => {
      live = false;
    };
    // The centre is read through its key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, key]);
  const here = active && done?.key === key ? done : null;
  return { reading: active && !here, words: here?.words ?? null, form: here?.form ?? null };
}
