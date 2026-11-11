// @layer core
import { classesOfOsm, classesOfOverture, densityWeight } from '../presence/presence';

/*
 * What counts toward a street's density, and how much (AD1): full for what makes a street a place to go (shops, food,
 * drink, attractions), half for everyday services and civic places, a quarter for offices and vehicle services, nothing
 * for the rest. The weights are presence's (decision 0140, PR4): the same class for a tag as marks read.
 */

export const FULL = 1;
export const HALF = 0.5;
export const QUARTER = 0.25;

/** AD1: the weight of an OpenMapTiles POI. */
export function osmWeight(cls: string, sub: string): number {
  return densityWeight(classesOfOsm(cls, sub));
}

/** AD1: the weight of an Overture place, from its taxonomy hierarchy (root first). */
export function overtureWeight(hierarchy: readonly string[]): number {
  return densityWeight(classesOfOverture(hierarchy));
}
