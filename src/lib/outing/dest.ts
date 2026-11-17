// @layer core
import type { Waypoint } from '../nav/types';
import type { Outing } from './plan';

/** QC22, QC24: an ordinary suggested destination with positions only: its stops as `via`, its path followed as planned; no name of a stop. */
export function outingDest(o: Outing): Waypoint {
  const stops = o.stops.map((s) => s.at);
  // OJ24: a chapter of one stop is a plain suggested point: there is no path to follow to it.
  if (stops.length === 1 && o.path.length < 2) return { at: stops[0], label: 'An outing', kind: 'point', suggested: true, outing: true };
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
