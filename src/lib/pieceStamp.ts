// @layer core
import type { LngLat } from './types';

/** A fix newer than this, at the moment of a capture, places it at once (no wait for a new one). */
export const FRESH_FIX_MS = 15_000;

/**
 * A capture's stamp (moment stacks MS3; 0036): its time, its place if a fresh fix is at hand, and whether to ask
 * for one. A piece added to an open moment (`into`) takes no fix and carries no place: the moment's one place,
 * kept already, is its place.
 */
export function stampFor(
  now: number,
  pos: { here: LngLat | null; lastFixAt: number | null },
  into: string | null,
): { t: number; at: LngLat | null; locate: boolean; into: string | null } {
  if (into) return { t: now, at: null, locate: false, into };
  const at = pos.here && pos.lastFixAt != null && now - pos.lastFixAt <= FRESH_FIX_MS ? pos.here : null;
  return { t: now, at, locate: !at, into: null };
}
