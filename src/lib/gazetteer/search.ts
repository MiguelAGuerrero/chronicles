// @layer core
import { distanceM } from '../geo';
import type { LngLat } from '../types';
import { fold, words } from './normalize';
import { placeAt, type GazetteerPack, type Place } from './pack';

/** The most rows the list shows (GZ4). */
export const LIMIT = 8;

export interface GazetteerIndex {
  pack: GazetteerPack;
  /** Folded keys, sorted: a place's names in full, and the later words of its name and ASCII name. */
  keys: string[];
  /** The place each key belongs to. */
  owner: Int32Array;
  regionWords: string[][];
  countryWords: string[][];
}

export interface SearchResult {
  places: Place[];
  /** More matched than are listed: the list ends with "Keep typing to narrow it." (GZ4). */
  more: boolean;
  /** Entries examined, for the bounded-work test (GZ15). */
  examined: number;
}

const EMPTY: SearchResult = { places: [], more: false, examined: 0 };

/** Builds the lookup once per pack (GZ15). */
export function buildIndex(pack: GazetteerPack): GazetteerIndex {
  const raw: string[] = [];
  const who: number[] = [];
  for (let i = 0; i < pack.names.length; i++) {
    const seen = new Set<string>();
    const add = (key: string) => {
      if (key && !seen.has(key)) {
        seen.add(key);
        raw.push(key);
        who.push(i);
      }
    };
    for (const text of [pack.names[i], pack.ascii[i]]) {
      const ws = words(text);
      for (let w = 0; w < ws.length; w++) add(ws.slice(w).join(' '));
    }
    for (const alt of pack.alts[i]) add(fold(alt));
  }
  const order = Array.from(raw.keys()).sort((a, b) => (raw[a] < raw[b] ? -1 : raw[a] > raw[b] ? 1 : 0));
  return {
    pack,
    keys: order.map((k) => raw[k]),
    owner: Int32Array.from(order, (k) => who[k]),
    regionWords: pack.regions.map((r, i) => [...words(r), ...words(pack.regionCodes[i])]),
    countryWords: pack.countries.map(words),
  };
}

function lowerBound(keys: string[], key: string): number {
  let lo = 0;
  let hi = keys.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (keys[mid] < key) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Places whose name, or any word of it, or any alternate starts like the query; later words may start the region or country
 * (GZ3). Nearest `origin` first (a fresh fix, else the live map's middle), else by name then region (GZ4); never by size.
 */
export function search(index: GazetteerIndex, query: string, origin: LngLat | null, limit: number = LIMIT): SearchResult {
  const q = fold(query);
  if (q.replace(/ /g, '').length < 2) return EMPTY;
  const tokens = q.split(' ');
  const [first, ...rest] = tokens;
  const { pack, keys, owner } = index;
  const hit = new Set<number>();
  let examined = 0;
  for (let k = lowerBound(keys, first); k < keys.length && keys[k].startsWith(first); k++) {
    examined++;
    const i = owner[k];
    if (hit.has(i)) continue;
    if (rest.length) {
      const hay = [...words(pack.names[i]), ...words(pack.ascii[i]), ...pack.alts[i].flatMap(words), ...index.regionWords[pack.region[i]], ...index.countryWords[pack.country[i]]];
      if (!rest.every((t) => hay.some((w) => w.startsWith(t)))) continue;
    }
    hit.add(i);
  }
  // The nearest few (or the first by name), picked in one pass: sorting every match is the cost of a two-letter query (GZ15).
  const near = origin ? (i: number) => distanceM(origin, [pack.lon[i] / 1e4, pack.lat[i] / 1e4]) : () => 0;
  const best: { i: number; d: number; key: string; region: string }[] = [];
  const before = (a: (typeof best)[number], b: (typeof best)[number]) =>
    a.d !== b.d ? a.d < b.d : a.key !== b.key ? a.key < b.key : a.region !== b.region ? a.region < b.region : a.i < b.i;
  for (const i of hit) {
    const c = { i, d: near(i), key: pack.ascii[i].toLowerCase(), region: pack.regions[pack.region[i]] ?? '' };
    if (best.length === limit && !before(c, best[limit - 1])) continue;
    let at = best.length;
    while (at > 0 && before(c, best[at - 1])) at--;
    best.splice(at, 0, c);
    if (best.length > limit) best.pop();
  }
  return { places: best.map((b) => placeAt(pack, b.i)), more: hit.size > limit, examined };
}
