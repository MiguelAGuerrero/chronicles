// @layer core
import { distanceM } from '../geo';
import { NAV } from '../nav/rules';
import { GET_THERE_M } from '../startPlan';
import type { LngLat } from '../types';

/**
 * How Start is offered for a journey's first chapter (0121; audit 9): around where you stand it starts at once; for a named place it
 * starts at once when near, asks with "When I get there" beside it when far, and offers that alone past what the app can route or
 * when it has no position to measure from.
 */
export function startChoice(o: { origin: LngLat | null; first: LngLat; named: boolean }): 'start' | 'ask' | 'later' {
  if (!o.named) return 'start';
  if (!o.origin) return 'later';
  const d = distanceM(o.origin, o.first);
  return d > NAV.maxM ? 'later' : d > GET_THERE_M ? 'ask' : 'start';
}
