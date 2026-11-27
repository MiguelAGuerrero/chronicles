// @layer shell
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
 * Explore's one ask per launch (NV16, amended by decisions 0273 and 0275): with
 * location allowed Explore reads at every front, raising no prompt; where a read
 * could raise the system prompt (undecided), only its first front in a launch
 * asks. Never again in that launch: Find me and Locate ask after.
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

/**
 * Explore's "location is off" notice, dismissed: it stays dismissed until the
 * app is next launched (decision 0275, the owner's "Next launch"). In memory only.
 */
export function createLaunchFlag() {
  let on = false;
  return {
    get: () => on,
    set() {
      on = true;
    },
  };
}

export const offDismissed = createLaunchFlag();
