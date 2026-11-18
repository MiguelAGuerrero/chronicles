// @layer core
import type { Waypoint } from '../nav/types';
import type { Outing } from './plan';

/** QC22, QC24: an ordinary suggested destination with positions only: its stops as `via`, its path followed as planned; no name of a stop. */
export function outingDest(o: Outing): Waypoint {
  const stops = o.stops.map((s) => s.at);
  return {
    at: o.loop ? o.path[0] : stops[stops.length - 1],
    label: 'An outing',
    kind: 'point',
    via: o.loop ? stops : stops.slice(0, -1),
    suggested: true,
    outing: true,
    ...(o.loop ? { loop: true } : {}),
    path: o.path,
  };
}
