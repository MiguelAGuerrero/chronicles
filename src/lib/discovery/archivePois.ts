// @layer core
import type { TileFeature } from '../areas/tilePlaces';
import type { LngLat } from '../types';
import { placeKey } from './places';
import type { CategoryId, Kind, Place } from './types';

/*
 * The places archive's schema (decision 0103): the only file that knows it, as `tilePois.ts` knows the map
 * tiles'. Each feature is a point with `name`, `class` (the build script's own vocabulary, PW6), `src` and an
 * `id` for deduping (PW7); the app maps the class to a category and kind here.
 */

/** PW5: the archive's classes, each to one category and kind. A test pins it: a new class is a deliberate change. */
export const ARCHIVE_CLASSES: Record<string, readonly [CategoryId, Kind]> = {
  folly: ['viewpoints', 'curiosities'],
  novelty_building: ['viewpoints', 'curiosities'],
  roadside_giant: ['viewpoints', 'curiosities'],
  natural_oddity: ['viewpoints', 'curiosities'],
  odd_engineering: ['viewpoints', 'curiosities'],
  marks_a_fact: ['viewpoints', 'curiosities'],
  art_environment: ['viewpoints', 'curiosities'],
  ruin: ['viewpoints', 'curiosities'],
  monument: ['history', 'monuments'],
  memorial: ['history', 'monuments'],
  statue: ['history', 'monuments'],
  marker: ['history', 'monuments'],
  mural: ['art', 'public_art'],
  sculpture: ['art', 'public_art'],
  overlook: ['viewpoints', 'viewpoints'],
  tower: ['viewpoints', 'viewpoints'],
  // RP8 (decision 0104): listed places by type; a listed building or structure of any other type is Buildings and structures.
  church: ['history', 'churches'],
  cemetery: ['history', 'cemeteries'],
  theatre: ['culture', 'theatres'],
  museum: ['culture', 'museums'],
  heritage_building: ['history', 'structures'],
  // Audit 10 (the owner, Nov 9): a listed site, battlefield or wreck is no building.
  historic_site: ['history', 'monuments'],
};

/** One archive place as the app's `Place`: a mark of its class's kind, tagged with the archive's version. */
export function archivePlace(name: string, cls: string, at: LngLat, version: string): Place | null {
  const mapped = ARCHIVE_CLASSES[cls];
  const n = name.trim();
  if (!mapped || !n || !Number.isFinite(at[0]) || !Number.isFinite(at[1])) return null;
  const [category, kind] = mapped;
  return { key: placeKey(category, n, at), name: n, category, at: [at[0], at[1]], generic: false, build: version, markable: true, kind };
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
