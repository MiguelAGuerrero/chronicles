// @layer core
import type { Measures } from './placeSignals';

/*
 * How a place is laid out, in plain words (specs/place-form PF1, PF2, PF5-PF9, PF17, PF18). The words are descriptive and unordered, with no default:
 * where none fits there is no word. One table of thresholds, pinned by real places (the fixtures in `__tests__/walkability/`). Pure. Not built yet (tests first).
 */

export type FormWord = 'exit' | 'grid' | 'mainStreet' | 'village';

export interface FormEntry {
  id: FormWord;
  /** The clause a person reads, naming a layout. */
  clause: string;
  /** The measures this word is read from (PF1: each is a PF4 measure). */
  inputs: readonly (keyof Measures)[];
}

/** The table, sorted by id (PF2). */
export const FORM_WORDS: readonly FormEntry[] = [];

/** The word for a ring's measures, or null: none fits, or it could not be measured (PF5-PF9, PF17). */
export function placeForm(_m: Measures | null): FormWord | null {
  throw new Error('not built: specs/place-form PF5');
}

/** The card's line, worded as the ring's, never the whole area's (PF18). */
export function cardLine(_word: FormWord): string {
  throw new Error('not built: specs/place-form PF18');
}
