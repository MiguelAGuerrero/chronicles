import type { LngLat } from './types';

/**
 * The last fix Navigate or Explore read (NV17, NV16), in memory only: Explore
 * starts its map there. Nothing tracks: it is one fix, kept until the next one
 * is read.
 */
let last: { at: LngLat; t: number } | null = null;
export const getLastFix = () => last;
export function setLastFix(at: LngLat, t = Date.now()) {
  last = { at, t };
}

/**
 * Explore's one fix per launch (NV16, the owner's call, Nov 3): it opens first
 * (NV2), before Navigate has read a fix, so its first focus asks for one. Never
 * again in that launch, and not at all once a fix is known.
 */
export function createLaunchFix() {
  let had = false;
  return {
    take(known: boolean) {
      if (had) return false;
      had = true;
      return !known;
    },
  };
}

export const launchFix = createLaunchFix();
