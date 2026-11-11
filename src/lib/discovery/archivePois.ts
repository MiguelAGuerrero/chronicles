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
  // RP8 (decisions 0109, 0111; contract v2, chronicles-data's RD13): listed places by type; any other listed building
  // or structure is Buildings and structures (`heritage_building` until v2).
  church: ['history', 'churches'],
  cemetery: ['history', 'cemeteries'],
  theatre: ['culture', 'theatres'],
  museum: ['culture', 'museums'],
  historic_site: ['history', 'monuments'],
  building_structure: ['history', 'structures'],
};

/**
 * PK1, PK19: bars an archive class lights beside its own category. The archive's `museum` is a museum that entered by its
 * listing (contract v2, chronicles-data's RD8), so it lights History too; a new contract version (PP17) revisits this.
 */
export const ARCHIVE_ALSO: Partial<Record<string, readonly CategoryId[]>> = { museum: ['history'] };

/**
 * OL11 (decision 0142, contract v3): the classes whose places may have no name, because OpenStreetMap's monuments and
 * memorials often carry none. Any other class still needs a name.
 */
export const UNNAMED_CLASSES: ReadonlySet<string> = new Set(['monument', 'memorial', 'statue']);
/** What an unnamed monument is called (the owner, Nov 11): the words, as with "A viewpoint"; never "unnamed", never a count. */
export const UNNAMED_LABEL = 'A monument';

/**
 * One archive place as the app's `Place`: a mark of its class's kind, tagged with the archive's version. A place with
 * no name is a generic one (like an unnamed viewpoint): keyed by its position and called "A monument".
 */
export function archivePlace(name: string, cls: string, at: LngLat, version: string): Place | null {
  const mapped = ARCHIVE_CLASSES[cls];
  const n = name.trim();
  const generic = !n;
  if (!mapped || (generic && !UNNAMED_CLASSES.has(cls)) || !Number.isFinite(at[0]) || !Number.isFinite(at[1])) return null;
  const [category, kind] = mapped;
  const also = ARCHIVE_ALSO[cls];
  return { key: placeKey(category, generic ? null : n, at), name: generic ? UNNAMED_LABEL : n, category, at: [at[0], at[1]], generic, build: version, markable: true, kind, ...(also ? { alsoBars: [...also] } : {}) };
}

/** PW5, PW9, OL11: an archive tile's points as places; an unknown class, or an unnamed place of a class that needs a name, is left out. */
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
