// @layer core
import type { TileFeature } from '../areas/tilePlaces';
import { projector } from '../geo';
import type { LngLat } from '../types';
import { osmWeight, overtureWeight } from './weights';

/**
 * A place as density sees it (AD1): where it is, how much it counts, its name
 * (to match it across sources) and where it came from. Nothing else: density
 * never needs a place's kind or key, and these are never stored.
 */
export interface ActivityPoint {
  at: LngLat;
  weight: number;
  name: string | null;
  source: 'osm' | 'overture';
}

/** The tiles' top zoom: every POI is in it; parent tiles snap points to a coarser grid. */
const POI_ZOOM = 14;

/** AD1: every POI of a kind that counts, named or not, once however many tiles carried it. */
export function activityFromTilePois(features: (TileFeature & { zoom?: number })[]): ActivityPoint[] {
  const out = new Map<string, ActivityPoint>();
  for (const f of features) {
    if (f.zoom != null && f.zoom !== POI_ZOOM) continue;
    const type = f.geometry?.type;
    if (type !== 'Point' && type !== 'MultiPoint') continue;
    const props = f.properties ?? {};
    const weight = osmWeight(String(props.class ?? ''), String(props.subclass ?? ''));
    if (!weight) continue;
    const c = (type === 'MultiPoint' ? (f.geometry.coordinates as LngLat[])[0] : f.geometry.coordinates) as LngLat;
    if (!Array.isArray(c) || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) continue;
    const name = typeof props.name === 'string' && props.name.trim() ? props.name.trim() : null;
    const key = `${name ?? ''}|${props.class}|${props.subclass}|${c[0].toFixed(5)},${c[1].toFixed(5)}`;
    if (!out.has(key)) out.set(key, { at: [c[0], c[1]], weight, name, source: 'osm' });
  }
  return [...out.values()];
}

/** An Overture place, as read from its tile: only what density reads. */
export interface OverturePlace {
  id: string;
  name: string | null;
  at: LngLat;
  /** The taxonomy's hierarchy, root first. */
  hierarchy: string[];
  confidence: number;
  operating_status: string | null;
}

const parse = (s: unknown): unknown => {
  if (typeof s !== 'string') return s ?? null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

/** Overture's `place` layer, decoded: one place per id however many tiles carried it (AD4). */
export function overturePlacesFromTile(features: TileFeature[]): OverturePlace[] {
  const out = new Map<string, OverturePlace>();
  for (const f of features) {
    if (f.geometry?.type !== 'Point') continue;
    const p = f.properties ?? {};
    const id = String(p.id ?? '');
    if (!id || out.has(id)) continue;
    const c = f.geometry.coordinates as LngLat;
    if (!Number.isFinite(c[0]) || !Number.isFinite(c[1])) continue;
    const tax = parse(p.taxonomy) as { hierarchy?: unknown } | null;
    const hierarchy = Array.isArray(tax?.hierarchy) ? tax!.hierarchy.map(String) : [];
    const name = typeof p['@name'] === 'string' && p['@name'].trim() ? p['@name'].trim() : null;
    const status = typeof p.operating_status === 'string' ? p.operating_status : null;
    out.set(id, { id, name, at: [c[0], c[1]], hierarchy, confidence: Number(p.confidence) || 0, operating_status: status });
  }
  return [...out.values()];
}

/** AD4: Overture places count only at this confidence or above. */
export const OVERTURE_MIN_CONFIDENCE = 0.8;

/** AD1, AD4: whether an Overture place counts: sure enough, not closed, of a kind that weighs something. */
export const countsOverture = (p: OverturePlace) =>
  p.confidence >= OVERTURE_MIN_CONFIDENCE && (!p.operating_status || p.operating_status === 'open') && overtureWeight(p.hierarchy) > 0;

/** AD1, AD4: Overture places that count, at their weight. */
export function activityFromOverture(places: OverturePlace[]): ActivityPoint[] {
  return places.filter(countsOverture).map((p) => ({ at: p.at, weight: overtureWeight(p.hierarchy), name: p.name, source: 'overture' as const }));
}

/** A name to compare across sources: case, accents, apostrophes and punctuation off. */
export function matchName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** AD5: the same place is the same name, or one inside the other, within this. */
export const SAME_PLACE_M = 60;
/** A name shorter than this is never matched by containment ("Steak" isn't Joe's Steak Shop). */
const MIN_CONTAINED = 6;

/** One name's words are the other's first words ("CVS" and "CVS Pharmacy"; activity-density audit 11). */
const leadingWords = (a: string, b: string) => {
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.length >= 3 && (long === short || long.startsWith(`${short} `));
};
const sameName = (a: string, b: string) =>
  a === b || leadingWords(a, b) || (Math.min(a.length, b.length) >= MIN_CONTAINED && (a.includes(b) || b.includes(a)));

/**
 * AD5: OSM and Overture together, each place once. An Overture place matching a
 * named OSM place within 60 m (the same name, one's words leading the other's, or
 * one inside the other) is left out; the OSM one keeps the higher weight. Each OSM
 * place takes in one Overture place at most.
 */
export function mergeSources(osm: ActivityPoint[], overture: ActivityPoint[]): ActivityPoint[] {
  if (!overture.length) return osm;
  if (!osm.length) return overture;
  const to = projector(osm[0].at);
  const cell = SAME_PLACE_M;
  const buckets = new Map<string, number[]>();
  const kept = osm.map((p) => ({ ...p }));
  const names = kept.map((p) => (p.name ? matchName(p.name) : null));
  kept.forEach((p, i) => {
    if (!names[i]) return;
    const [x, y] = to(p.at);
    const k = `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
    (buckets.get(k) ?? buckets.set(k, []).get(k)!).push(i);
  });
  const out = kept;
  const absorbed = new Set<number>();
  for (const p of overture) {
    const n = p.name ? matchName(p.name) : null;
    let twin = -1;
    if (n) {
      const [x, y] = to(p.at);
      const cx = Math.floor(x / cell);
      const cy = Math.floor(y / cell);
      search: for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++)
          for (const i of buckets.get(`${cx + dx},${cy + dy}`) ?? []) {
            const [ox, oy] = to(kept[i].at);
            // One OSM place takes in at most one Overture place (activity-density audit 11).
            if (!absorbed.has(i) && Math.hypot(ox - x, oy - y) <= SAME_PLACE_M && sameName(n, names[i]!)) {
              twin = i;
              break search;
            }
          }
    }
    if (twin >= 0) {
      absorbed.add(twin);
      kept[twin].weight = Math.max(kept[twin].weight, p.weight);
    }
    else out.push(p);
  }
  return out;
}
