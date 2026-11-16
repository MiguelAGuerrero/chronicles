// @layer core
import type { Want } from './candidates';

/*
 * The vocabulary (QC2, QC4, QC5): what the walker may say they want to see. Data, not code; a gate of kinds (what a place is),
 * never a measure: no field orders, weights or prefers an entry, and the page lists them alphabetically by label (steward R4).
 */
export const WANTS: readonly Want[] = [
  { id: 'antiques', label: 'Antiques', aliases: ['antique', 'antique shops', 'curios'], match: { what: ['antiques'] }, slotWord: 'an antiques shop' },
  { id: 'books', label: 'Books', aliases: ['bookshop', 'bookshops', 'bookstore', 'bookstores', 'booksellers'], match: { what: ['books'] }, slotWord: 'a bookshop' },
];

/** QC2: the entries whose label or aliases begin with the query, or have a word that does (case-insensitive); nothing else is matched. */
export function matchWants(query: string, wants: readonly Want[] = WANTS): Want[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...wants];
  const hit = (text: string) => text.toLowerCase().split(/\s+/).some((word) => word.startsWith(q)) || text.toLowerCase().startsWith(q);
  return wants.filter((w) => [w.label, ...w.aliases].some(hit));
}
