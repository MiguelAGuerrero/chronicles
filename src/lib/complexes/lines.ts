// @layer core
import type { LngLat } from '../types';
import type { Complex, ComplexKind } from './types';

/** How many rows show before "See more" (CX4). A constant, tuned by the owner; never said aloud. */
export const FIRST_SHOWN = 4;
export const SEE_MORE = 'See more';

export interface ComplexRow {
  id: string;
  name: string;
  /** The kind as a word (CX3). */
  word: string;
  at: LngLat;
  /** Screen-reader text: the name and the kind word only (CX5, CX9). */
  label: string;
}
export interface ComplexSection {
  title: string;
  rows: ComplexRow[];
  /** True while "See more" would show more rows. */
  more: boolean;
}

const NOT_YET = () => new Error('complexes: not implemented');

/** The kind as a word: Shopping, Market, Campus, Station, Civic. */
export function kindWord(_kind: ComplexKind): string {
  throw NOT_YET();
}

/** CX6: nearest to a point first, ties by name (locale-free) then id. */
export function nearestFirst(_complexes: readonly Complex[], _from: LngLat): Complex[] {
  throw NOT_YET();
}

/** CX4-CX6: the card's section: null with none to show; "Complexes near here" when the read was partial; the nearest few until expanded. */
export function complexSection(_complexes: readonly Complex[], _o: { from: LngLat; partial: boolean; hidden: readonly ComplexKind[]; expanded: boolean }): ComplexSection | null {
  throw NOT_YET();
}
