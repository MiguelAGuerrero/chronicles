import raw from './chains.json';
import notable from './notable.json';
import type { CategoryId, Place } from './types';

/**
 * Chains aren't discoveries (the owner's call, Nov 2). OpenMapTiles carries no
 * brand tag, so chains are known by name: a default list kept as data
 * (`chains.json`), scoped per category, so "Subway" the sandwich shop is left
 * out but "Subway Art Supply" isn't.
 */

/** Lowercase, accents and apostrophes gone, & as "and", anything else a single space. */
export function normalizeBrand(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’‘`]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const CATEGORY_IDS: CategoryId[] = ['art', 'food', 'shops', 'history', 'parks', 'culture', 'viewpoints', 'nightlife'];
const table = raw as unknown as Record<string, string[]>;

/** The default chains, normalized, per category. */
export const CHAINS: Record<CategoryId, string[]> = Object.fromEntries(
  CATEGORY_IDS.map((c) => [c, [...new Set((table[c] ?? []).map(normalizeBrand).filter(Boolean))]]),
) as Record<CategoryId, string[]>;

/** A chain of this category: its name is the chain's, or starts with it as whole words ("Domino's Pizza"). */
export function isChain(name: string, category: CategoryId): boolean {
  const n = normalizeBrand(name);
  if (!n) return false;
  return CHAINS[category].some((c) => n === c || n.startsWith(c + ' '));
}

/**
 * A ? mark is for an attraction or a unique place (S18): the categories a
 * sightseer goes out of their way for. Food, shops and nightlife are an
 * area's ordinary activity; they show as its busy streets instead.
 */
export const MARK_CATEGORIES: readonly CategoryId[] = ['art', 'history', 'parks', 'culture', 'viewpoints'];

const NOTABLE = notable.words.map(normalizeBrand);
/** The name marks it as historic or notable (S20): a listed word or phrase, as whole words. */
export function notableName(name: string): boolean {
  const n = ` ${normalizeBrand(name)} `;
  return NOTABLE.some((w) => n.includes(` ${w} `));
}

/**
 * Whether a place can become a mark (S18-S20). `markable: false` comes from
 * the adapter (a cinema, a plain church); a row cached before it existed is
 * judged by its category alone.
 */
export const isMarkable = (p: Pick<Place, 'name' | 'category' | 'markable'>): boolean =>
  MARK_CATEGORIES.includes(p.category) && p.markable !== false && !isChain(p.name, p.category);
