// @layer core
import { normalizeWords } from '../presence/notable';
import raw from './chains.json';
import type { CategoryId, Place } from './types';

/**
 * Chains aren't discoveries (the owner's call, Nov 2). OpenMapTiles carries no
 * brand tag, so chains are known by name: a default list kept as data
 * (`chains.json`), scoped per category, so "Subway" the sandwich shop is left
 * out but "Subway Art Supply" isn't.
 */

/** Lowercase, accents and apostrophes gone, & as "and", anything else a single space: presence's reading of a name. */
export const normalizeBrand = normalizeWords;

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

/**
 * Whether a place can become a mark (S18-S20). The adapter sets `markable`;
 * a row cached before it existed has none and is not a mark until it is read
 * again (audit: a plain church cached last week).
 */
export const isMarkable = (p: Pick<Place, 'name' | 'category' | 'markable'>): boolean =>
  p.markable === true && MARK_CATEGORIES.includes(p.category) && !isChain(p.name, p.category);
