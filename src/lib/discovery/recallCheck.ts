import { AppState } from 'react-native';
import { db } from '../db';
import { boundsOf, distanceM } from '../geo';
import { notifier } from '../notify';
import type { Capture, LngLat } from '../types';
import { afterFire, dueRecalls, isExpired, RECALL_RULES, reminderText } from './recall';
import type { Recall } from './types';

/** The walk being kept quiet (A2, R8): no reminders, no ambient alerts. */
export const QUIET_KEY = 'quiet_walk';
/** Captures a tapped reminder notification asked to open, for whichever screen mounts next (R4). */
export const RECALL_OPEN_KEY = 'recall_open';
/** A check runs again only after this much walking (audit: not every fix, every second). */
const STEP_M = 10;

// The flags, kept in memory between checks; every write goes through here.
let cache: Recall[] | null = null;
const recalls = async () => (cache ??= await db.listRecalls());
export async function saveRecall(r: Recall) {
  await db.setRecall(r);
  cache = null;
}
export async function stopRecall(captureId: string) {
  await db.clearRecall(captureId);
  cache = null;
}
/** The flag as stored now, for an edit that must not undo a fire (R9). */
export async function storedRecall(captureId: string): Promise<Recall | null> {
  cache = null;
  return (await recalls()).find((r) => r.capture_id === captureId) ?? null;
}

// Fires go to the walk screen when it is in front, else to a notification:
// decided when a fire is shown, not where it was checked (audit).
let screen: ((captures: Capture[]) => void) | null = null;
export function onRecallFired(fn: (captures: Capture[]) => void): () => void {
  screen = fn;
  return () => {
    if (screen === fn) screen = null;
  };
}
async function deliver(walkId: string, captures: Capture[]) {
  if (screen && AppState.currentState === 'active') screen(captures);
  else await notifier.recall(reminderText(captures), captures.map((c) => c.id), walkId).catch(() => {});
}

let running: Promise<boolean> | null = null;
let last: { walkId: string; at: LngLat } | null = null;

/**
 * Checks the flagged captures near the walk's latest accepted fixes and fires
 * those due (R2, R5, R6, R9): "once" clears, the rest count and remember this
 * walk, flags past their until-date end silently. One check at a time,
 * shared by the walk screen and the location task; a check that finds itself
 * overlapping another is skipped, the next fix checks again.
 */
/** Resolves true when a reminder fired: ambient waits for the next batch (R7). */
export function checkRecalls(walkId: string, path: LngLat[], now = Date.now()): Promise<boolean> {
  const end = path[path.length - 1];
  if (!end || running) return Promise.resolve(false);
  if (last && last.walkId === walkId && path.every((p) => distanceM(p, last!.at) < STEP_M)) return Promise.resolve(false);
  running = (async () => {
    last = { walkId, at: end };
    const all = await recalls();
    if (!all.length) return false;
    for (const r of all) if (isExpired(r, now)) await stopRecall(r.capture_id);
    const quiet = (await db.getMeta(QUIET_KEY)) === walkId;
    if (quiet) return false;
    const box = boundsOf(path, RECALL_RULES.reachM + 10)!;
    const due = dueRecalls({ here: path, walkId, now, quiet, recalls: await recalls(), captures: await db.capturesIn(box) });
    if (!due.length) return false;
    for (const { recall } of due) {
      const next = afterFire(recall, walkId, now);
      if (next.kind === 'clear') await stopRecall(recall.capture_id);
      else await saveRecall({ ...recall, ...next.patch });
    }
    await deliver(walkId, due.map((d) => d.capture));
    return true;
  })()
    .catch(() => false)
    .finally(() => {
      running = null;
    });
  return running;
}

/** The captures a tapped notification asked to open, once (R4); found by id, wherever the walker is now. */
export async function takeRecallOpen(): Promise<Capture[]> {
  const raw = await db.getMeta(RECALL_OPEN_KEY);
  if (!raw) return [];
  await db.setMeta(RECALL_OPEN_KEY, '');
  try {
    return await db.getCapturesByIds(JSON.parse(raw) as string[]);
  } catch {
    return [];
  }
}
