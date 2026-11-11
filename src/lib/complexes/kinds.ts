// @layer core
import { COMPLEX_KINDS, type Complex, type ComplexKind } from './types';

const LABELS: Record<ComplexKind, string> = { shopping: 'Shopping', markets: 'Markets', campuses: 'Campuses', stations: 'Stations', civic: 'Civic' };

/** The switches' label for a kind (plural). */
export const switchLabel = (kind: ComplexKind): string => LABELS[kind];

/** CX10: the hidden kinds saved in meta (`complex_hidden`), unknown words dropped. */
export function parseHiddenKinds(raw: string | null): ComplexKind[] {
  if (!raw) return [];
  const out: ComplexKind[] = [];
  for (const w of raw.split(',')) {
    const k = w.trim() as ComplexKind;
    if (COMPLEX_KINDS.includes(k) && !out.includes(k)) out.push(k);
  }
  return out;
}

export const hiddenToMeta = (hidden: readonly ComplexKind[]): string => hidden.join(',');

/** CX10: what the card and the map show: a kind switched off leaves the view, never the data. */
export const shown = (complexes: readonly Complex[], hidden: readonly ComplexKind[]): Complex[] => complexes.filter((c) => !hidden.includes(c.kind));
