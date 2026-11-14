// @layer core
import type { LngLat } from '../types';
import { CLASSES, classesOfOsm, OSM_RULES, type PresenceClass } from '../presence/presence';
import { OVERPASS_TIMEOUT_S } from '../walk/overpass';
import type { DarkPlace, DarkWay } from './types';

/*
 * After dark's side of the Overpass API (DK8): the only file that knows its query and its answer. One query per z14 tile, by the
 * tile's box: the ways tagged `lit`, and the places to eat, drink and see a show, and the shops, that carry `opening_hours`.
 * Pharmacies and fuel are left out (the plan's default, steward question 1: they read as a list of havens).
 */

/** Presence's classes whose hours are worth knowing after dark: eating, drinking and a show (one classification, decision 0140). */
const OPEN_CLASSES: readonly PresenceClass[] = [
  'eatery', 'food_counter', 'drink', 'cinema_hall',
  ...(Object.keys(CLASSES) as PresenceClass[]).filter((c) => CLASSES[c].kind === 'theatres'),
];

/** The OpenStreetMap values presence reads as those classes, asked of Overpass as `amenity` (DK8); never a table of our own. */
export const OPEN_AMENITIES: readonly string[] = [
  ...new Set(OSM_RULES.filter((r) => OPEN_CLASSES.includes(r.class)).flatMap((r) => (r.subs === '*' ? [r.cls] : [...r.subs]))),
].sort();

/** Bumped when the query or the parser changes, so every kept tile is read again (DK9). */
export const DARK_CODE = 'd1';

export function darkQuery(s: number, w: number, n: number, e: number): string {
  const box = `(${s},${w},${n},${e})`;
  const kinds = OPEN_AMENITIES.join('|');
  return `[out:json][timeout:${OVERPASS_TIMEOUT_S}];way["highway"]["lit"]${box};out tags geom;`
    + `nwr["opening_hours"]["amenity"~"^(${kinds})$"]${box};out tags center;nwr["opening_hours"]["shop"]${box};out tags center;`;
}

/** DK3: what a `lit` value says: lit (yes, at times, by a sensor), unlit (no), or nothing. */
export function litOf(v: string | undefined): 'lit' | 'unlit' | 'unknown' {
  const t = (v ?? '').trim().toLowerCase();
  if (['yes', '24/7', 'automatic', 'limited', 'interval', 'sunset-sunrise', 'dusk-dawn'].includes(t) || /^\d{1,2}:\d{2}\s*-/.test(t)) return 'lit';
  // Only `no` is unlit (after-dark audit 11): a light mapped as out of use says nothing about tonight.
  if (t === 'no') return 'unlit';
  return 'unknown';
}

type Tags = Record<string, string>;

/**
 * A shop worth a mark after dark (after-dark audit 10): one presence puts in the Shops category (a place to browse), or one
 * that sells food it counts as eating; never an errand shop, a chemist, a convenience store or a supermarket, which read as havens.
 */
const openShop = (v: string | undefined) => !!v && (OPEN_AMENITIES.includes(v) || classesOfOsm('shop', v).some((c) => CLASSES[c].category === 'shops'));
interface El {
  type: string;
  id: number;
  tags?: Tags;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  geometry?: { lat: number; lon: number }[];
}

const prefix = (type: string) => (type === 'node' ? 'n' : type === 'way' ? 'w' : 'r');

/** DK8: the answer's ways and places, the tags kept as given. */
export function darkFromOverpass(json: unknown): { ways: DarkWay[]; places: DarkPlace[] } {
  const els = ((json as { elements?: El[] } | null)?.elements ?? []).filter((e) => e && e.tags);
  const ways: DarkWay[] = [];
  const places: DarkPlace[] = [];
  const seen = new Set<string>();
  for (const e of els) {
    const t = e.tags as Tags;
    const id = `${prefix(e.type)}${e.id}`;
    if (seen.has(id)) continue;
    if (e.type === 'way' && t.highway && t.lit !== undefined) {
      if (!e.geometry || e.geometry.length < 2) continue;
      const line: LngLat[] = e.geometry.map((g) => [g.lon, g.lat]);
      ways.push({ id, lit: t.lit, ...(t.name ? { name: t.name } : {}), line });
      seen.add(id);
    } else if (t.opening_hours && (openShop(t.shop) || OPEN_AMENITIES.includes(t.amenity))) {
      const p = e.type === 'node' ? (e.lat !== undefined && e.lon !== undefined ? { lat: e.lat, lon: e.lon } : null) : e.center ?? null;
      if (!p) continue;
      places.push({ id, at: [p.lon, p.lat], hours: t.opening_hours });
      seen.add(id);
    }
  }
  return { ways, places };
}
