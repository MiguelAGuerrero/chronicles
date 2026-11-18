// @layer core
import { distanceM } from '../geo';
import { GET_THERE_M } from '../startPlan';
import type { LngLat } from '../types';

/**
 * How Start is offered for a journey's first chapter (0121, 0207, 0211; audit 9): around where you stand it starts at once; for a
 * named place it starts at once when near, and with "When I get there" beside it when far, since a session may begin wherever you
 * are, the drive included (OJ28). With no position to begin from, only "When I get there".
 */
export function startChoice(o: { origin: LngLat | null; first: LngLat; named: boolean }): 'start' | 'ask' | 'later' {
  if (!o.named) return 'start';
  if (!o.origin) return 'later';
  return distanceM(o.origin, o.first) > GET_THERE_M ? 'ask' : 'start';
}
