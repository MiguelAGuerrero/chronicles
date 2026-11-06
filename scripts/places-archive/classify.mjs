// The places archive's classes and gate (Places worth the stop, PW5-PW7, decision 0102). Each class is a fixed
// list of Wikidata classes (P31 values), pinned from a lookup on 2026-11-06: never a judgment at run time. The
// class names are the app's vocabulary (`src/lib/discovery/archivePois.ts` ARCHIVE_CLASSES); a test keeps them in it.

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

/** Every Wikidata class the fetch asks for. */
export const ALL_CLASS_IDS = [...new Set(Object.values(CLASSES).flat())].sort();

/**
 * PW6: the archive class of a Wikidata item {p31: [Q…], heritage}: the first in ORDER whose list holds one of its
 * classes; else a heritage-listed building (a National Register id or a heritage designation); else null.
 */
export function classify(item) {
  const p31 = new Set(item.p31 ?? []);
  for (const cls of ORDER) if (CLASSES[cls].some((q) => p31.has(q))) return cls;
  return item.heritage ? 'heritage_building' : null;
}

/**
 * PW7: whether the place's sources say it no longer exists: a dissolved, abolished or demolished date (P576), a
 * closure date (P3999), or a state saying demolished or destroyed (P5817, P5816). Abandoned and ruined places
 * still exist and stay.
 */
export function gone(item) {
  if (item.dissolved || item.closed) return true;
  return (item.states ?? []).some((s) => /\b(demolish|destroy|razed|no longer exist)/i.test(String(s)));
}

/**
 * PW7: the place's archive class if it enters the archive, else null. A class from the table and a location are
 * required; a Wikidata entry with a location is enough (the owner, Nov 5); a place that is gone is left out.
 * Never a count: no sitelinks, page views or rank are read.
 */
export function keep(item) {
  if (!Number.isFinite(item.lon) || !Number.isFinite(item.lat)) return null;
  if (!String(item.name ?? '').trim() || gone(item)) return null;
  return classify(item);
}
