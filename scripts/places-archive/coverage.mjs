// The coverage benchmark's pure parts (Remarkable and public, RP17, decision 0104): which Wikidata items are
// destinations, and what became of each in the app. A destination is defined by structure only (a listing or a
// pinned public type, standing, not a district), never by sitelinks, articles or page views (steward 3).
import { createRequire } from 'node:module';
import { DISTRICT, NHL, NRHP } from './classify.mjs';

const TYPES = createRequire(import.meta.url)('./public-types.json');
const PUBLIC = new Set(['church', 'cemetery', 'theatre', 'public', 'museum'].flatMap((g) => TYPES.groups[g]));

/** RP17: a destination: listed (National Register or Landmark) or of a pinned public type, standing, not a district. */
export function isDestination(item) {
  const p31 = item.p31 ?? [];
  if (item.dissolved || p31.includes(DISTRICT)) return false;
  const heritage = item.heritage ?? [];
  return !!item.listed || !!item.nhl || heritage.includes(NRHP) || heritage.includes(NHL) || p31.some((q) => PUBLIC.has(q));
}

const STOP = /\b(the|of|at|and|a|saint|st|church|museum|park|building|house|center|centre)\b/g;
const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’]/g, '').replace(/&/g, ' and ').replace(STOP, ' ').replace(/[^a-z0-9]+/g, ' ').trim();

/** Two names for one place: equal, one holding the other, or most of the shorter's words shared. */
export function similar(a, b) {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return false;
  if (x === y || (x.length > 3 && y.includes(x)) || (y.length > 3 && x.includes(y))) return true;
  const A = new Set(x.split(' '));
  const B = new Set(y.split(' '));
  return [...A].filter((t) => B.has(t)).length / Math.min(A.size, B.size) >= 0.6;
}

/** Metres between two [lon, lat] points (an equirectangular approximation, fine at these distances). */
export function metres([lon1, lat1], [lon2, lat2]) {
  const r = Math.PI / 180;
  return Math.hypot((lon2 - lon1) * r * Math.cos(((lat1 + lat2) / 2) * r), (lat2 - lat1) * r) * 6371008.8;
}

/** How close a place must be to an item to be it: a large building's point and Wikidata's can sit apart. */
export const MATCH_M = 300;

/**
 * RP17: what became of an item in the app: shown (a place to find), stopped by the name rule (kept, not a place to
 * find), dropped by the adapter (in the tiles, not kept), or not in the tiles.
 * @param {{ name: string, at: number[] }} item
 * @param {{ places: { name: string, at: number[], mark: boolean }[], raw: { name: string, at: number[] }[] }} seen
 */
export function outcome(item, seen) {
  const near = (arr) => arr.filter((p) => p.name && metres(p.at, item.at) <= MATCH_M && similar(p.name, item.name));
  const kept = near(seen.places);
  if (kept.some((p) => p.mark)) return 'shown';
  if (kept.length) return 'stopped by the name rule';
  if (near(seen.raw).length) return 'dropped by the adapter';
  return 'not in the tiles';
}
