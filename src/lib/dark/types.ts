// @layer core
import type { LngLat } from '../types';

/*
 * After dark's contract (DK8, DK9): a DarkSource turns a z14 tile into the ways OpenStreetMap tags `lit` and the places it gives
 * `opening_hours`, with the tags as given. Whether a way is lit or a place open is judged on read (draw.ts), never stored.
 */

export interface DarkWay {
  /** `w<osm id>`. */
  id: string;
  /** The `lit` tag as given: yes, no, automatic, a time range... */
  lit: string;
  name?: string;
  line: LngLat[];
}

export interface DarkPlace {
  /** `n`, `w` or `r` and the OpenStreetMap id. */
  id: string;
  at: LngLat;
  /** The `opening_hours` tag as given. */
  hours: string;
}

export interface DarkFacts {
  x: number;
  y: number;
  ways: DarkWay[];
  places: DarkPlace[];
}

export interface DarkSource {
  /** The tile's facts, or null when they can't be had now (busy, paused, capped, offline). */
  read(x: number, y: number, signal?: AbortSignal): Promise<DarkFacts | null>;
}

/** A read tile as kept (DK9): cache, keyed `x/y` at z14, cleared with the derived stores. */
export interface DarkTile extends DarkFacts {
  key: string;
  /** `DARK_CODE` when read: a change to the query or the parser reads every tile again. */
  code: string;
  read_at: number;
}
