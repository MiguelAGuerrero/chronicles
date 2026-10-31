import type { TileFeature } from '../areas/tilePlaces';
import type { LngLat } from '../types';
import { placeKey } from './places';
import type { CategoryId, Place } from './types';

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
  fast_food: [[['fast_food', 'food_court'], 'food']],
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

/** Unnamed places worth keeping, and the label they show (D4). */
const GENERIC: Partial<Record<CategoryId, string>> = { art: 'Public art', viewpoints: 'A viewpoint' };

/**
 * Places from the tiles' POI points, one per place however many tiles carried
 * it (D5). A read that isn't complete (below z14) yields nothing to cache (D2).
 */
export function placesFromTilePois(features: TileFeature[], build: string, opts: { complete?: boolean } = {}): Place[] {
  if (opts.complete === false) return [];
  const out = new Map<string, Place>();
  for (const f of features) {
    if (f.geometry?.type !== 'Point') continue;
    const props = f.properties ?? {};
    const category = categoryOfPoi(String(props.class ?? ''), String(props.subclass ?? ''));
    if (!category) continue;
    const raw = typeof props.name === 'string' ? props.name.trim() : '';
    const generic = !raw;
    if (generic && !GENERIC[category]) continue;
    const c = f.geometry.coordinates as LngLat;
    if (!Array.isArray(c) || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) continue;
    const at: LngLat = [c[0], c[1]];
    const key = placeKey(category, generic ? null : raw, at);
    if (!out.has(key)) out.set(key, { key, name: generic ? GENERIC[category]! : raw, category, at, generic, build });
  }
  return [...out.values()];
}
