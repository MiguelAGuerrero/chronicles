// @layer core
import type { TileFeature } from '../areas/tilePlaces';
import type { LngLat } from '../types';
import { classDef, classesOfOsm, isTransitStop, markClassOf, named, OSM_RULES, unnamedLabel } from '../presence/presence';
import { BY_NAME, isMarkFor, markableClass } from './curation';
import { placeKey } from './places';
import type { CategoryId, Place } from './types';

/*
 * The OpenMapTiles `poi` layer's adapter: it reads a point's class, subclass and name, and asks presence what the place is
 * (decision 0140, `presence/presence.ts`, the only table from poi classes to what a place is). Marks and bars read the
 * class's category and kind; what makes a mark is curation over classes (`curation.ts`).
 */

/** PR3: a poi's category for marks and bars, from its presence class, or null where it is none of the tab's. */
export function categoryOfPoi(cls: string, sub: string): CategoryId | null {
  const c = markClassOf(classesOfOsm(cls, sub));
  return c ? classDef(c).category ?? null : null;
}

/**
 * AG5: every class and subclass this adapter can make a mark, with its kind and whether
 * only a notable name makes it one. The definition of a mark is in specs/atlas-grading;
 * a test pins this list, so a new markable class is a deliberate change.
 */
export const MARKABLE_CLASSES: readonly { cls: string; sub: string; category: CategoryId; byName: boolean }[] = OSM_RULES.flatMap((r) =>
  !markableClass(r.class)
    ? []
    : (r.subs === '*' ? ['*'] : r.subs).map((sub) => ({ cls: r.cls, sub, category: classDef(r.class).category!, byName: BY_NAME.has(r.class) })));

/** The tiles' top zoom: every POI is in it, and parent tiles snap points to a coarser grid. */
const POI_ZOOM = 14;

/**
 * Places from the tiles' POI points, one per place however many tiles carried
 * it (D5). A read that isn't complete (below z14) yields nothing to cache (D2).
 */
export function placesFromTilePois(features: (TileFeature & { zoom?: number })[], build: string, opts: { complete?: boolean } = {}): Place[] {
  if (opts.complete === false) return [];
  const out = new Map<string, Place>();
  for (const f of features) {
    // Parent tiles still on screen while z14 loads are left out (D2).
    if (f.zoom != null && f.zoom !== POI_ZOOM) continue;
    const type = f.geometry?.type;
    if (type !== 'Point' && type !== 'MultiPoint') continue;
    const props = f.properties ?? {};
    const sub = String(props.subclass ?? '');
    const cls = String(props.class ?? '');
    const pc = markClassOf(classesOfOsm(cls, sub));
    const category = pc ? classDef(pc).category : undefined;
    if (!pc || !category) continue;
    const raw = typeof props.name === 'string' ? props.name.trim() : '';
    const generic = !raw;
    const label = generic ? unnamedLabel(sub) : null;
    if (generic && !label) continue;
    // The poi layer is points; a feature with several is kept at its first.
    const c = (type === 'MultiPoint' ? (f.geometry.coordinates as LngLat[])[0] : f.geometry.coordinates) as LngLat;
    if (!Array.isArray(c) || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) continue;
    const at: LngLat = [c[0], c[1]];
    const key = placeKey(category, generic ? null : raw, at);
    const name = label ?? raw;
    if (out.has(key)) continue;
    // PS2, PS3: the name's classes beside the tags' (a historic name; a historic museum).
    const classes = named(classesOfOsm(cls, sub), name);
    const markable = isMarkFor(classes);
    const kind = markable ? classDef(pc).kind : undefined;
    out.set(key, { key, name, category, at, generic, build, markable, classes, ...(kind ? { kind } : {}) });
  }
  return [...out.values()];
}

/** Transit the landing prefers to start from (L7): what is a stop is presence's (`isTransitStop`). */
export function transitFromTilePois(features: (TileFeature & { zoom?: number })[]): LngLat[] {
  const out = new Map<string, LngLat>();
  for (const f of features) {
    if (f.geometry?.type !== 'Point') continue;
    const props = f.properties ?? {};
    if (!isTransitStop(String(props.class ?? ''), String(props.subclass ?? ''))) continue;
    const [lon, lat] = f.geometry.coordinates as LngLat;
    out.set(`${lon.toFixed(5)},${lat.toFixed(5)}`, [lon, lat]);
  }
  return [...out.values()];
}
