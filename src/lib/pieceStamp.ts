// @layer core
import type { LngLat } from './types';

/** A fix newer than this, at the moment of a capture, places it at once (no wait for a new one). */
export const FRESH_FIX_MS = 15_000;

/**
 * A capture's stamp (moment stacks MS3; 0036): its time, its place if a fresh fix is at hand, and whether to ask
 * for one. A piece added to an open moment (`into`) takes no fix and carries no place: the moment's one place,
 * kept already, is its place.
 *
 * `place` is the key of the place whose card started the capture (capture-at-a-place CA2-CA4): the moment kept with
 * this stamp finds it. A piece never carries one (CA6): it joins its moment, never a place.
 */
export function stampFor(
  now: number,
  pos: { here: LngLat | null; lastFixAt: number | null },
  into: string | null,
  place: string | null = null,
): { t: number; at: LngLat | null; locate: boolean; into: string | null; place: string | null } {
  if (into) return { t: now, at: null, locate: false, into, place: null };
  const at = pos.here && pos.lastFixAt != null && now - pos.lastFixAt <= FRESH_FIX_MS ? pos.here : null;
  return { t: now, at, locate: !at, into: null, place };
}

/**
 * Where a photo taken while a memo records goes (T44, decision 0233, amending NR10): with the memo. A memo begun for an
 * open moment takes the photo into that moment; a memo of its own has no moment yet, so the photo is kept as the moment,
 * finding the place the memo was begun for, and the memo joins it when saved (`memoJoins`). No memo: the camera's own.
 */
export function photoMidMemo(
  memo: { into?: string | null; place?: string | null } | null,
  into: string | null,
  place: string | null,
): { into: string | null; place: string | null } {
  if (!memo) return { into, place };
  const to = memo.into ?? into;
  return to ? { into: to, place: null } : { into: null, place: memo.place ?? place };
}

/**
 * The memo still recording, once a photo taken during it is kept in `momentId`: it is saved into that moment, as MS2's
 * `into` saves any piece. Its own fix, place and reply stay, so a moment gone meanwhile keeps it as a moment of its own
 * (UN11). A memo already going to a moment keeps it.
 */
export function memoJoins<S extends { into?: string | null }>(memo: S, momentId: string): S {
  return memo.into ? memo : { ...memo, into: momentId };
}
