// @layer core
/**
 * The Add to this moment pill's life (moment stacks MS4, MS5, MS12; decision 0106), as a reducer with no clock:
 * every event carries its own time, and `openId` asks at a given `now`.
 *
 * A capture from the edge stack opens its moment. The pill stays for that moment until two minutes pass with no
 * capture (on a walk or off one), or, on a walk, 100 m of walked trace from the moment's first capture (the place
 * every piece is shown at, so a moment never stretches along the street), or the walker dismisses it, leaves the
 * screen, opens another moment, or starts or stops a walk. Off a walk nothing is walked: no location is read (0036).
 * A dismissed moment never reopens. A capture begun while the pill is open joins its moment even if the pill closes
 * before it is kept (`target`).
 */

/** Two minutes with no capture closes the pill (the owner's number, Nov 9). */
export const OPEN_MS = 120_000;
/** On a walk, 100 m of walked trace from the moment's first capture closes it (the owner's number, Nov 10). */
export const WALK_ON_M = 100;

export type OpenEvent =
  /** A new moment kept from the edge stack. */
  | { k: 'kept'; id: string; t: number; walking: boolean }
  /** A piece added to a moment. */
  | { k: 'piece'; id: string; t: number }
  /** Metres the walk's recorded trace went since the last report. */
  | { k: 'walked'; m: number }
  | { k: 'dismiss' }
  | { k: 'leave' }
  /** A walk started or stopped. */
  | { k: 'walk' }
  /** A moment opened in the viewer. */
  | { k: 'opened'; id: string };

export interface OpenState {
  open: { id: string; last: number; walking: boolean; walked: number } | null;
  dismissed: readonly string[];
}

export const initial: OpenState = { open: null, dismissed: [] };

export function step(s: OpenState, e: OpenEvent): OpenState {
  switch (e.k) {
    case 'kept':
      return { ...s, open: { id: e.id, last: e.t, walking: e.walking, walked: 0 } };
    case 'piece':
      if (!s.open || s.open.id !== e.id || s.dismissed.includes(e.id)) return s;
      return { ...s, open: { ...s.open, last: Math.max(s.open.last, e.t) } };
    case 'walked':
      if (!s.open || !s.open.walking) return s;
      return { ...s, open: { ...s.open, walked: s.open.walked + Math.max(0, e.m) } };
    case 'dismiss':
      return s.open ? { open: null, dismissed: [...s.dismissed, s.open.id] } : s;
    case 'opened':
      return s.open && s.open.id !== e.id ? { ...s, open: null } : s;
    case 'leave':
    case 'walk':
      return { ...s, open: null };
  }
}

/** The moment the pill is open for at `now`, or null. */
export function openId(s: OpenState, now: number): string | null {
  const o = s.open;
  if (!o || now - o.last >= OPEN_MS || (o.walking && o.walked >= WALK_ON_M)) return null;
  return o.id;
}

/** The moment a capture begun at `now` from the pill joins: the open one, or null for a new moment. */
export const target = openId;
