// @layer core
import { distanceM } from '../geo';
import type { LngLat } from '../types';
import type { Complex, ComplexKind } from './types';

/** How many rows show before "See more" (CX4). A constant, tuned by the owner; never said aloud. */
export const FIRST_SHOWN = 4;
export const SEE_MORE = 'See more';
/** The spoken name of the button: what it shows, so the visible words stay in the name (complexes audit 21). */
export const SEE_MORE_LABEL = 'See more complexes';
/** The smallest a tap target is, in points: Android's 48 dp, which also covers iOS's 44 (complexes audit 28). */
export const COMPLEX_TARGET_MIN = 48;
/** A quiet line under the card's complexes: where the kinds are switched, since Explore has no settings of its own (complexes audit 26). */
export const COMPLEX_SWITCH_HINT = 'Choose which kinds show in a walk’s settings';

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

const WORDS: Record<ComplexKind, string> = { shopping: 'Shopping', markets: 'Market', campuses: 'Campus', stations: 'Station', civic: 'Civic' };

/** The kind as a word: Shopping, Market, Campus, Station, Civic. */
export const kindWord = (kind: ComplexKind): string => WORDS[kind];

const key = (s: string) => s.toLowerCase();

/** CX6: nearest to a point first, ties by name (locale-free) then id. Never by size, busyness or popularity. */
export function nearestFirst(complexes: readonly Complex[], from: LngLat): Complex[] {
  return complexes
    .map((c) => ({ c, d: distanceM(from, c.at) }))
    .sort((a, b) => a.d - b.d || (key(a.c.name) < key(b.c.name) ? -1 : key(a.c.name) > key(b.c.name) ? 1 : 0) || (a.c.id < b.c.id ? -1 : a.c.id > b.c.id ? 1 : 0))
    .map((x) => x.c);
}

/** CX4-CX6: the card's section: null with none to show; "Complexes near here" when the read was partial; the nearest few until expanded. */
export function complexSection(complexes: readonly Complex[], o: { from: LngLat; partial: boolean; hidden: readonly ComplexKind[]; expanded: boolean }): ComplexSection | null {
  const all = nearestFirst(complexes.filter((c) => !o.hidden.includes(c.kind)), o.from);
  if (!all.length) return null;
  const shownRows = o.expanded ? all : all.slice(0, FIRST_SHOWN);
  return {
    title: o.partial ? 'Complexes near here' : 'Complexes',
    rows: shownRows.map((c) => ({ id: c.id, name: c.name, word: kindWord(c.kind), at: c.at, label: `${c.name}, ${kindWord(c.kind)}` })),
    more: !o.expanded && all.length > FIRST_SHOWN,
  };
}
