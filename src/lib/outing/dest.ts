// @layer core
import type { Waypoint } from '../nav/types';
import type { Outing } from './plan';

/** QC22, QC24: an ordinary suggested destination with positions only: its stops as `via`, its path followed as planned; no name of a stop. */
export function outingDest(_o: Outing): Waypoint {
  throw new Error('not built: quick-circuit QC22');
}
