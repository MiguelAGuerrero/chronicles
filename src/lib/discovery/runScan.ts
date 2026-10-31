import { planViews, type WalkMapHandle } from '../../components/map/types';
import { db } from '../db';
import { boundsOf } from '../geo';
import { newId } from '../id';
import { withTimeout } from '../places';
import { ensureTileBuild } from '../tiles';
import type { LngLat } from '../types';
import { candidatesFrom, marksFromScan, offeredFrom, pickMarks, SCAN_RULES, toReplace, type Prefs, type ScanOutcome } from './scan';
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

export type ScanResult = { outcome: ScanOutcome | 'cancelled'; marks: Mark[] };

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
  const build = await ensureTileBuild().catch(() => 'unknown');
  const bounds = boundsOf([o.center], SCAN_RULES.radiusM)!;
  const { width, height } = o.map.size();
  const views = planViews(bounds, width, height, [o.center]);
  const ms = Math.min(READ_MAX_MS, Math.max(READ_MIN_MS, views.length * VIEW_MS));
  const features = await withTimeout(o.map.collect(views, o.shouldStop), ms, 'The map').catch(() => null);
  if (o.shouldStop()) return { outcome: 'cancelled', marks: [] };
  const read = features ? placesFromTilePois(features.pois, build) : [];
  if (build !== 'unknown') await db.putPlaces(read).catch(() => {});
  const cached = build !== 'unknown' ? await db.placesIn(bounds).catch(() => []) : [];
  // Nothing read and nothing cached: the map couldn't be read here (S15).
  if ((!features || (!features.complete && read.length === 0)) && cached.length === 0) return { outcome: 'failed', marks: [] };
  const [offered, existing, prefs] = await Promise.all([db.listOffered(), db.listMarks(o.walkId), loadPrefs()]);
  const { picked, outcome } = pickMarks({ candidates: candidatesFrom(read, cached, build), center: o.center, offered, prefs: prefs ?? {} });
  if (outcome === 'none') return { outcome, marks: [] };
  const now = Date.now();
  const marks = marksFromScan(picked, { walkId: o.walkId, now, newId });
  await db.saveScan({ replace: toReplace(existing, o.walkId), marks, offered: offeredFrom(picked, now) });
  return { outcome, marks };
}
