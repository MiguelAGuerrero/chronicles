// @layer core
/*
 * The gazetteer pack (specs/place-search, GZ12, GZ13): the app's own format for a table of named places. The app reads only
 * packs; a script turns a dataset into one (scripts/build-gazetteer.js). Columnar so it parses fast and stays small.
 * Never a population, a rank or a class: nothing in the pack can order or show a size (GZ13).
 */
import type { LngLat } from '../types';

export interface GazetteerPack {
  /** The dataset and its date, e.g. "<dataset>-<date>". */
  id: string;
  /** The credit line, in words, shown where the app credits its map data (GZ14). */
  credit: string;
  names: string[];
  /** The name in plain ASCII. */
  ascii: string[];
  /** Other names people type, ASCII, may be empty. */
  alts: string[][];
  /** Index into `regions` / `countries`. */
  region: number[];
  country: number[];
  /** Degrees times 1e4, rounded. */
  lat: number[];
  lon: number[];
  regions: string[];
  countries: string[];
}

export interface Place {
  index: number;
  name: string;
  region: string;
  country: string;
  at: LngLat;
}

/** The only fields a pack may hold (GZ13). */
export const PACK_FIELDS: readonly string[] = ['id', 'credit', 'names', 'ascii', 'alts', 'region', 'country', 'lat', 'lon', 'regions', 'countries'];

/** What is wrong with a pack, or an empty list (GZ13). */
export function validatePack(_pack: unknown): string[] {
  throw new Error('place-search: not built');
}

/** The place at an index of a pack. */
export function placeAt(_pack: GazetteerPack, _index: number): Place {
  throw new Error('place-search: not built');
}
