import { AppState } from 'react-native';
import { db } from '../db';
import { boundsOf, distanceM, filterFixes, nearPoints, withoutPauses } from '../geo';
import { notifier } from '../notify';
import type { LngLat, StreetSegment, Walk } from '../types';
import { ambientCheck } from './ambient';
import { QUIET_KEY } from './recallCheck';
import { marksFromScan, offeredFrom } from './scan';
import { cacheTilesAround } from './tileFetch';
import { newId } from '../id';

/** The walk that opted in to ambient hints (A2): off unless turned on for this walk. */
export const AMBIENT_KEY = 'ambient_walk';
/** The hints this walk has had: {walkId, count, lastAt} (A6). */
const FIRED_KEY = 'ambient_fired';
/** A hint's mark that a tapped notification asked to open (A9). */
export const MARK_OPEN_KEY = 'mark_open';
/** Pieces this close to the walk's own trace count as walked this walk (A5). */
const ON_TRACE_M = 20;
/** Only the recent fixes matter for the heading; the trace check reads them all. */
const RECENT = 120;

let screen: ((text: string, markId: string) => void) | null = null;
/** The walk screen, in front, takes a hint as a pill instead of a notification (A8). */
export function onAmbientHint(fn: (text: string, markId: string) => void): () => void {
  screen = fn;
  return () => {
    if (screen === fn) screen = null;
  };
}

let running = false;

/**
 * Ambient's one check (A3, A5-A9, A11), run by the location task on each
 * batch, in front and behind. It caches the tiles around you, gates a
 * candidate, and on a hint writes an ambient mark and its Offered row, then
 * shows it: a pill if the walk screen is in front, else a notification.
 */
export async function runAmbient(walk: Walk, now = Date.now()): Promise<void> {
  if (running) return;
  running = true;
  try {
    const [opted, quiet, firedRaw, nav] = await Promise.all([
      db.getMeta(AMBIENT_KEY), db.getMeta(QUIET_KEY), db.getMeta(FIRED_KEY), db.getMeta('nav'),
    ]);
    if (opted !== walk.id || quiet === walk.id) return;
    const pauses = await db.getPauses(walk.id);
    const points = await db.getPoints(walk.id);
    const accepted = filterFixes(withoutPauses(points, pauses), walk.started_at);
    const last = accepted[accepted.length - 1];
    if (!last) return;
    const here: LngLat = [last.lon, last.lat];
    // New ground: read its tiles, without the map (A11). A failure keeps the cache.
    await cacheTilesAround(here);
    const build = await db.getMeta('tile_build');
    const places = (await db.placesIn(boundsOf([here], 160)!)).filter((p) => p.build === build);
    if (!places.length) return;
    const visited = await db.visitedSegmentIds();
    const walkedNow = nearPoints(accepted.map((p) => [p.lon, p.lat] as LngLat), ON_TRACE_M);
    const unwalked = (await db.getSegmentsIn(boundsOf([here], 200)!)).filter((s) => !visited.has(s.id) && !walkedNow(mid(s)));
    const marks = await db.listMarks(walk.id);
    const open = marks.filter((m) => m.state === 'open');
    // One at a time (A8): no hint while a scan mark is pursued or an ambient one is open.
    const pursuing =
      open.some((m) => m.origin === 'ambient') ||
      open.some((m) => distanceM(m.at, here) <= 150) ||
      (nav != null && /"kind":"mark"/.test(nav) && JSON.parse(nav).walk_id === walk.id);
    let fired = { walkId: walk.id, count: 0, lastAt: null as number | null };
    try {
      const f = firedRaw ? JSON.parse(firedRaw) : null;
      if (f?.walkId === walk.id) fired = f;
    } catch {
      // a fresh count
    }
    const hint = ambientCheck({
      enabled: true, quiet: false, walkId: walk.id, startedAt: walk.started_at, pauses,
      fixes: points.slice(-RECENT), places, unwalked, offered: await db.listOffered(), fired, now, pursuing,
    });
    if (!hint) return;
    const [mark] = marksFromScan([hint.place], { walkId: walk.id, now, newId, origin: 'ambient' });
    await db.saveScan({ replace: [], marks: [mark], offered: offeredFrom([hint.place], now, 'ambient') });
    await db.setMeta(FIRED_KEY, JSON.stringify({ walkId: walk.id, count: fired.count + 1, lastAt: now }));
    if (screen && AppState.currentState === 'active') screen(hint.text, mark.id);
    else await notifier.ambient(hint.text, mark.id, walk.id).catch(() => {});
  } catch {
    // A check that fails is the same as no hint; the next batch checks again.
  } finally {
    running = false;
  }
}

function mid(s: StreetSegment): LngLat {
  const line = s.geometry[0] ?? [];
  return line[Math.floor(line.length / 2)] ?? [0, 0];
}
