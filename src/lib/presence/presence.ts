// @layer core
import type { CategoryId, Kind } from '../discovery/types';
import { notableBeyondNeighbourhood, notableName } from './notable';

/*
 * Presence (decision 0140, specs/presence): what a place is, said once. Each source's adapter hands presence a feature's
 * tags; presence answers with classes from one vocabulary; each consumer derives what it needs from the classes: density
 * a weight (AD1), marks and bars a category and kind. This is the only file that holds a table from OpenMapTiles poi
 * classes, Overture's taxonomy, the places archive's classes or the tiles' landcover to what a place is (PR2, PS1, PS4, PS7).
 * What makes a mark is curation over classes, kept apart (`discovery/curation.ts`, PR7). Storefronts are presence's own
 * reading (specs/storefronts); traffic, if it ever comes, is a signal of its own (0140).
 */

/**
 * The version of the vocabulary and its tables: part of the atlas's and the landing's cache codes (PR6). Bump on any change here.
 * p2: the archive, names and landcover read here (specs/presence-readers); nothing derived changed, so p1 rows are carried (PS9).
 * p3: only storefronts weigh toward density (specs/storefronts SF10, decision 0180); a weight changed, so nothing is carried (SF11).
 * p4: small places (specs/small-places SP12, SP13): presence's small classes with their subset and bar weight; a weight
 *     changed, so nothing is carried.
 * p5: a neighbourhood's "Old Town" and "old and new" are read past after `normalizeWords`, for a museum's History and a
 *     community park alike ("Old-Town", "Old&New", "Olde Towne"; decision 0172, tend presence 1 and audit 1); what an
 *     area derives may move, so nothing is carried and every area is derived again.
 * p6: subtypes (specs/explore-subtypes, decision 0191): contract v4's classes, each its kind's subtype with a bar weight;
 *     the map's ruins are Ruins, its zoos and attractions their own kind; weights and kinds changed, so nothing is carried.
 */
export const PRESENCE_CODE = 'p6';

/**
 * PS9, presence-readers audit 2: the codes whose rows stand under this one, read by the atlas (`CARRIED`, `atlas.ts`) and the
 * landing (`LANDING_CARRIED`, `landing/view.ts`). Only ever the code just before, and only when the golden tables show
 * nothing derived changed; empty it at a bump that changes a bar, a mark or a weight.
 */
export const PRESENCE_CARRIED: readonly string[] = [];

const FULL = 1;
const HALF = 0.5;
const QUARTER = 0.25;

/**
 * The vocabulary. `weight` is how much the class counts (AD1: full for a place to go, half for everyday services and civic
 * places, a quarter for offices and vehicles); `storefront` is whether it is a place you walk into, the only classes that
 * weigh toward a street's storefronts (specs/storefronts SF10, decision 0180: parks, monuments, art, views, curiosities,
 * listed structures and cemeteries are places to find, never storefronts); `category` and `kind` are what it is to marks
 * and bars, where it is one of the tab's kinds.
 */
const DEFS = {
  // Places to go: shops, food, drink, what is shown.
  shop: { weight: FULL, storefront: true },
  boutique: { weight: FULL, storefront: true, category: 'shops' },
  eatery: { weight: FULL, storefront: true, category: 'food' },
  food_counter: { weight: FULL, storefront: true },
  drink: { weight: FULL, storefront: true, category: 'nightlife' },
  venue: { weight: FULL, storefront: true },
  artwork: { weight: FULL, category: 'art', kind: 'public_art' },
  museum: { weight: FULL, storefront: true, category: 'culture', kind: 'museums' },
  arts_centre: { weight: FULL, storefront: true, category: 'culture', kind: 'community' },
  theatre: { weight: FULL, storefront: true, category: 'culture', kind: 'theatres' },
  cinema_hall: { weight: FULL, storefront: true, category: 'culture' },
  monument: { weight: FULL, category: 'history', kind: 'monuments' },
  memorial_site: { weight: FULL, category: 'history', kind: 'monuments' },
  // The places archive's odd places and listed buildings (PW4, RP8).
  curiosity: { weight: FULL, category: 'viewpoints', kind: 'curiosities' },
  structure: { weight: FULL, category: 'history', kind: 'structures' },
  heritage: { weight: FULL, storefront: true },
  // explore-subtypes audit 12: the map's attractions stay with Viewpoints ("Viewpoints and attractions"); zoos have their own kind.
  attraction: { weight: FULL, storefront: true, category: 'viewpoints', kind: 'viewpoints' },
  // Small places (specs/small-places, decision 0183): each a subset of its kind (`subset`, a switch in "What I'm into"),
  // weighing in a bar by the size of the stop (`bar`); none is a storefront (SP14). A community garden has no switch.
  plaque: { weight: QUARTER, bar: QUARTER, category: 'history', kind: 'monuments', subset: 'plaques' },
  // Subtypes (specs/explore-subtypes, decision 0191): contract v4's classes, each a subtype of its kind, weighed by the
  // size of the stop (`bar`); a place you walk into is a storefront (XS16).
  // explore-subtypes audit 13: a marker is a small stop, a quarter as a plaque.
  marker: { weight: QUARTER, bar: QUARTER, category: 'history', kind: 'monuments', subset: 'markers' },
  war_memorial: { weight: FULL, category: 'history', kind: 'monuments', subset: 'war_memorials' },
  battlefield: { weight: FULL, category: 'history', kind: 'monuments', subset: 'battlefields' },
  archaeological_site: { weight: FULL, category: 'history', kind: 'monuments', subset: 'archaeological_sites' },
  bridge: { weight: FULL, category: 'history', kind: 'structures', subset: 'bridges' },
  mill: { weight: FULL, category: 'history', kind: 'structures', subset: 'mills' },
  station: { weight: FULL, category: 'history', kind: 'structures', subset: 'stations' },
  lighthouse: { weight: FULL, category: 'history', kind: 'structures', subset: 'lighthouses' },
  civic_building: { weight: FULL, category: 'history', kind: 'structures', subset: 'civic_buildings' },
  fort: { weight: FULL, category: 'history', kind: 'structures', subset: 'forts' },
  water_tower: { weight: HALF, bar: HALF, category: 'history', kind: 'structures', subset: 'towers' },
  clock_tower: { weight: HALF, bar: HALF, category: 'history', kind: 'structures', subset: 'towers' },
  old_machine: { weight: HALF, bar: HALF, category: 'history', kind: 'structures', subset: 'old_machines' },
  tavern: { weight: FULL, storefront: true, category: 'history', kind: 'structures', subset: 'taverns' },
  mausoleum: { weight: HALF, bar: HALF, category: 'history', kind: 'cemeteries', subset: 'mausoleums' },
  statue: { weight: FULL, category: 'art', kind: 'public_art', subset: 'statues' },
  mural: { weight: FULL, category: 'art', kind: 'public_art', subset: 'murals' },
  fountain: { weight: HALF, bar: HALF, category: 'art', kind: 'public_art', subset: 'fountains' },
  sign: { weight: QUARTER, bar: QUARTER, category: 'art', kind: 'public_art', subset: 'signs' },
  garden: { weight: FULL, category: 'parks', kind: 'parks', subset: 'gardens' },
  waterfall: { weight: FULL, category: 'parks', kind: 'nature', subset: 'waterfalls' },
  cave: { weight: FULL, category: 'parks', kind: 'nature', subset: 'caves' },
  hot_spring: { weight: FULL, category: 'parks', kind: 'nature', subset: 'hot_springs' },
  old_tree: { weight: QUARTER, bar: QUARTER, category: 'parks', kind: 'nature', subset: 'old_trees' },
  observatory: { weight: FULL, storefront: true, category: 'culture', kind: 'museums', subset: 'observatories' },
  concert_hall: { weight: FULL, storefront: true, category: 'culture', kind: 'theatres', subset: 'concert_halls' },
  carousel: { weight: HALF, bar: HALF, category: 'culture', kind: 'community', subset: 'carousels' },
  fire_tower: { weight: HALF, bar: HALF, category: 'viewpoints', kind: 'viewpoints', subset: 'fire_towers' },
  zoo: { weight: FULL, storefront: true, category: 'viewpoints', kind: 'attractions' },
  ruin: { weight: FULL, category: 'viewpoints', kind: 'curiosities', subset: 'old_ruins' },
  ghost_town: { weight: HALF, bar: HALF, category: 'viewpoints', kind: 'curiosities', subset: 'ghost_towns' },
  natural_oddity: { weight: FULL, category: 'viewpoints', kind: 'curiosities', subset: 'natural_oddities' },
  roadside: { weight: FULL, category: 'viewpoints', kind: 'curiosities', subset: 'roadside_giants' },
  survey_mark: { weight: QUARTER, bar: QUARTER, category: 'viewpoints', kind: 'curiosities', subset: 'survey_marks' },
  small_memorial: { weight: QUARTER, bar: QUARTER, category: 'history', kind: 'monuments', subset: 'small_memorials' },
  old_stone: { weight: QUARTER, bar: QUARTER, category: 'history', kind: 'structures', subset: 'old_stones' },
  wayside_shrine: { weight: QUARTER, bar: QUARTER, category: 'history', kind: 'churches', subset: 'wayside_shrines' },
  time_capsule: { weight: QUARTER, bar: QUARTER, category: 'viewpoints', kind: 'curiosities', subset: 'time_capsules' },
  bookcase: { weight: HALF, bar: HALF, category: 'culture', kind: 'community', subset: 'little_libraries' },
  community_garden: { weight: HALF, bar: HALF, category: 'parks', kind: 'parks', subset: 'community_gardens' },
  // Everyday and civic places, green and views.
  community: { weight: HALF, storefront: true, category: 'culture', kind: 'community' },
  civic_hall: { weight: HALF, storefront: true, category: 'history', kind: 'monuments' },
  worship: { weight: HALF, storefront: true, category: 'history', kind: 'churches' },
  burial_ground: { weight: HALF, category: 'history', kind: 'cemeteries' },
  park: { weight: HALF, category: 'parks', kind: 'parks' },
  reserve: { weight: HALF, category: 'parks', kind: 'parks' },
  green_amenity: { weight: HALF, category: 'parks' },
  open_space: { weight: HALF },
  viewpoint: { weight: HALF, category: 'viewpoints', kind: 'viewpoints' },
  service: { weight: HALF, storefront: true },
  health: { weight: HALF, storefront: true },
  lodging: { weight: HALF, storefront: true },
  civic: { weight: HALF, storefront: true },
  sport: { weight: HALF, storefront: true },
  // Offices and vehicles; and what is no place to go.
  office: { weight: QUARTER, storefront: true },
  vehicle: { weight: QUARTER, storefront: true },
  none: { weight: 0 },
  // Ground, not a place to go: a scenic route's green (PS4).
  woodland: { weight: 0 },
  // What a place's record and name say (PS2, PS3, PS6). They weigh nothing and are never a measure (PS10, decision 0103):
  // curation judges what they make a mark, and only `historic` lights a bar (PS11).
  /** The places archive holds it: it admits only Wikidata items of fixed types and heritage listings. */
  recorded: { weight: 0 },
  /** Its name holds a word of `notable.json`. */
  historic_name: { weight: 0 },
  /** A place of history too: a museum the archive records, or whose name says historic beyond a neighbourhood's (PK1-PK3). */
  historic: { weight: 0, category: 'history' },
} as const satisfies Record<string, ClassDef>;

export type ClassDef = {
  readonly weight: number;
  readonly storefront?: true;
  readonly category?: CategoryId;
  readonly kind?: Kind;
  /** SP3: the subset of `kind` a small place belongs to, its own switch (decision 0183). */
  readonly subset?: Kind;
  /** SP12: how much it counts toward its bar (the size of the stop); absent, a whole place. */
  readonly bar?: number;
};
export type PresenceClass = keyof typeof DEFS;
export const CLASSES: Readonly<Record<PresenceClass, ClassDef>> = DEFS;
export const classDef = (c: PresenceClass): ClassDef => CLASSES[c];

/**
 * A table's own entry for a key, never one Object.prototype lends it (presence-readers audit 5: a poi subclass `constructor` was a
 * function, and every reader threw).
 */
const own = <T>(table: Readonly<Record<string, T>>, key: string): T | undefined =>
  Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined;

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
  // XS12 (decision 0191): the map's ruins are Ruins, as the archive's; a castle stays a monument.
  castle: [[['castle'], 'monument'], [['ruins'], 'ruin']],
  // PK11, PK12: a community centre is a place of Culture.
  town_hall: [[['townhall', 'courthouse'], 'civic_hall'], [['community_centre'], 'community']],
  cemetery: [[['cemetery', 'grave_yard'], 'burial_ground']],
  // Places of worship count as historic buildings (the owner's call).
  place_of_worship: [['*', 'worship']],
  park: [[['park'], 'park'], [['nature_reserve'], 'reserve']],
  garden: [['*', 'park']],
  dog_park: [['*', 'green_amenity']],
  picnic_site: [['*', 'green_amenity']],
  museum: [['*', 'museum']],
  theatre: [['*', 'theatre']],
  cinema: [['*', 'cinema_hall']],
  attraction: [[['viewpoint'], 'viewpoint'], [['attraction'], 'attraction']],
  aquarium: [['*', 'zoo']],
  // RP15: the National Aviary is OSM's zoo=aviary (the owner, Nov 9).
  // XS4: a petting zoo, a wildlife or safari park and the like are zoos too (the second review, Nov 17).
  // explore-subtypes audit 9, 12: an enclosure is a pen inside a zoo, never a place of its own; zoos are Zoos and aquariums.
  zoo: [[['zoo', 'aviary', 'petting_zoo', 'wildlife_park', 'safari_park', 'butterfly', 'reptile'], 'zoo'], [['enclosure'], 'none']],
  theme_park: [['*', 'attraction']],
  bar: [[['bar', 'nightclub'], 'drink']],
  beer: [[['pub', 'biergarten'], 'drink']],
  // PR5: tags the old tables answered differently, each given the class its like already had.
  memorial: [['*', 'memorial_site']],
  nature_reserve: [['*', 'reserve']],
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
  for (const [subs, c] of own(OSM, cls) ?? []) if (subs === '*' || subs.includes(sub)) return [c];
  const bySub = own(OSM_SUBCLASS, sub);
  if (bySub) return [bySub];
  const byClass = own(OSM_DEFAULT, cls);
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
  for (let i = hierarchy.length - 1; i >= 1; i--) {
    const deeper = own(OVERTURE_DEEPER, hierarchy[i]);
    if (deeper) return [deeper];
  }
  const root = own(OVERTURE_ROOT, hierarchy[0]);
  return root ? [root] : [];
}

/**
 * PS1: the places archive's classes (chronicles-data's contract v2, decision 0108), each to the class it is; every archive
 * place is `recorded` too, since the archive admits only recorded places (PS6). A class not here is no place, never guessed.
 */
const ARCHIVE: Record<string, PresenceClass> = {
  folly: 'roadside', novelty_building: 'roadside', roadside_giant: 'roadside', natural_oddity: 'natural_oddity', odd_engineering: 'curiosity',
  marks_a_fact: 'survey_mark', art_environment: 'roadside', ruin: 'ruin',
  monument: 'monument', memorial: 'memorial_site',
  // XS10, XS11 (decision 0191): a statue is Public art; Wikidata's commemorative plaques are historical markers, OSM's plaques plaques.
  statue: 'statue', marker: 'marker', plaque: 'plaque',
  // SP3 (decision 0183): the other small places of contract v3.
  small_memorial: 'small_memorial', old_stone: 'old_stone', wayside_shrine: 'wayside_shrine', time_capsule: 'time_capsule',
  public_bookcase: 'bookcase', community_garden: 'community_garden',
  mural: 'mural', sculpture: 'artwork',
  overlook: 'viewpoint', tower: 'viewpoint',
  // RP8 (decisions 0109, 0111): listed places by type.
  church: 'worship', cemetery: 'burial_ground', theatre: 'theatre', museum: 'museum', historic_site: 'monument', building_structure: 'structure',
  // Contract v4 (specs/explore-subtypes XS3, decision 0191): what a place is.
  fountain: 'fountain', sign: 'sign', war_memorial: 'war_memorial', battlefield: 'battlefield', archaeological_site: 'archaeological_site',
  bridge: 'bridge', mill: 'mill', station: 'station', lighthouse: 'lighthouse', civic_building: 'civic_building', fort: 'fort',
  water_tower: 'water_tower', clock_tower: 'clock_tower', tavern: 'tavern', historic_machine: 'old_machine', mausoleum: 'mausoleum',
  garden: 'garden', waterfall: 'waterfall', cave: 'cave', hot_spring: 'hot_spring', old_tree: 'old_tree',
  concert_hall: 'concert_hall', observatory: 'observatory', carousel: 'carousel', zoo: 'zoo', fire_tower: 'fire_tower', ghost_town: 'ghost_town',
};

/** The archive's class names, in the contract's order (PW5's listing, `archivePois.ts`). */
export const ARCHIVE_CLASS_NAMES: readonly string[] = Object.keys(ARCHIVE);

/**
 * explore-subtypes audit 1: an archive feature's class as its source meant it. Contract v3 put OpenStreetMap's plaques under
 * `marker` beside Wikidata's historical markers; v4 calls them `plaque`. A v3 pack (or one still served) reads the same.
 */
export const archiveClassOf = (cls: string, src: string): string => (cls === 'marker' && src === 'osm' ? 'plaque' : cls);

/** XS14, explore-subtypes audit 3: whether a place is an artwork (the map's unnamed art, a statue, a mural or a sculpture). */
const ARTWORK_CLASSES: ReadonlySet<PresenceClass> = new Set<PresenceClass>(['artwork', 'statue', 'mural']);
export const isArtworkClass = (classes: readonly PresenceClass[]): boolean => classes.some((c) => ARTWORK_CLASSES.has(c));

/** PS1: what a places-archive feature is, from its class. */
export function classesOfArchive(cls: string): PresenceClass[] {
  const c = own(ARCHIVE, cls);
  return c ? [c, 'recorded'] : [];
}

/** OpenMapTiles' landcover classes and subclasses that are green to a scenic route (SR15): parks and gardens, and woods. */
const LANDCOVER: Record<string, Rule[]> = { wood: [['*', 'woodland']], grass: [[['park', 'garden'], 'park']] };

/** PS4: what an OpenMapTiles landcover feature is, from its properties, where a scenic route reads it as green. */
export function classesOfLandcover(props: Readonly<Record<string, unknown>> | null): PresenceClass[] {
  const cls = String(props?.class ?? '');
  const sub = String(props?.subclass ?? '');
  for (const [subs, c] of own(LANDCOVER, cls) ?? []) if (subs === '*' || subs.includes(sub)) return [c];
  return [];
}

/** D4: unnamed pois worth keeping, by subclass, and the words they show (presence-readers audit 1: moved from `tilePois.ts`). */
const UNNAMED: Record<string, string> = { artwork: 'Public art', viewpoint: 'A viewpoint' };

/** D4: the words an unnamed poi of this subclass shows, or null where an unnamed one is no place. */
export const unnamedLabel = (sub: string): string | null => own(UNNAMED, sub) ?? null;

/** explore-subtypes audit 4: the words the map's unnamed artwork shows ("Public art"), for a find that follows a merge. */
export const UNNAMED_ARTWORK: string = UNNAMED.artwork;

/** SP5: the archive's classes that may come unnamed (contract v3), and the words such a place shows, as an unnamed viewpoint. */
const ARCHIVE_UNNAMED: Record<string, string> = {
  marker: 'A marker', plaque: 'A plaque', small_memorial: 'A memorial', old_stone: 'An old stone', wayside_shrine: 'A wayside shrine',
  time_capsule: 'A time capsule', public_bookcase: 'A little library', community_garden: 'A community garden', statue: 'A statue',
  mural: 'Public art', sculpture: 'Public art',
  // XS13 (contract v4, ST6): never a water tower or a cave.
  fountain: 'A fountain', war_memorial: 'A war memorial', mill: 'A mill', lighthouse: 'A lighthouse', historic_machine: 'An old machine',
  waterfall: 'A waterfall', hot_spring: 'A hot spring', old_tree: 'An old tree', carousel: 'A carousel',
};

/** SP5: the words an unnamed archive place of this class shows, or null where an unnamed one is no place. */
export const archiveUnnamedLabel = (cls: string): string | null => own(ARCHIVE_UNNAMED, cls) ?? null;

/** SP3: the subset (a switch of its own) a place of these classes belongs to, read from its mark class; null for none. */
export function subsetOf(classes: readonly PresenceClass[]): Kind | null {
  const c = markClassOf(classes);
  return (c && CLASSES[c].subset) ?? null;
}

/** SP12: how much a place of these classes counts toward its bar: its mark class's `bar`, a whole place by default. */
export function barWeight(classes: readonly PresenceClass[] | undefined): number {
  const c = classes ? markClassOf(classes) : null;
  return (c && CLASSES[c].bar) ?? 1;
}

/** L7: transit the landing prefers to start from: railway stations and halts, bus stations, ferry terminals (moved from `tilePois.ts`). */
const TRANSIT: Record<string, readonly string[]> = {
  railway: ['station', 'halt', 'subway', 'light_rail'],
  bus: ['bus_station'],
  ferry_terminal: ['ferry_terminal'],
};

/** L7: whether an OpenMapTiles poi is a stop the landing may start from. Transit is not a place to go: no class. */
export const isTransitStop = (cls: string, sub: string): boolean => !!own(TRANSIT, cls)?.includes(sub);

/**
 * PR2, PS7 (presence-readers audit 1): every source tag presence's tables are keyed by or list, so a guard can hold that no
 * module outside presence spells one.
 */
export const SOURCE_TAGS: readonly string[] = [
  ...new Set([
    ...Object.entries(OSM).flatMap(([cls, rules]) => [cls, ...rules.flatMap(([subs]) => (subs === '*' ? [] : subs))]),
    ...Object.keys(OSM_SUBCLASS), ...Object.keys(OSM_DEFAULT),
    ...Object.keys(OVERTURE_ROOT), ...Object.keys(OVERTURE_DEEPER), ...OVERTURE_NEVER,
    ...Object.keys(ARCHIVE),
    ...Object.entries(LANDCOVER).flatMap(([cls, rules]) => [cls, ...rules.flatMap(([subs]) => (subs === '*' ? [] : subs))]),
    ...Object.keys(UNNAMED), ...Object.keys(ARCHIVE_UNNAMED), ...Object.entries(TRANSIT).flatMap(([cls, subs]) => [cls, ...subs]),
  ]),
];

/**
 * PS2, PS3: what a place's name adds to its classes. A notable name is `historic_name` (marks read it, by curation); a
 * museum the archive records, or whose name is notable once a neighbourhood's "Old Town" is read past, is `historic` too.
 */
export function named(classes: readonly PresenceClass[], name: string): PresenceClass[] {
  const out = [...classes];
  if (notableName(name)) out.push('historic_name');
  if (out.includes('museum') && (out.includes('recorded') || notableBeyondNeighbourhood(name))) out.push('historic');
  return out;
}

/** SF10: whether a class is a storefront, a place you walk into. */
export const isStorefront = (c: PresenceClass): boolean => CLASSES[c].storefront === true;

/** SF10: how much a feature counts toward a street's storefronts: the greatest weight of its storefront classes. */
export function storefrontWeight(classes: readonly PresenceClass[]): number {
  return classes.reduce((w, c) => (isStorefront(c) ? Math.max(w, CLASSES[c].weight) : w), 0);
}

/** PR4: the greatest weight of a feature's classes, storefront or not: a complex's shopping word reads it (decision 0180). */
export function densityWeight(classes: readonly PresenceClass[]): number {
  return classes.reduce((w, c) => Math.max(w, CLASSES[c].weight), 0);
}

/** PR3: the class marks and bars read: the first with a category, or null. */
export function markClassOf(classes: readonly PresenceClass[]): PresenceClass | null {
  return classes.find((c) => CLASSES[c].category != null) ?? null;
}
