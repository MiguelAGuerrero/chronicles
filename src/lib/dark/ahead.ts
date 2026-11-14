// @layer core
import type { LngLat } from '../types';
import { mergeStretches, STRETCH_MIN_M, stretchesWhere, type Stretch } from '../walk/ahead';
import { litOf } from './overpass';
import type { DarkWay } from './types';

/*
 * After dark's heads-up (DK10, DK13): where along a route the streets are mapped as unlit, and whether to look. Decisions only;
 * nothing here changes the route. Only `lit=no` counts: an untagged street is never said to be unlit.
 */

/** Unlit runs closer than this are one stretch, said once (steward S3). */
export const JOIN_M = 200;

/** DK10: the stretches of at least STRETCH_MIN_M of the route along ways mapped as unlit, runs less than JOIN_M apart joined. */
export function unlitStretches(path: readonly LngLat[], ways: readonly DarkWay[]): Stretch[] {
  const unlit = new Set(ways.filter((w) => litOf(w.lit) === 'unlit').map((w) => w.id));
  if (!unlit.size) return [];
  // Every tagged way is a segment, so a lit street beside an unlit one is matched as itself.
  const segs = ways.map((w) => ({ id: w.id, name: w.name ?? null, geometry: [w.line] }));
  // Each run must be long enough on its own before runs are joined (after-dark audit 1): the gap between two is not unlit, and
  // two short crossings of an untagged street are never one stretch.
  const runs = stretchesWhere(path, segs, (id) => unlit.has(id), 'unlit', 'unlit:').filter((s) => s.toM - s.fromM >= STRETCH_MIN_M);
  const joined: (Stretch & { longest: number })[] = [];
  for (const r of runs) {
    const last = joined[joined.length - 1];
    const len = r.toM - r.fromM;
    // Joined, the stretch is named for its longest run (after-dark audit 1).
    if (last && r.fromM - last.toM < JOIN_M) joined[joined.length - 1] = { ...r, street: len > last.longest ? r.street ?? last.street : last.street ?? r.street, fromM: last.fromM, longest: Math.max(len, last.longest) };
    else joined.push({ ...r, longest: len });
  }
  return joined.map(({ longest: _l, ...s }) => s);
}

/** DK10: walkability's stretches and the unlit ones in route order; an unlit one overlapping walkability's is not said (one line at a time). */
export const withUnlit = (walk: readonly Stretch[], unlit: readonly Stretch[]): Stretch[] => mergeStretches(walk, unlit);

/** DK13: what the heads-up reads: walkability's tiles only while its layer is on, after-dark tiles only while this one is on and it is dark. */
export const headsUp = (o: { walkOn: boolean; darkOn: boolean; dark: boolean }) => ({ readWalk: o.walkOn, readDark: o.darkOn && o.dark });

/**
 * The heads-up's two keys (after-dark audit 5): `watch` is the route alone, what the heads-up remembers lines by, so crossing
 * sunset (which changes what is read) never clears a line on screen; `read` adds what is read, so the tiles are read again.
 */
export function watchKeys(route: readonly LngLat[], reads: string): { watch: string; read: string } {
  const watch = `${route[0].join(',')}>${route[route.length - 1].join(',')}#${route.length}`;
  return { watch, read: `${watch}|${reads}` };
}

/**
 * The heads-up's reads (after-dark audit 2): walkability's stretches are handed on as soon as they are had, never held for the
 * after-dark read; then both together. `emit` gets each list; a read that fails or is absent counts as none.
 */
export async function aheadReads(o: { walk: (() => Promise<Stretch[]>) | null; dark: (() => Promise<Stretch[]>) | null }, emit: (list: Stretch[]) => void): Promise<void> {
  const walk = o.walk ? await o.walk().catch(() => [] as Stretch[]) : [];
  if (o.walk) emit(walk);
  if (!o.dark) return;
  const unlit = await o.dark().catch(() => [] as Stretch[]);
  emit(withUnlit(walk, unlit));
}
