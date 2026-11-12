// @layer core
import type { LngLat } from '../types';
import type { LandingView } from './view';

/** One busy name the map may place (DC1, DC3): a strip's on its street, or a pocket's at its centre. */
export interface BusyName {
  name: string;
  /** The strip's or pocket's weight: a heavier one is placed first where names compete (DC4). */
  weight: number;
  stale: boolean;
  /** A strip's name follows this line (its pieces chained); a pocket's name sits at `at`. */
  line?: LngLat[];
  at?: LngLat;
}

/** A strip's street pieces joined end to end where they meet within `joinM` (DC3). Not built yet. */
export function chainLines(_lines: LngLat[][], _joinM = 2): LngLat[][] {
  throw new Error('chainLines: not built (explore-dense-city DC3)');
}

/** The names the map is given: one per strip and one per pocket without a strip (DC1, DC3). Not built yet. */
export function busyNames(_view: LandingView | null | undefined): BusyName[] {
  throw new Error('busyNames: not built (explore-dense-city DC1)');
}
