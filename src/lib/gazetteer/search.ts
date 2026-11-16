// @layer core
import type { LngLat } from '../types';
import type { GazetteerPack, Place } from './pack';

/** The most rows the list shows (GZ4). */
export const LIMIT = 8;

export interface GazetteerIndex {
  pack: GazetteerPack;
}

export interface SearchResult {
  places: Place[];
  /** More matched than are listed: the list ends with "Keep typing to narrow it." (GZ4). */
  more: boolean;
  /** Entries examined, for the bounded-work test (GZ15). */
  examined: number;
}

/** Builds the lookup once per pack (GZ15). */
export function buildIndex(_pack: GazetteerPack): GazetteerIndex {
  throw new Error('place-search: not built');
}

/**
 * Places whose name, or any word of it, or any alternate starts like the query; later words may start the region or country
 * (GZ3). Nearest `origin` first (a fresh fix, else the live map's middle), else by name then region (GZ4); never by size.
 */
export function search(_index: GazetteerIndex, _query: string, _origin: LngLat | null, _limit?: number): SearchResult {
  throw new Error('place-search: not built');
}
