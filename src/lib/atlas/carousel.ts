// @layer core
import { distanceM } from '../geo';
import type { LandingView } from '../landing/view';
import type { LngLat } from '../types';
import type { Listed } from './atlas';

/** Explore's row of area cards (EC1-EC15): what is in it, which card a swipe or a scroll means, and which Busy names the map keeps. */

/** The row's areas in order (EC3): a town's own card first on its page, then its neighborhoods; near you, the neighborhoods, then the other towns. */
export function rowOf(p: { ownTown: Listed | null; neighborhoods: Listed[]; towns: Listed[] }): Listed[] {
  return p.ownTown ? [p.ownTown, ...p.neighborhoods] : [...p.neighborhoods, ...p.towns];
}

/** The key to select now (EC1): the selected one while it is in the row, else the first, else null. */
export function firstSelection(order: string[], selected: string | null): string | null {
  if (selected != null && order.includes(selected)) return selected;
  return order[0] ?? null;
}

/** A swipe on the map in row steps (EC8): -1 previous, +1 next, 0 nothing; by screen direction, a drag more vertical than horizontal or under `minPx` is 0. */
export function rowStep(dx: number, dy: number, minPx: number): -1 | 0 | 1 {
  if (Math.abs(dx) < minPx || Math.abs(dy) > Math.abs(dx)) return 0;
  // The finger travelling left brings the next card in, as a swipe on the row does.
  return dx < 0 ? 1 : -1;
}

/** The neighbouring key in a step, or null at an end or with nothing selected in the row (EC8, EC9). */
export function stepKey(order: string[], selected: string | null, dir: -1 | 0 | 1): string | null {
  if (dir === 0 || selected == null) return null;
  const i = order.indexOf(selected);
  return i < 0 ? null : order[i + dir] ?? null;
}

/** The card a scroll settled on (EC4): offset over the card step, clamped to the row. */
export function settledIndex(offsetX: number, step: number, count: number): number {
  if (count <= 0 || step <= 0) return 0;
  return Math.max(0, Math.min(count - 1, Math.round(offsetX / step)));
}

/** Where to scroll to centre a card (EC4). */
export const offsetOf = (index: number, step: number): number => index * step;

/** The Busy view with its names kept only inside the selected area's ring and from `minZoom` (EC7); its drawn streets are never touched. */
export function busyNamesNear(view: LandingView | null, at: LngLat | null, zoom: number, ringM: number, minZoom: number): LandingView | null {
  if (!view) return null;
  const named = at != null && zoom >= minZoom;
  const near = (p: LngLat) => named && distanceM(at, p) <= ringM;
  return { ...view, strips: view.strips.filter((s) => near(s.at)), labels: view.labels.filter((l) => near(l.at)) };
}
