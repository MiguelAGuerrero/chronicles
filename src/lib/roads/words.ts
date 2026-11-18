// @layer core
import { formatDistance } from '../format';
import type { Units } from '../units';

/*
 * What the road engine says (RE13, RE32): a distance, by road. No time, no speed, no comparison.
 */
const MI_M = 1609.344;

/** RE2, RE13: a way's length, worded "by road": whole units from ten of them on. */
export function byRoadLine(m: number, units: Units): string {
  const big = units === 'mi' ? m / MI_M : m / 1000;
  return `${big >= 10 ? `${Math.round(big)} ${units}` : formatDistance(m, units)} by road`;
}

/**
 * RE11a, RE15, RE18: the page's one line about the road. Found: how the way is chosen, in words and with no figure. Being read:
 * said once. Not found or too far: said plainly, with what the distances then are and where the road is known.
 */
const STRAIGHT = 'Distances to towns are straight lines; Maps knows the road.';
export function roadLine(state: 'reading' | 'found' | 'failed' | 'none' | 'long'): string {
  if (state === 'reading') return 'Finding the road…';
  if (state === 'found') return 'The way keeps to the roads through the towns.';
  return `${state === 'long' ? 'Too far to find the road here.' : "Couldn't find the road."} ${STRAIGHT}`;
}
