// @layer core
import notable from './notable.json';

/*
 * Whether a name says a place is historic or notable (S20), decided once for marks and bars alike (specs/presence-readers,
 * PS3): one word list (`notable.json`, data) and one rule, whole words after `normalizeWords`. Presence records the answer as
 * the class `historic_name`; curation judges what it makes a mark.
 */

/** Lowercase, accents and apostrophes gone, & as "and", anything else a single space (chains read names the same way). */
export function normalizeWords(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’‘`]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const WORDS = notable.words.map(normalizeWords);

/** The name holds a listed word or phrase, as whole words (S20). */
export function notableName(name: string): boolean {
  const n = ` ${normalizeWords(name)} `;
  return WORDS.some((w) => n.includes(` ${w} `));
}

/**
 * The phrases of a neighbourhood's name that say nothing of a place: "Old Town", "Old City", "Old Quarter", "Old Village"
 * (a possessive too: "Old Town's") and "old and new". Read over a name after `normalizeWords`, so "Old-Town", "Old_Town",
 * "Old.Town" and "Old&New" read as "Old Town" and "Old & New" do (decision 0172). The one list, for presence and community
 * parks alike.
 */
export const NEIGHBOURHOOD = /\bold (?:(?:town|city|quarter|village)s?|and new)\b/g;

/**
 * presence-and-kinds audit 5: "Old" in a neighbourhood's name (Old Town, Old City) or in "old and new" says nothing of the
 * place, so the step that makes a museum historic reads those phrases past (community parks reads them past only just
 * before a community word, `discovery/parkKind.ts`, tend explore T9 and audit 1); marks read the name whole (the steward, S1).
 * The read-past runs after `normalizeWords` (decision 0172, tend presence 1).
 */
export const notableBeyondNeighbourhood = (name: string): boolean => notableName(normalizeWords(name).replace(NEIGHBOURHOOD, ' '));
