import { distanceM } from '../geo';
import type { LngLat } from '../types';
import type { CategoryId } from './types';

/** Within this, a place with the same category and name is the same place moved (D6). */
export const SAME_PLACE_M = 50;

/** An unnamed place ("Public art") within this of one offered is that one. */
export const SAME_GENERIC_M = 15;

export const normalizeName = (name: string) => name.trim().replace(/\s+/g, ' ').toLocaleLowerCase();

/** category + normalized name + position rounded to 4 decimals; an unnamed place has no name part (D5). */
export function placeKey(category: CategoryId, name: string | null, at: LngLat): string {
  return JSON.stringify([category, name ? normalizeName(name) : '', at[0].toFixed(4), at[1].toFixed(4)]);
}

interface Placed { key: string; name: string; category: CategoryId; at: LngLat; generic?: boolean }

/** Whether `p` was already offered: the same key, or the same category and name within 50 m (D6). */
export function isOffered(p: Placed, offered: Placed[]): boolean {
  const name = normalizeName(p.name);
  return offered.some((o) => {
    if (o.key === p.key) return true;
    if (o.category !== p.category || !!o.generic !== !!p.generic) return false;
    // An unnamed artwork has nothing but its spot: a looser key, a tighter reach.
    if (p.generic) return distanceM(o.at, p.at) <= SAME_GENERIC_M;
    return normalizeName(o.name) === name && distanceM(o.at, p.at) <= SAME_PLACE_M;
  });
}
