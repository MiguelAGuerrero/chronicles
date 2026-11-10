// @layer shell
import { type Faced, facedAll } from '../moment';
import { AppState } from 'react-native';
import { createOpeners } from '../openers';
import { db } from '../db';
import { boundsOf, distanceM } from '../geo';
import { notifier } from '../notify';
import type { LngLat } from '../types';
import { afterFire, dueRecalls, isExpired, RECALL_RULES, reminderText } from './recall';
import type { Recall } from './types';

/** Captures a tapped reminder notification asked to open, for whichever screen mounts next (R4). */
export const RECALL_OPEN_KEY = 'recall_open';
/** A check runs again only after this much walking (audit: not every fix, every second). */
const STEP_M = 10;

// The flags, kept in memory between checks; every write goes through here.
let cache: Recall[] | null = null;
const recalls = async () => (cache ??= await db.listRecalls());
// Maps listen, so a pin's bell follows a reminder set, fired, stopped or deleted (RB5).
const changed = new Set<() => void>();
const tell = () => {
  for (const fn of changed) fn();
};
/** Called after any reminder is written or dropped; returns the unsubscribe. */
export function onRecallsChanged(fn: () => void): () => void {
  changed.add(fn);
  return () => {
    changed.delete(fn);
  };
}
/**
 * The flags as stored now, for the pins' bells (RB1). Read from storage, never
 * through the cache above: filling that early would hide a flag written after a
 * map opened from the next check.
 */
export const readRecalls = () => db.listRecalls();
export async function saveRecall(r: Recall) {
  await db.setRecall(r);
  cache = null;
  tell();
}
export async function stopRecall(captureId: string) {
  await db.clearRecall(captureId);
  cache = null;
  tell();
}
/** Drops the in-memory flags after a delete took some with it (D3), so the next check reads storage. */
export function forgetRecalls() {
  cache = null;
  tell();
}
/** The flag as stored now, for an edit that must not undo a fire (R9). */
export async function storedRecall(captureId: string): Promise<Recall | null> {
  cache = null;
  return (await recalls()).find((r) => r.capture_id === captureId) ?? null;
}

// Fires go to the walk screen when it is in front, else to a notification:
// decided when a fire is shown, not where it was checked (audit).
let screen: ((captures: Faced[]) => void) | null = null;
export function onRecallFired(fn: (captures: Faced[]) => void): () => void {
  screen = fn;
  return () => {
    if (screen === fn) screen = null;
  };
}
async function deliver(walkId: string, captures: Faced[]) {
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
/** Resolves true when a reminder fired. */
export function checkRecalls(walkId: string, path: LngLat[], now = Date.now()): Promise<boolean> {
  const end = path[path.length - 1];
  if (!end) return Promise.resolve(false);
  if (running) return Promise.resolve(true);
  if (last && last.walkId === walkId && path.every((p) => distanceM(p, last!.at) < STEP_M)) return Promise.resolve(false);
  running = (async () => {
    last = { walkId, at: end };
    const all = await recalls();
    if (!all.length) return false;
    for (const r of all) if (isExpired(r, now)) await stopRecall(r.capture_id);
    // Reminders come back on every walk, quiet or exploring (the owner's call, after the audit):
    // a reminder is set on purpose, not discovery.
    const quiet = false;
    const box = boundsOf(path, RECALL_RULES.reachM + 10)!;
    const due = dueRecalls({ here: path, walkId, now, quiet, recalls: await recalls(), captures: await db.momentsIn(box).then(facedAll) });
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

// A tapped reminder opens on the screen in front at once (audit 1): meta only waits for a cold start.
// Every screen that can open one listens; the newest is asked first, and one that can't passes it on.
const openers = createOpeners<Faced[]>();
/** Listen for tapped reminders; return true when this screen opened it. */
export function onRecallOpen(fn: (captures: Faced[]) => boolean): () => void {
  return openers.add(fn);
}
/**
 * Told when a tapped reminder has been kept for the next screen. A screen that mounted while it was being
 * kept read nothing (the walk screen, on a cold open with a walk open, NR3): it takes it now.
 */
const waiting = new Set<() => void>();
export function onRecallWaiting(fn: () => void): () => void {
  waiting.add(fn);
  return () => {
    waiting.delete(fn);
  };
}
/** Opens a tapped reminder's captures where a screen takes them; else keeps them for the next screen (R4). Resolves whether one opened. */
export async function openRecall(ids: string[]): Promise<boolean> {
  if (openers.size()) {
    const found = await db.getMomentsByIds(ids).then(facedAll).catch(() => []);
    if (found.length && openers.offer(found)) return true;
  }
  await db.setMeta(RECALL_OPEN_KEY, JSON.stringify(ids));
  for (const fn of [...waiting]) fn();
  return false;
}
/** Whether a tapped reminder is waiting for the next screen. */
export const recallWaiting = async () => !!(await db.getMeta(RECALL_OPEN_KEY));

/** The captures a tapped notification asked to open, once (R4); found by id, wherever the walker is now. */
export async function takeRecallOpen(): Promise<Faced[]> {
  const raw = await db.getMeta(RECALL_OPEN_KEY);
  if (!raw) return [];
  await db.setMeta(RECALL_OPEN_KEY, '');
  try {
    return await db.getMomentsByIds(JSON.parse(raw) as string[]).then(facedAll);
  } catch {
    return [];
  }
}
