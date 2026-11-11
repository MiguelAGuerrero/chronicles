// @layer core
import type { TileFeature } from '../areas/tilePlaces';
import { ARCHIVE_CLASS_NAMES, classDef, classesOfArchive, markClassOf, named } from '../presence/presence';
import type { LngLat } from '../types';
import { isMarkFor } from './curation';
import { placeKey } from './places';
import type { CategoryId, Kind, Place } from './types';

/*
 * The places archive's schema (decision 0103): the only file that knows it, as `tilePois.ts` knows the map
 * tiles'. Each feature is a point with `name`, `class` (the build script's own vocabulary, PW6), `src` and an
 * `id` for deduping (PW7). What each class is lives in presence (`classesOfArchive`, specs/presence-readers PS1).
 */

/**
 * PW5: the archive's classes, each to one category and kind, as presence reads them. A test pins it: a new class is a
 * deliberate change (in presence's archive table).
 */
export const ARCHIVE_CLASSES: Record<string, readonly [CategoryId, Kind]> = Object.fromEntries(
  ARCHIVE_CLASS_NAMES.map((cls) => {
    const def = classDef(markClassOf(classesOfArchive(cls))!);
    return [cls, [def.category!, def.kind!] as const];
  }),
);

/** One archive place as the app's `Place`: its classes from presence, its mark from curation, tagged with the archive's version. */
export function archivePlace(name: string, cls: string, at: LngLat, version: string): Place | null {
  const n = name.trim();
  const mark = markClassOf(classesOfArchive(cls));
  const category = mark ? classDef(mark).category : undefined;
  if (!mark || !category || !n || !Number.isFinite(at[0]) || !Number.isFinite(at[1])) return null;
  const classes = named(classesOfArchive(cls), n);
  const kind = classDef(mark).kind;
  return { key: placeKey(category, n, at), name: n, category, at: [at[0], at[1]], generic: false, build: version, markable: isMarkFor(classes), classes, ...(kind ? { kind } : {}) };
}

/** PW5, PW9: an archive tile's points as places; an unnamed place or an unknown class is left out. */
export function placesFromArchive(features: TileFeature[], version: string): Place[] {
  const out = new Map<string, Place>();
  for (const f of features) {
    if (f.geometry?.type !== 'Point') continue;
    const p = f.properties ?? {};
    const name = typeof p.name === 'string' ? p.name : '';
    const place = archivePlace(name, String(p.class ?? ''), f.geometry.coordinates as LngLat, version);
    if (place && !out.has(place.key)) out.set(place.key, place);
  }
  return [...out.values()];
}
