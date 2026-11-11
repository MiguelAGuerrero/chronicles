// @layer core
import type { BuildingPiece, Complex, ComplexKind, PlaceIn } from './types';

/*
 * The rule (CX1-CX3, CX14): which named buildings are complexes, and of what kind. One table, tuned on the saved real
 * fixtures (`__tests__/complexes/*.json`, `scripts/fixture-complexes.mjs`); the minimums gate "made of other places", they
 * are never a measure of size or significance (decision 0103).
 */

/** Shopping: places to go (presence weight 1: shop, boutique, eatery, food counter, drink), never offices or services. */
export const MIN_GO = 8;
/** Markets: places whose Overture category is a farmers', public or flea market. */
export const MIN_MARKET = 2;
/** Campuses (subtype medical or education) and Civic (subtype civic): places of any class inside. */
export const MIN_CAMPUS = 8;
export const MIN_CIVIC = 8;

const NOT_YET = () => new Error('complexes: not implemented');

/** The z14 tiles holding any vertex of the pieces of one building: all must be read before it is judged (CX14). */
export function neededTiles(_pieces: readonly BuildingPiece[]): [number, number][] {
  throw NOT_YET();
}

/** The kind of a joined building and what it holds, or null when it fits none (CX3). First match: markets, stations, campuses, civic, shopping. */
export function kindOf(_b: { subtype: string | null; class: string | null }, _inside: readonly PlaceIn[]): ComplexKind | null {
  throw NOT_YET();
}

/** The complexes among these pieces and places: pieces joined by id, judged only when every needed tile is in `readTiles` (CX1-CX3, CX14). */
export function complexesFrom(_pieces: readonly BuildingPiece[], _places: readonly PlaceIn[], _readTiles: readonly [number, number][], _release: string): Complex[] {
  throw NOT_YET();
}
