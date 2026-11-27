// @layer core
import type { LngLat } from '../types';

/**
 * One location fix for a moment made outside a walk (M2, M5). Nothing keeps
 * watching once it resolves: there is no tracking between moments.
 */
export interface LocateResult {
  at: LngLat | null;
  /** Why there is no place: location is off, or no fix good enough came in time (or, asked not to ask, none could be read). */
  reason?: 'denied' | 'timeout' | 'unavailable';
}

/** `fresh`: refuse a cached position, however recent (a Locate tap asks where you are now). */
export interface LocateOptions {
  fresh?: boolean;
  /** Ends the read at once, its watch cleared, answering `unavailable` (a page that closed: fix outing-current-position audit 6). */
  signal?: AbortSignal;
  /**
   * `false`: never raise the permission prompt (specs/current-position, audit 1): the permission is read as it stands, and a
   * read starts only while it is granted; undecided answers `unavailable`, blocked `denied`, with no watch. Default: ask.
   */
  ask?: boolean;
}

/** How long a moment waits for its fix. */
export const LOCATE_TIMEOUT_MS = 10_000;
/** The worst accuracy a moment's fix may have. */
export const LOCATE_MAX_ACCURACY_M = 50;
/** The oldest a cached fix may be, as the web's `maximumAge`. */
export const LOCATE_MAX_AGE_MS = 15_000;
/** However long a permission prompt stays up, a moment stops waiting after this. */
export const LOCATE_PROMPT_CAP_MS = 60_000;
