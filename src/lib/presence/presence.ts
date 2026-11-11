// @layer core
import type { CategoryId, Kind } from '../discovery/types';

/*
 * Presence (decision 0140, specs/presence): what a place is, said once. Each source's adapter hands presence a feature's
 * tags; presence answers with classes from one vocabulary; each consumer derives what it needs from the classes: density
 * a weight (AD1), marks and bars a category and kind. This is the only file that holds a table from OpenMapTiles poi
 * classes or Overture's taxonomy to what a place is (PR2). What makes a mark is curation over classes, kept apart
 * (`discovery/curation.ts`, PR7). "Busy" is not presence: traffic, if it ever comes, is a signal of its own (0140).
 */

/** The version of the vocabulary and its tables: part of the atlas's and the landing's cache codes (PR6). Bump on any change here. */
export const PRESENCE_CODE = 'p1';

const FULL = 1;
const HALF = 0.5;
const QUARTER = 0.25;

/**
 * The vocabulary. `weight` is how much the class counts toward a street's density (AD1: full for a place to go, half for
 * everyday services and civic places, a quarter for offices and vehicles); `category` and `kind` are what it is to marks
 * and bars, where it is one of the tab's kinds.
 */
const DEFS = {
  // Places to go: shops, food, drink, what is shown.
  shop: { weight: FULL },
  boutique: { weight: FULL, category: 'shops' },
  eatery: { weight: FULL, category: 'food' },
  food_counter: { weight: FULL },
  drink: { weight: FULL, category: 'nightlife' },
  venue: { weight: FULL },
  artwork: { weight: FULL, category: 'art', kind: 'public_art' },
  museum: { weight: FULL, category: 'culture', kind: 'museums' },
  arts_centre: { weight: FULL, category: 'culture', kind: 'community' },
  theatre: { weight: FULL, category: 'culture', kind: 'theatres' },
  cinema: { weight: FULL, category: 'culture' },
  monument: { weight: FULL, category: 'history', kind: 'monuments' },
  memorial: { weight: FULL, category: 'history', kind: 'monuments' },
  heritage: { weight: FULL },
  attraction: { weight: FULL, category: 'viewpoints', kind: 'viewpoints' },
  // Everyday and civic places, green and views.
  community: { weight: HALF, category: 'culture', kind: 'community' },
  civic_hall: { weight: HALF, category: 'history', kind: 'monuments' },
  worship: { weight: HALF, category: 'history', kind: 'churches' },
  cemetery: { weight: HALF, category: 'history', kind: 'cemeteries' },
  park: { weight: HALF, category: 'parks', kind: 'parks' },
  nature_reserve: { weight: HALF, category: 'parks', kind: 'parks' },
  green_amenity: { weight: HALF, category: 'parks' },
  open_space: { weight: HALF },
  viewpoint: { weight: HALF, category: 'viewpoints', kind: 'viewpoints' },
  service: { weight: HALF },
  health: { weight: HALF },
  lodging: { weight: HALF },
  civic: { weight: HALF },
  sport: { weight: HALF },
  // Offices and vehicles; and what is no place to go.
  office: { weight: QUARTER },
  vehicle: { weight: QUARTER },
  none: { weight: 0 },
} as const satisfies Record<string, ClassDef>;

export type ClassDef = { readonly weight: number; readonly category?: CategoryId; readonly kind?: Kind };
export type PresenceClass = keyof typeof DEFS;
export const CLASSES: Readonly<Record<PresenceClass, ClassDef>> = DEFS;
export const classDef = (c: PresenceClass): ClassDef => CLASSES[c];

/** A class's tags under one poi class: listed subclasses, or every subclass ('*'). The first rule that holds wins. */
type Rule = [subclasses: readonly string[] | '*', cls: PresenceClass];

/** OpenMapTiles poi class and subclass to presence (the tab's v1 table, then density's AD1 table, made one). */
const OSM: Record<string, Rule[]> = {
  art_gallery: [[['artwork'], 'artwork'], [['art'], 'boutique'], [['gallery', 'art_gallery'], 'museum'], [['arts_centre'], 'arts_centre']],
  restaurant: [['*', 'eatery']],
  cafe: [['*', 'eatery']],
  // Food courts are a mall's, not a find (the owner's call, Nov 2).
  fast_food: [[['fast_food'], 'eatery']],
  ice_cream: [['*', 'eatery']],
  bakery: [['*', 'eatery']],
  grocery: [[['deli', 'delicatessen', 'marketplace'], 'eatery']],
  shop: [
    [['coffee', 'chocolate', 'confectionery'], 'eatery'],
    [['antiques', 'second_hand', 'charity', 'gift', 'florist', 'boutique', 'jewelry', 'toys', 'outdoor', 'photo', 'stationery'], 'boutique'],
    // TP11: a shopping centre or department store is a destination, one place of Shops. Supermarkets and errand shops stay out.
    [['mall', 'department_store'], 'boutique'],
  ],
  department_store: [['*', 'boutique']],
  clothing_store: [[['clothes', 'bag'], 'boutique']],
  // A library's books are a shop; the library itself is a place of Culture to find by a notable name (PK11).
  library: [[['books'], 'boutique'], [['library'], 'community']],
  music: [[['music', 'musical_instrument'], 'boutique']],
  monument: [['*', 'monument']],
  castle: [[['castle', 'ruins'], 'monument']],
  // PK11, PK12: a community centre is a place of Culture.
  town_hall: [[['townhall', 'courthouse'], 'civic_hall'], [['community_centre'], 'community']],
  cemetery: [[['cemetery', 'grave_yard'], 'cemetery']],
  // Places of worship count as historic buildings (the owner's call).
  place_of_worship: [['*', 'worship']],
  park: [[['park'], 'park'], [['nature_reserve'], 'nature_reserve']],
  garden: [['*', 'park']],
  dog_park: [['*', 'green_amenity']],
  picnic_site: [['*', 'green_amenity']],
  museum: [['*', 'museum']],
  theatre: [['*', 'theatre']],
  cinema: [['*', 'cinema']],
  attraction: [[['viewpoint'], 'viewpoint'], [['attraction'], 'attraction']],
  aquarium: [['*', 'attraction']],
  // RP15: the National Aviary is OSM's zoo=aviary (the owner, Nov 9).
  zoo: [[['zoo', 'aviary'], 'attraction']],
  theme_park: [['*', 'attraction']],
  bar: [[['bar', 'nightclub'], 'drink']],
  beer: [[['pub', 'biergarten'], 'drink']],
  // PR5: tags the old tables answered differently, each given the class its like already had.
  memorial: [['*', 'memorial']],
  nature_reserve: [['*', 'nature_reserve']],
  arts_centre: [['*', 'arts_centre']],
  community_centre: [['*', 'community']],
  viewpoint: [['*', 'viewpoint']],
  florist: [['*', 'boutique']],
  jewelry: [['*', 'boutique']],
  gift: [['*', 'boutique']],
  toys: [['*', 'boutique']],
  stationery: [['*', 'boutique']],
  books: [['*', 'boutique']],
  marketplace: [['*', 'eatery']],
};

/** Subclasses that are the same thing under whatever poi class carries them, where no rule above holds. */
const OSM_SUBCLASS: Record<string, PresenceClass> = {
  // A shop that is a service.
  massage: 'service', tailor: 'service', locksmith: 'service', copyshop: 'service', optician: 'service', hearing_aids: 'service',
  beauty: 'service', hairdresser: 'service', travel_agency: 'office',
  books: 'boutique', library: 'civic', viewpoint: 'service', food_court: 'food_counter',
  // Not places to go; an empty storefront is no activity (activity-density audit 12).
  post_box: 'none', parcel_locker: 'none', charging_station: 'none', vacant: 'none', disused: 'none',
};

/** A poi class's class when none of its rules and no subclass holds. A class not listed is no place to go. */
const OSM_DEFAULT: Record<string, PresenceClass> = {
  shop: 'shop', clothing_store: 'shop', grocery: 'shop', alcohol_shop: 'shop', music: 'shop', furniture: 'shop', garden_centre: 'shop',
  hardware: 'shop', shoes: 'shop', sports: 'shop', pet: 'shop', mobile_phone: 'shop', bicycle: 'shop', chemist: 'shop', beer: 'shop',
  fast_food: 'food_counter',
  bar: 'venue', art_gallery: 'venue', attraction: 'venue', zoo: 'venue',
  castle: 'heritage',
  laundry: 'service', bank: 'service',
  pharmacy: 'health', doctors: 'health', dentist: 'health', hospital: 'health', clinic: 'health', veterinary: 'health',
  post: 'civic', town_hall: 'civic', library: 'civic', police: 'civic', fire_station: 'civic', cemetery: 'civic',
  park: 'open_space',
  lodging: 'lodging',
  fitness_centre: 'sport', sports_centre: 'sport', stadium: 'sport',
  office: 'office',
  car: 'vehicle', fuel: 'vehicle', car_wash: 'vehicle', motorcycle: 'vehicle',
};

/** PR1: what an OpenMapTiles poi is: its class's own rules, else its subclass's, else its class's default. */
export function classesOfOsm(cls: string, sub: string): PresenceClass[] {
  for (const [subs, c] of OSM[cls] ?? []) if (subs === '*' || subs.includes(sub)) return [c];
  const bySub = OSM_SUBCLASS[sub];
  if (bySub) return [bySub];
  const byClass = OSM_DEFAULT[cls];
  return byClass ? [byClass] : [];
}

/** Every rule of the poi table, for listing what can make a mark (AG5). */
export const OSM_RULES: readonly { cls: string; subs: readonly string[] | '*'; class: PresenceClass }[] = [
  ...Object.entries(OSM).flatMap(([cls, rules]) => rules.map(([subs, c]) => ({ cls, subs, class: c }))),
  ...Object.entries(OSM_SUBCLASS).filter(([sub]) => !(sub in OSM)).map(([sub, c]) => ({ cls: sub, subs: [sub] as readonly string[], class: c })),
];

/** Overture's taxonomy: the top level, then exceptions at any deeper level; places Overture holds feed density, never marks (0109). */
const OVERTURE_ROOT: Record<string, PresenceClass> = {
  food_and_drink: 'eatery', shopping: 'shop', arts_and_entertainment: 'venue', cultural_and_historic: 'heritage',
  lifestyle_services: 'service', health_care: 'health', lodging: 'lodging', community_and_government: 'civic', sports_and_recreation: 'sport',
  services_and_business: 'office',
};
const OVERTURE_DEEPER: Record<string, PresenceClass> = {
  vehicle_dealer: 'vehicle',
  place_of_worship: 'worship', religious_organization: 'worship',
  bank_or_credit_union: 'service', laundry_service: 'service',
  public_utility: 'none', sport_league: 'none',
  // Schools count nothing, but a library is civic (activity-density audit 12).
  library: 'civic',
  // Travel and transportation counts only for vehicle services and travel agents.
  vehicle_service: 'vehicle', fueling_station: 'vehicle', travel_service: 'office',
};
/** Any level naming one of these is no place to go (AD1: ATMs, parking). */
const OVERTURE_NEVER = new Set(['atm', 'parking', 'parking_lot', 'parking_garage', 'bus_stop', 'charging_station']);

/** PR1: what an Overture place is, from its taxonomy hierarchy (root first): the deepest level with a rule of its own, else the root. */
export function classesOfOverture(hierarchy: readonly string[]): PresenceClass[] {
  if (!hierarchy.length || hierarchy.some((h) => OVERTURE_NEVER.has(h))) return [];
  for (let i = hierarchy.length - 1; i >= 1; i--) if (hierarchy[i] in OVERTURE_DEEPER) return [OVERTURE_DEEPER[hierarchy[i]]];
  const root = OVERTURE_ROOT[hierarchy[0]];
  return root ? [root] : [];
}

/** PR4: how much a feature counts toward density: the greatest weight of its classes. */
export function densityWeight(classes: readonly PresenceClass[]): number {
  return classes.reduce((w, c) => Math.max(w, CLASSES[c].weight), 0);
}

/** PR3: the class marks and bars read: the first with a category, or null. */
export function markClassOf(classes: readonly PresenceClass[]): PresenceClass | null {
  return classes.find((c) => CLASSES[c].category != null) ?? null;
}
