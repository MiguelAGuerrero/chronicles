import { planViews, type WalkMapHandle } from '../../components/map/types';
import { db } from '../db';
import { boundsOf } from '../geo';
import { newId } from '../id';
import { mapReads } from '../mapReads';
import { withTimeout } from '../places';
import { ensureTileBuild } from '../tiles';
import type { LngLat } from '../types';
import { marksFromScan, offeredFrom, pickMarks, SCAN_RULES, scanInputs, toReplace, type Prefs, type ScanOutcome } from './scan';
import { placesFromTilePois } from './tilePois';
import type { Mark } from './types';

const PREFS_KEY = 'discovery_prefs';
const VIEW_MS = 5000;
const READ_MIN_MS = 15_000;
const READ_MAX_MS = 60_000;

/** The walker's preferences; null until the first scan has asked (S14). */
export async function loadPrefs(): Promise<Prefs | null> {
  const raw = await db.getMeta(PREFS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Prefs;
  } catch {
    return null;
  }
}
export const savePrefs = (prefs: Prefs) => db.setMeta(PREFS_KEY, JSON.stringify(prefs));
/** Auto-scan (A2): a scan when a walk starts, set with the preferences. */
export const loadAutoScan = async () => (await db.getMeta('auto_scan')) === '1';
export const saveAutoScan = (on: boolean) => db.setMeta('auto_scan', on ? '1' : '');

/** 'busy': another map read (a route's) holds the camera; 'closed': the walk ended mid-scan. */
export type ScanResult = { outcome: ScanOutcome | 'cancelled' | 'busy' | 'closed'; marks: Mark[] };

/**
 * A scan around `center` (S2-S6, S10, S15): the z14 tiles of the 500 m
 * circle are read behind the map's cover, joined with the cached places of
 * this build, and up to six marks picked. The marks, the ones they replace
 * and their Offered rows are written in one transaction. A failed or
 * cancelled read changes nothing.
 */
export async function runScan(o: {
  center: LngLat;
  walkId: string | null;
  map: WalkMapHandle;
  shouldStop: () => boolean;
}): Promise<ScanResult> {
  return (await mapReads.run(() => scan(o))) ?? { outcome: 'busy', marks: [] };
}

async function scan(o: { center: LngLat; walkId: string | null; map: WalkMapHandle; shouldStop: () => boolean }): Promise<ScanResult> {
  const build = await ensureTileBuild().catch(() => 'unknown');
  const bounds = boundsOf([o.center], SCAN_RULES.radiusM)!;
  const { width, height } = o.map.size();
  const views = planViews(bounds, width, height, [o.center]);
  const ms = Math.min(READ_MAX_MS, Math.max(READ_MIN_MS, views.length * VIEW_MS));
  // A timeout stops the read too, so it never moves the camera after the cover lifts.
  let timedOut = false;
  const read = o.map.collect(views, () => timedOut || o.shouldStop());
  const features = await withTimeout(read, ms, 'The map').catch(() => {
    timedOut = true;
    return read.catch(() => null).then(() => null);
  });
  if (o.shouldStop()) return { outcome: 'cancelled', marks: [] };
  const got = features ? placesFromTilePois(features.pois, build) : [];
  if (build !== 'unknown') await db.putPlaces(got).catch(() => {});
  const cached = build !== 'unknown' ? await db.placesIn(bounds).catch(() => []) : [];
  const [offered, existing, prefs] = await Promise.all([db.listOffered(), db.listMarks(o.walkId), loadPrefs()]);

  // Tiles that didn't load: "Couldn't read the map here", and nothing changes (S15).
  const { failed, candidates } = scanInputs({ read: got, cached, build, center: o.center, offered, wasRead: features != null, complete: !!features?.complete });
  if (failed) return { outcome: 'failed', marks: [] };
  const { picked, outcome } = pickMarks({ candidates, center: o.center, offered, prefs: prefs ?? {} });
  if (outcome === 'none') return { outcome, marks: [] };
  // A walk stopped mid-scan gets no marks, and spends no places.
  if (o.walkId && !(await db.getWalk(o.walkId))?.open) return { outcome: 'closed', marks: [] };
  const now = Date.now();
  const marks = marksFromScan(picked, { walkId: o.walkId, now, newId });
  await db.saveScan({ replace: toReplace(existing, o.walkId, o.center), marks, offered: offeredFrom(picked, now) });
  return { outcome, marks };
}
