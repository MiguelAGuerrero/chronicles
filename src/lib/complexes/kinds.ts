// @layer core
import type { Complex, ComplexKind } from './types';

/** The switches' label for a kind (plural). */
export function switchLabel(_kind: ComplexKind): string {
  throw new Error('complexes: not implemented');
}
/** CX10: the hidden kinds saved in meta (`complex_hidden`), unknown words dropped. */
export function parseHiddenKinds(_raw: string | null): ComplexKind[] {
  throw new Error('complexes: not implemented');
}
export function hiddenToMeta(_hidden: readonly ComplexKind[]): string {
  throw new Error('complexes: not implemented');
}
/** CX10: what the card and the map show: a kind switched off leaves the view, never the data. */
export function shown(_complexes: readonly Complex[], _hidden: readonly ComplexKind[]): Complex[] {
  throw new Error('complexes: not implemented');
}
