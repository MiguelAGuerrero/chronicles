import raw from './chains.json';
import type { CategoryId } from './types';

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
