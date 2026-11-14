// @layer core
import type { LngLat } from '../types';
import { mergeStretches, STRETCH_MIN_M, stretchesWhere, type Stretch } from '../walk/ahead';
import { litOf } from './overpass';
import type { DarkWay } from './types';

/*
 * After dark's heads-up (DK10, DK13): where along a route the streets are mapped as unlit, and whether to look. Decisions only;
 * nothing here changes the route. Only `lit=no` (and `disused`) counts: an untagged street is never said to be unlit.
 */

/** Unlit runs closer than this are one stretch, said once (steward S3). */
export const JOIN_M = 200;

/** DK10: the stretches of at least STRETCH_MIN_M of the route along ways mapped as unlit, runs less than JOIN_M apart joined. */
export function unlitStretches(path: readonly LngLat[], ways: readonly DarkWay[]): Stretch[] {
  const unlit = new Set(ways.filter((w) => litOf(w.lit) === 'unlit').map((w) => w.id));
  if (!unlit.size) return [];
  // Every tagged way is a segment, so a lit street beside an unlit one is matched as itself.
  const segs = ways.map((w) => ({ id: w.id, name: w.name ?? null, geometry: [w.line] }));
  const runs = stretchesWhere(path, segs, (id) => unlit.has(id), 'unlit', 'unlit:');
  const joined: Stretch[] = [];
  for (const r of runs) {
    const last = joined[joined.length - 1];
    if (last && r.fromM - last.toM < JOIN_M) joined[joined.length - 1] = { ...r, street: last.street ?? r.street, fromM: last.fromM };
    else joined.push(r);
  }
  return joined.filter((s) => s.toM - s.fromM >= STRETCH_MIN_M);
}

/** DK10: walkability's stretches and the unlit ones in route order; an unlit one overlapping walkability's is not said (one line at a time). */
export const withUnlit = (walk: readonly Stretch[], unlit: readonly Stretch[]): Stretch[] => mergeStretches(walk, unlit);

/** DK13: what the heads-up reads: walkability's tiles only while its layer is on, after-dark tiles only while this one is on and it is dark. */
export const headsUp = (o: { walkOn: boolean; darkOn: boolean; dark: boolean }) => ({ readWalk: o.walkOn, readDark: o.darkOn && o.dark });
