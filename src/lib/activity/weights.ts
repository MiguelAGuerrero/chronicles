// @layer core
import { classesOfOsm, classesOfOverture, storefrontWeight } from '../presence/presence';

/*
 * What counts toward a street's storefronts, and how much (AD1): full for what makes a street a place to go (shops, food,
 * drink, attractions), half for everyday services and civic places, a quarter for offices and vehicle services, nothing
 * for the rest, nor for what is no storefront (specs/storefronts SF10). The weights are presence's (decision 0140, PR4).
 */

export const FULL = 1;
export const HALF = 0.5;
export const QUARTER = 0.25;

/** AD1: the weight of an OpenMapTiles POI. */
export function osmWeight(cls: string, sub: string): number {
  return storefrontWeight(classesOfOsm(cls, sub));
}

/** AD1: the weight of an Overture place, from its taxonomy hierarchy (root first). */
export function overtureWeight(hierarchy: readonly string[]): number {
  return storefrontWeight(classesOfOverture(hierarchy));
}
