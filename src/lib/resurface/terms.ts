// @layer core
/**
 * The words a moment is about (RM12): the user's own, folded so "Statues" and
 * "statue" are one. English only for now. A word list and a plural rule, no
 * model: anything cleverer plugs in as another `SignalExtractor`.
 */

const STOP = new Set(
  (
    'a about above after again all also always am an and any are around as at back be because been before being below between both but by can could did do does doing down during each even ever every few for from further get got had has have having her here hers him his how into its just like made make many may me might more most much must my myself no nor not now of off often on once one only onto or other our out over own really said same saw see seen she should so some still such take than that the their them then there these they thing things this those through to too under until up upon us very want was way we well went were what when where which while who whom why will with without would yes you your yours ' +
    'day days today yesterday tomorrow time walk walked walking walks street streets nice good great little big lot new old thought think told tell going come came right left next first last ' +
    'around near place places people someone something nothing everything anything'
  ).split(/\s+/).filter(Boolean),
);

/** Words the user writes two ways. Small on purpose. */
const ALIASES: Record<string, string> = { fall: 'autumn', autumnal: 'autumn' };

export const fold = (s: string) => s.normalize('NFD').replace(/\p{M}+/gu, '').toLowerCase();

/**
 * The plural folded away: statues → statue, bakeries → bakery, glass stays glass, bus stays bus. A word
 * ending in -ie goes the same way as its plural (cookie, cookies → cooky), so the two are one term.
 */
function stem(w: string): string {
  if (w.length > 4 && w.endsWith('ies')) return `${w.slice(0, -3)}y`;
  if (w.length > 4 && w.endsWith('ie')) return `${w.slice(0, -2)}y`;
  if (w.length > 4 && /(sses|shes|ches|xes)$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s') && !/(ss|us|is)$/.test(w)) return w.slice(0, -1);
  return w;
}

export interface Term {
  term: string;
  /** As the user wrote it, lowercase with accents kept. */
  shown: string;
}

/** The distinct terms of some words, in the order first written. */
export function termsOf(words: string | null | undefined): Term[] {
  if (!words) return [];
  const out = new Map<string, Term>();
  // Apostrophes stay inside a word, so "don't" is one word and not "don" and "t" (audit 1).
  for (const token of words.split(/[^\p{L}'’]+/u)) {
    const trimmed = token.replace(/^['’]+|['’]+$/g, '');
    // A possessive keeps its word (John's → john); any other contraction (don't, couldn't) says nothing.
    const possessive = trimmed.match(/^([\p{L}]+)['’]s$/u);
    const raw = possessive ? possessive[1] : trimmed;
    if (raw.length < 3 || /['’]/.test(raw)) continue;
    const f = fold(raw);
    if (STOP.has(f)) continue;
    const term = ALIASES[stem(f)] ?? stem(f);
    if (term.length < 3 || STOP.has(term)) continue;
    if (!out.has(term)) out.set(term, { term, shown: raw.toLowerCase() });
  }
  return [...out.values()];
}

export const titleCase = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
