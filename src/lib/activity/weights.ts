/*
 * What counts toward a street's density, and how much (AD1): the one table for
 * both sources. Full for what makes a street a place to go (shops, food, drink,
 * attractions), half for everyday services and civic places, a quarter for
 * offices and vehicle services, nothing for the rest. The marks table in
 * `discovery/tilePois.ts` is separate and unchanged (AD2).
 */

export const FULL = 1;
export const HALF = 0.5;
export const QUARTER = 0.25;

/** OpenMapTiles `poi` classes. A class not listed, and not in OSM_SUBCLASS, counts nothing. */
const OSM_CLASS: Record<string, number> = {
  // Shops, food and drink, nightlife.
  shop: FULL, clothing_store: FULL, grocery: FULL, alcohol_shop: FULL, music: FULL, restaurant: FULL, cafe: FULL,
  fast_food: FULL, ice_cream: FULL, bakery: FULL, bar: FULL, beer: FULL, florist: FULL, furniture: FULL, garden_centre: FULL,
  hardware: FULL, jewelry: FULL, shoes: FULL, sports: FULL, stationery: FULL, pet: FULL, mobile_phone: FULL, bicycle: FULL,
  gift: FULL, toys: FULL, books: FULL, chemist: FULL, department_store: FULL, marketplace: FULL,
  // Art, culture, entertainment, history.
  art_gallery: FULL, museum: FULL, theatre: FULL, cinema: FULL, arts_centre: FULL, castle: FULL, monument: FULL,
  attraction: FULL, zoo: FULL, aquarium: FULL, theme_park: FULL, memorial: FULL,
  // Everyday services, health, lodging, civic places, worship, parks and views.
  hairdresser: HALF, beauty: HALF, laundry: HALF, bank: HALF, pharmacy: HALF, post: HALF, town_hall: HALF,
  library: HALF, place_of_worship: HALF, lodging: HALF, doctors: HALF, dentist: HALF, hospital: HALF, clinic: HALF,
  veterinary: HALF, police: HALF, fire_station: HALF, community_centre: HALF, fitness_centre: HALF, sports_centre: HALF,
  stadium: HALF, cemetery: HALF, park: HALF, garden: HALF, dog_park: HALF, picnic_site: HALF, nature_reserve: HALF,
  // Offices and vehicle services.
  office: QUARTER, car: QUARTER, fuel: QUARTER, car_wash: QUARTER, motorcycle: QUARTER,
};

/** Subclasses that count differently from their class (or whose class is the subclass itself). */
const OSM_SUBCLASS: Record<string, number> = {
  // A shop that is a service.
  massage: HALF, tailor: HALF, locksmith: HALF, copyshop: HALF, optician: HALF, hearing_aids: HALF, travel_agency: QUARTER,
  beauty: HALF, hairdresser: HALF,
  // A library's books are a shop; the library itself is civic.
  books: FULL, library: HALF,
  // Things that are not places to go.
  post_box: 0, parcel_locker: 0, charging_station: 0, food_court: FULL, viewpoint: HALF,
};

/** AD1: the weight of an OpenMapTiles POI. */
export function osmWeight(cls: string, sub: string): number {
  if (sub in OSM_SUBCLASS) return OSM_SUBCLASS[sub];
  return OSM_CLASS[cls] ?? 0;
}

/** Overture's taxonomy: the top level, then exceptions at any deeper level. */
const OVERTURE_ROOT: Record<string, number> = {
  food_and_drink: FULL, shopping: FULL, arts_and_entertainment: FULL, cultural_and_historic: FULL,
  lifestyle_services: HALF, health_care: HALF, lodging: HALF, community_and_government: HALF, sports_and_recreation: HALF,
  services_and_business: QUARTER,
};
const OVERTURE_SECOND: Record<string, number> = {
  vehicle_dealer: QUARTER,
  place_of_worship: HALF, religious_organization: HALF,
  bank_or_credit_union: HALF, laundry_service: HALF,
  public_utility: 0, sport_league: 0,
  // Travel and transportation counts only for vehicle services and travel agents.
  vehicle_service: QUARTER, fueling_station: QUARTER, travel_service: QUARTER,
};
/** Any level naming one of these counts nothing (AD1: ATMs, parking). */
const OVERTURE_NEVER = new Set(['atm', 'parking', 'parking_lot', 'parking_garage', 'bus_stop', 'charging_station']);

/** AD1: the weight of an Overture place, from its taxonomy hierarchy (root first). */
export function overtureWeight(hierarchy: readonly string[]): number {
  if (!hierarchy.length || hierarchy.some((h) => OVERTURE_NEVER.has(h))) return 0;
  // The deepest level with a rule of its own wins (a bank is three levels down, under financial services).
  for (let i = hierarchy.length - 1; i >= 1; i--) if (hierarchy[i] in OVERTURE_SECOND) return OVERTURE_SECOND[hierarchy[i]];
  return OVERTURE_ROOT[hierarchy[0]] ?? 0;
}
