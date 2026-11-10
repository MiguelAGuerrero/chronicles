// @layer core
import type { LngLat } from '../types';
import type { LandingView } from '../landing/view';
import type { Listed } from './atlas';

/** Explore's row of area cards (EC1-EC15): what is in it, which card a swipe or a scroll means, and which Busy names the map keeps. Stubs: tests first. */

/** The row's areas in order (EC3): a town's own card first on its page, then its neighborhoods; near you, the neighborhoods, then the other towns. */
export function rowOf(_p: { ownTown: Listed | null; neighborhoods: Listed[]; towns: Listed[] }): Listed[] {
  throw new Error('not implemented');
}

/** The key to select now (EC1): the selected one while it is in the row, else the first, else null. */
export function firstSelection(_order: string[], _selected: string | null): string | null {
  throw new Error('not implemented');
}

/** A swipe on the map in row steps (EC8): -1 previous, +1 next, 0 nothing; by screen direction, a drag more vertical than horizontal or under `minPx` is 0. */
export function rowStep(_dx: number, _dy: number, _minPx: number): -1 | 0 | 1 {
  throw new Error('not implemented');
}

/** The neighbouring key in a step, or null at an end or with nothing selected in the row (EC8, EC9). */
export function stepKey(_order: string[], _selected: string | null, _dir: -1 | 0 | 1): string | null {
  throw new Error('not implemented');
}

/** The card a scroll settled on (EC4): offset over the card step, clamped to the row. */
export function settledIndex(_offsetX: number, _step: number, _count: number): number {
  throw new Error('not implemented');
}

/** Where to scroll to centre a card (EC4). */
export function offsetOf(_index: number, _step: number): number {
  throw new Error('not implemented');
}

/** The Busy view with its names kept only inside the selected area's ring and from `minZoom` (EC7); its drawn streets are never touched. */
export function busyNamesNear(_view: LandingView | null, _at: LngLat | null, _zoom: number, _ringM: number, _minZoom: number): LandingView | null {
  throw new Error('not implemented');
}
