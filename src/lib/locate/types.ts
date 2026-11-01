import type { LngLat } from '../types';

/**
 * One location fix for a moment made outside a walk (M2, M5). Nothing keeps
 * watching once it resolves: there is no tracking between moments.
 */
export interface LocateResult {
  at: LngLat | null;
  /** Why there is no place: location is off, or no fix good enough came in time. */
  reason?: 'denied' | 'timeout' | 'unavailable';
}

/** How long a moment waits for its fix. */
export const LOCATE_TIMEOUT_MS = 10_000;
/** The worst accuracy a moment's fix may have. */
export const LOCATE_MAX_ACCURACY_M = 50;
/** The oldest a cached fix may be, as the web's `maximumAge`. */
export const LOCATE_MAX_AGE_MS = 15_000;
/** However long a permission prompt stays up, a moment stops waiting after this. */
export const LOCATE_PROMPT_CAP_MS = 60_000;
