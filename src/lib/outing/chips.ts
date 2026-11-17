// @layer core
import type { Want } from './candidates';
import { WANTS } from './wants';

/*
 * The outing's chips (OJ11-OJ15): what a place is, kinds of attraction beside the kinds of shop of `wants.ts`, in one list. Data, not
 * code; a gate of kinds, never a measure: no field orders, weights or prefers a chip, none is marked as a shop or an attraction, and
 * the page lists them alphabetically by label. An attraction's match is over `kind`, the atlas's own kinds.
 */
const ATTRACTIONS: readonly Want[] = [
  { id: 'art', label: 'Art', aliases: ['public art', 'murals', 'galleries'], match: { kind: ['art'] }, slotWord: 'a place of art' },
  { id: 'culture', label: 'Culture', aliases: ['museums', 'theatres', 'theaters', 'libraries'], match: { kind: ['culture'] }, slotWord: 'a place of culture' },
  { id: 'parks', label: 'Green', aliases: ['parks', 'gardens', 'woods', 'nature'], match: { kind: ['parks'] }, slotWord: 'a green place' },
  { id: 'history', label: 'History', aliases: ['old places', 'old buildings', 'monuments', 'heritage'], match: { kind: ['history'] }, slotWord: 'a place with history' },
  { id: 'viewpoints', label: 'Views', aliases: ['viewpoints', 'lookouts', 'oddities', 'curiosities'], match: { kind: ['viewpoints'] }, slotWord: 'a viewpoint or an oddity' },
];

export const CHIPS: readonly Want[] = [...WANTS, ...ATTRACTIONS].sort((a, b) => a.label.localeCompare(b.label));

const SHOP_IDS: ReadonlySet<string> = new Set(WANTS.map((w) => w.id));

/**
 * OJ12: the chips on when the page first opens: an attraction's chip when at least one of the kinds under it is on in "What I'm into"
 * (`hidden` holds the kinds switched off); a shop's chip starts off. In the chips' own order.
 */
export function defaultChips(kinds: readonly { id: string; category: string }[], hidden: ReadonlySet<string>): string[] {
  return CHIPS.filter((c) => !SHOP_IDS.has(c.id) && kinds.some((k) => (c.match.kind ?? []).includes(k.category) && !hidden.has(k.id))).map((c) => c.id);
}
