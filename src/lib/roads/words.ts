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
