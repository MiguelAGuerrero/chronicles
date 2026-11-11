// @layer core
import type { Measures } from './placeSignals';

/*
 * The shape of a territory and the one check the rule makes against it (specs/place-form PF5, PF28). A territory is a box over the measures; a bound that is null is open.
 * The table of territories is `placeFormTerritories.ts`, produced by `placeFormLearn.ts` from the confirmed places. Pure.
 */

export const FEATURES = ['junctionsPerKm2', 'placesPerKm2', 'buildingsPerKm2', 'highwayShare', 'busyStreetM', 'frontageShare'] as const;
export type Feature = (typeof FEATURES)[number];
/** A territory's bounds in the measure's own units; null is open. */
export type Bounds = { lo: number | null; hi: number | null };
export type Territory = Record<Feature, Bounds>;

/** Whether a place's measures lie inside a territory. */
export function inTerritory(t: Territory, m: Measures): boolean {
  return FEATURES.every((f) => (t[f].lo === null || m[f] >= t[f].lo!) && (t[f].hi === null || m[f] <= t[f].hi!));
}
