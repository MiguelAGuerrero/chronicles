// The places archive's classes and gate (Places worth the stop, PW5-PW7, decision 0103). Each class is a fixed
// list of Wikidata classes (P31 values), pinned from a lookup on 2026-11-06: never a judgment at run time. The
// class names are the app's vocabulary (`src/lib/discovery/archivePois.ts` ARCHIVE_CLASSES); a test keeps them in it.
// Listed places (Remarkable and public, RP1-RP8, decision 0104) take their types from `public-types.json`, pinned by
// `pin-types.mjs` on Nov 9.
import { createRequire } from 'node:module';

const TYPES = createRequire(import.meta.url)('./public-types.json');

/** PW6: the order a place is classified in: it commemorates; it was made as art; you look out from it; it is odd. */
export const ORDER = [
  // It commemorates: a monument.
  'monument', 'memorial', 'statue', 'marker',
  // It was made as art: public art.
  'mural', 'sculpture',
  // You go there to look out: a viewpoint.
  'overlook', 'tower',
  // It is one of the odd classes: a curiosity.
  'folly', 'novelty_building', 'roadside_giant', 'natural_oddity', 'odd_engineering', 'marks_a_fact', 'art_environment', 'ruin',
];

/** Wikidata classes per archive class (usage counts on 2026-11-06 in the comments). */
export const CLASSES = {
  monument: ['Q4989906', 'Q170980'], // monument 48,814; obelisk 1,134
  memorial: ['Q5003624', 'Q575759'], // memorial 20,074; war memorial 66,515
  statue: ['Q179700'], // statue 60,852
  marker: ['Q721747'], // commemorative plaque 23,862
  mural: ['Q219423'], // mural 4,008
  sculpture: ['Q860861', 'Q557141'], // sculpture 129,767; public art 162
  overlook: ['Q6017969', 'Q177305'], // scenic viewpoint 1,510; observation deck 165
  tower: ['Q1440300', 'Q748998'], // observation tower 1,891; fire lookout tower 1,791
  folly: ['Q180174'], // folly 359
  novelty_building: ['Q548879'], // novelty architecture 1
  roadside_giant: ['Q14915208'], // roadside attraction 35
  natural_oddity: ['Q372934', 'Q4850014', 'Q954501', 'Q854550', 'Q2086896'], // glacial erratic, balancing rock, natural arch, hoodoo, gravity hill
  odd_engineering: ['Q39715', 'Q1825472', 'Q142031', 'Q2250229'], // lighthouse, covered bridge, funicular, shot tower
  marks_a_fact: ['Q316655', 'Q352956', 'Q10145', 'Q590232'], // tripoint, survey marker, milestone, geographical center
  art_environment: ['Q2860356'], // visionary environment
  ruin: ['Q109607', 'Q74047'], // ruins, ghost town
};

/** National Historic Landmark, as a heritage designation (P1435): 2,522 uses on 2026-11-06. */
export const NHL = 'Q624232';
/** National Register of Historic Places listing, as a heritage designation (P1435): the owner's Nov 9 call (RP1). */
export const NRHP = 'Q19558910';
/** Historic district (P31): an area, never a place, so never a heritage building (the owner, Nov 6). */
export const DISTRICT = 'Q15243209';

/** Every Wikidata class the fetch asks for. */
export const ALL_CLASS_IDS = [...new Set(Object.values(CLASSES).flat())].sort();

const GROUPS = Object.fromEntries(Object.entries(TYPES.groups).map(([g, ids]) => [g, new Set(ids)]));
const inGroup = (p31, g) => [...p31].some((q) => GROUPS[g].has(q));

/** RP2: OpenStreetMap tags that show a place open to visitors; `historic=building` and the like are no sign. */
export const OPEN_TAGS = {
  tourism: ['museum', 'attraction', 'gallery'],
  historic: ['monument', 'memorial', 'castle', 'ruins', 'fort', 'archaeological_site'],
  amenity: ['place_of_worship', 'theatre', 'arts_centre', 'library', 'townhall', 'courthouse'],
};
/** RP5: OpenStreetMap's word that a place can't be reached. */
export const CLOSED_ACCESS = ['private', 'no'];

/**
 * RP1-RP4, RP8: a listed item's class and why it enters, or null. Listed is the National Register or a Landmark.
 * By type first (a place of worship, a cemetery, a theatre, a museum, then any public type); else shown open (an open
 * type, or OSM's tags); else a Landmark, whatever its type (the owner, Nov 9: a private Landmark house too). A
 * mundane type (a house, a school, an office, a hotel) is never public by type (`pin-types.mjs`).
 * @param {{ p31?: string[], listed?: boolean, nhl?: boolean }} item
 * @param {{ open?: boolean }} [signals]
 * @returns {{ cls: string, reason: 'public type' | 'shown open' | 'landmark' } | null}
 */
export function listing(item, signals = {}) {
  if (!item.listed && !item.nhl) return null;
  const p31 = new Set(item.p31 ?? []);
  if (p31.has(DISTRICT)) return null;
  for (const cls of ['church', 'cemetery', 'theatre']) if (inGroup(p31, cls)) return { cls, reason: 'public type' };
  if (inGroup(p31, 'museum')) return { cls: 'museum', reason: 'shown open' };
  const reason = inGroup(p31, 'public') ? 'public type' : inGroup(p31, 'open') || signals.open ? 'shown open' : item.nhl ? 'landmark' : null;
  if (!reason) return null;
  // Audit 10 (the owner, Nov 9): a site, a battlefield or a wreck is no building: a Monument.
  return { cls: inGroup(p31, 'site') ? 'historic_site' : 'heritage_building', reason };
}

/**
 * PW6: the archive class of a Wikidata item {p31: [Q…], listed, nhl}: the first in ORDER whose list holds one of
 * its classes (a listing never changes it, RP8); else, for a listed item, its class by RP1-RP4 (`listing`). A
 * historic district is never one (RP6). Nothing about articles is read (the owner, Nov 6). Else null.
 */
export function classify(item, signals = {}) {
  const p31 = new Set(item.p31 ?? []);
  // RP6, audit 12: a district never enters, whatever else it is typed (a ghost town, a monument).
  if (p31.has(DISTRICT)) return null;
  for (const cls of ORDER) if (CLASSES[cls].some((q) => p31.has(q))) return cls;
  return listing(item, signals)?.cls ?? null;
}

/**
 * PW7: whether the place's sources say it no longer exists: a dissolved, abolished or demolished date (P576), or a
 * state saying demolished or destroyed (P5817, P5816). A closure date (P3999) is not gone: a decommissioned
 * lighthouse still stands. A ruin's or ghost town's abolished date is not gone either: the ruins are what is
 * there (places-worth-the-stop audit 6; the owner, Nov 5: "ensure they actually exist").
 * @param {{ dissolved?: boolean, closed?: boolean, states?: string[] }} item
 * @param {string | null} [cls]
 */
export function gone(item, cls = null) {
  if (item.dissolved && cls !== 'ruin') return true;
  return (item.states ?? []).some((s) => /\b(demolish|destroy|razed|no longer exist)/i.test(String(s)));
}

/**
 * PW7, RP5: the place's archive class if it enters the archive, else null; `signals` are OpenStreetMap's word on it
 * (RP7: joined by its wikidata tag only). A class from the table and a location are
 * required; a Wikidata entry with a location is enough (the owner, Nov 5); a place that is gone is left out.
 * Never a count: no sitelinks, page views or rank are read.
 */
export function keep(item, signals = {}) {
  if (!Number.isFinite(item.lon) || !Number.isFinite(item.lat)) return null;
  if (!String(item.name ?? '').trim()) return null;
  // RP5: a place OpenStreetMap marks private or closed to access never enters, a Landmark too.
  if (signals.closed) return null;
  const cls = classify(item, signals);
  return cls && !gone(item, cls) ? cls : null;
}
