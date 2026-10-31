import { AppState } from 'react-native';
import { db } from '../db';
import { boundsOf, filterFixes, withoutPauses } from '../geo';
import { notifier } from '../notify';
import type { LngLat, Walk } from '../types';
import { ambientBlocked, ambientCheck, isPursuing, unwalkedPieces } from './ambient';
import { QUIET_KEY, RECALL_LAST_KEY } from './recallCheck';
import { marksFromScan, offeredFrom } from './scan';
import { cacheTilesAround } from './tileFetch';
import { newId } from '../id';

/** The walk that opted in to ambient hints (A2): off unless turned on for this walk. */
export const AMBIENT_KEY = 'ambient_walk';
/** The hints this walk has had: {walkId, count, lastAt} (A6). */
const FIRED_KEY = 'ambient_fired';
/** A hint's mark that a tapped notification asked to open (A9). */
export const MARK_OPEN_KEY = 'mark_open';
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
    // The cheap checks first: most batches stop here (audit).
    const [opted, quiet, firedRaw] = await Promise.all([db.getMeta(AMBIENT_KEY), db.getMeta(QUIET_KEY), db.getMeta(FIRED_KEY)]);
    let fired = { walkId: walk.id, count: 0, lastAt: null as number | null };
    try {
      const f = firedRaw ? JSON.parse(firedRaw) : null;
      if (f?.walkId === walk.id) fired = f;
    } catch {
      // a fresh count
    }
    if (ambientBlocked({ enabled: opted === walk.id, quiet: quiet === walk.id, walkId: walk.id, fired, now })) return;
    const pauses = await db.getPauses(walk.id);
    const points = await db.getPoints(walk.id);
    const accepted = filterFixes(withoutPauses(points, pauses), walk.started_at);
    const last = accepted[accepted.length - 1];
    if (!last) return;
    const here: LngLat = [last.lon, last.lat];
    const trace = accepted.map((p) => [p.lon, p.lat] as LngLat);
    const [nav, recallLast, marks] = await Promise.all([db.getMeta('nav'), db.getMeta(RECALL_LAST_KEY), db.listMarks(walk.id)]);
    let navMarkId: string | null = null;
    try {
      const n = nav ? JSON.parse(nav) : null;
      if (n?.walk_id === walk.id && n.dest?.kind === 'mark') navMarkId = n.dest.markId ?? null;
    } catch {
      // no route
    }
    const open = marks.filter((m) => m.state === 'open');
    if (isPursuing({ open, here, fixes: trace, navMarkId })) return;
    // New ground: read its tiles, without the map (A11). A failure keeps the cache.
    await cacheTilesAround(here);
    const build = await db.getMeta('tile_build');
    const places = (await db.placesIn(boundsOf([here], 160)!)).filter((p) => p.build === build);
    if (!places.length) return;
    const unwalked = unwalkedPieces(await db.getSegmentsIn(boundsOf([here], 200)!), await visitedIds(), trace);
    const hint = ambientCheck({
      enabled: true, quiet: false, walkId: walk.id, startedAt: walk.started_at, pauses,
      fixes: points.slice(-RECENT), places, unwalked, offered: await db.listOffered(), fired, now,
      pursuing: false, lastRecallAt: recallLast ? Number(recallLast) : null,
      includeChains: (await db.getMeta('discovery_chains')) === '1',
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

// Every street piece any walk credited, read at most once a minute: it only grows at a stop.
let visited: { at: number; ids: Set<string> } | null = null;
async function visitedIds(): Promise<Set<string>> {
  if (!visited || Date.now() - visited.at > 60_000) visited = { at: Date.now(), ids: await db.visitedSegmentIds() };
  return visited.ids;
}
