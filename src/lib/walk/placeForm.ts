// @layer core
import { TERRITORIES } from './placeFormTerritories';
import { inTerritory } from './placeFormTerritory';
import type { Measures } from './placeSignals';

/*
 * How a place is laid out, in plain words (specs/place-form PF1, PF2, PF5-PF9, PF17, PF18). The words are descriptive and unordered, with no default:
 * where none fits there is no word. The territories are learned from real, owner-confirmed places (`placeFormLearn.ts`) and held to a held-out set cut after they were pinned (PF6). Pure.
 */

export type FormWord = 'exit' | 'grid' | 'mainStreet' | 'village';

export interface FormEntry {
  id: FormWord;
  /** The clause a person reads, naming a layout. */
  clause: string;
  /** The measures this word is read from (PF1: each is a PF4 measure). */
  inputs: readonly (keyof Measures)[];
}

/** The table, sorted by id (PF2): no order a person could read as better or worse. */
export const FORM_WORDS: readonly FormEntry[] = [
  { id: 'exit', clause: 'Services at a highway exit', inputs: ['highwayShare', 'junctionsPerKm2'] },
  { id: 'grid', clause: 'A street grid', inputs: ['junctionsPerKm2', 'placesPerKm2'] },
  { id: 'mainStreet', clause: 'A town along a main street', inputs: ['junctionsPerKm2', 'buildingsPerKm2', 'placesPerKm2', 'highwayShare'] },
  { id: 'village', clause: 'A village along one road', inputs: ['junctionsPerKm2', 'buildingsPerKm2', 'placesPerKm2', 'highwayShare'] },
];

/**
 * The rule (the owner's policy, 2026-11-11: only positive classifications; ambiguity is silence). A ring has a word only when its measures lie inside exactly one
 * word's territory (`placeFormTerritories.ts`, learned from the confirmed places by `placeFormLearn.ts`), and the ring read from 150 m north, east, south and west
 * of its centre gives the same word at least STABILITY_NEED of the five times, the centre among them. Otherwise there is no word.
 */
export const STABILITY_NEED = 4;

/** The one word whose territory holds these measures, or null: none does, two do, or they could not be measured. */
export function wordIn(m: Measures | null): FormWord | null {
  if (!m) return null;
  const hits = FORM_WORDS.filter((w) => TERRITORIES[w.id] && inTerritory(TERRITORIES[w.id]!, m));
  return hits.length === 1 ? hits[0].id : null;
}

/** The word for a ring read from its centre and four shifted centres (`measureRings`), centre first; or null (PF5-PF9, PF17, PF27). */
export function placeForm(rings: readonly (Measures | null)[]): FormWord | null {
  const word = wordIn(rings[0] ?? null);
  if (!word) return null;
  return rings.filter((m) => wordIn(m) === word).length >= STABILITY_NEED ? word : null;
}

/** The card's line, worded as the ring's, never the whole area's (PF18). */
export function cardLine(word: FormWord): string {
  const clause = FORM_WORDS.find((w) => w.id === word)!.clause;
  return `Around its middle: ${clause.charAt(0).toLowerCase()}${clause.slice(1)}`;
}
