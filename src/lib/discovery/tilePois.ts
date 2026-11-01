import type { TileFeature } from '../areas/tilePlaces';
import type { LngLat } from '../types';
import { MARK_CATEGORIES, notableName } from './noise';
import { placeKey } from './places';
import type { CategoryId, Kind, Place } from './types';

/*
 * The OpenMapTiles `poi` layer, and what each class is to the app: the v1 tab's
 * table. This is the only file that knows the tile schema; another source
 * brings its own adapter. `class` is the coarse group, `subclass` the OSM tag
 * value, and one class can mix categories (art_gallery holds artworks,
 * galleries and art shops), so both are read. Anything not listed is left out.
 */
type Rule = [subclasses: readonly string[] | '*', category: CategoryId];

const POI: Record<string, Rule[]> = {
  art_gallery: [[['artwork'], 'art'], [['art'], 'shops'], [['gallery', 'art_gallery', 'arts_centre'], 'culture']],
  restaurant: [['*', 'food']],
  cafe: [['*', 'food']],
  // Food courts are a mall's, not a find (the owner's call, Nov 2).
  fast_food: [[['fast_food'], 'food']],
  ice_cream: [['*', 'food']],
  bakery: [['*', 'food']],
  grocery: [[['deli', 'delicatessen', 'marketplace'], 'food']],
  shop: [
    [['coffee', 'chocolate', 'confectionery'], 'food'],
    [['antiques', 'second_hand', 'charity', 'gift', 'florist', 'boutique', 'jewelry', 'toys', 'outdoor', 'photo', 'stationery'], 'shops'],
  ],
  clothing_store: [[['clothes', 'bag'], 'shops']],
  library: [[['books'], 'shops'], [['library'], 'culture']],
  music: [[['music', 'musical_instrument'], 'shops']],
  monument: [['*', 'history']],
  castle: [[['castle', 'ruins'], 'history']],
  town_hall: [[['townhall', 'courthouse'], 'history']],
  cemetery: [[['cemetery', 'grave_yard'], 'history']],
  // Places of worship count as historic buildings (the owner's call).
  place_of_worship: [['*', 'history']],
  park: [[['park'], 'parks']],
  garden: [['*', 'parks']],
  dog_park: [['*', 'parks']],
  picnic_site: [['*', 'parks']],
  museum: [['*', 'culture']],
  theatre: [['*', 'culture']],
  cinema: [['*', 'culture']],
  attraction: [[['viewpoint', 'attraction'], 'viewpoints']],
  aquarium: [['*', 'viewpoints']],
  zoo: [[['zoo'], 'viewpoints']],
  theme_park: [['*', 'viewpoints']],
  bar: [[['bar', 'nightclub'], 'nightlife']],
  beer: [[['pub', 'biergarten'], 'nightlife']],
};

export function categoryOfPoi(cls: string, sub: string): CategoryId | null {
  for (const [subs, category] of POI[cls] ?? []) {
    if (subs === '*' || subs.includes(sub)) return category;
  }
  return null;
}

/** Places that count toward busy streets but are never marks (S19). */
const NEVER_MARKS = new Set(['cinema', 'dog_park', 'picnic_site']);
/** Marks only when the name says historic or notable (S20); the many plain ones are not attractions. */
const MARK_BY_NAME = new Set(['place_of_worship', 'town_hall', 'cemetery', 'library']);

function markableFor(cls: string, category: CategoryId, name: string): boolean {
  if (!MARK_CATEGORIES.includes(category) || NEVER_MARKS.has(cls)) return false;
  return !MARK_BY_NAME.has(cls) || notableName(name);
}

/** An attraction's kind for the filter (E16): the history and culture categories split finer. */
function kindFor(cls: string, category: CategoryId): Kind | undefined {
  switch (category) {
    case 'art':
      return 'public_art';
    case 'parks':
      return 'parks';
    case 'viewpoints':
      return 'viewpoints';
    case 'history':
      if (cls === 'place_of_worship') return 'churches';
      if (cls === 'cemetery') return 'cemeteries';
      return 'monuments';
    case 'culture':
      return cls === 'theatre' ? 'theatres' : 'museums';
    default:
      return undefined;
  }
}

/** Unnamed places worth keeping, by subclass, and the label they show (D4). */
const GENERIC: Record<string, string> = { artwork: 'Public art', viewpoint: 'A viewpoint' };

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
    const category = categoryOfPoi(cls, sub);
    if (!category) continue;
    const raw = typeof props.name === 'string' ? props.name.trim() : '';
    const generic = !raw;
    if (generic && !GENERIC[sub]) continue;
    // The poi layer is points; a feature with several is kept at its first.
    const c = (type === 'MultiPoint' ? (f.geometry.coordinates as LngLat[])[0] : f.geometry.coordinates) as LngLat;
    if (!Array.isArray(c) || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) continue;
    const at: LngLat = [c[0], c[1]];
    const key = placeKey(category, generic ? null : raw, at);
    const name = generic ? GENERIC[sub] : raw;
    if (out.has(key)) continue;
    const markable = markableFor(cls, category, name);
    const kind = markable ? kindFor(cls, category) : undefined;
    out.set(key, { key, name, category, at, generic, build, markable, ...(kind ? { kind } : {}) });
  }
  return [...out.values()];
}

/** Transit the landing prefers to start from (L7): railway stations and halts, bus stations, ferry terminals. */
const TRANSIT: Record<string, readonly string[]> = {
  railway: ['station', 'halt', 'subway', 'light_rail'],
  bus: ['bus_station'],
  ferry_terminal: ['ferry_terminal'],
};

export function transitFromTilePois(features: (TileFeature & { zoom?: number })[]): LngLat[] {
  const out = new Map<string, LngLat>();
  for (const f of features) {
    if (f.geometry?.type !== 'Point') continue;
    const props = f.properties ?? {};
    if (!TRANSIT[String(props.class ?? '')]?.includes(String(props.subclass ?? ''))) continue;
    const [lon, lat] = f.geometry.coordinates as LngLat;
    out.set(`${lon.toFixed(5)},${lat.toFixed(5)}`, [lon, lat]);
  }
  return [...out.values()];
}
