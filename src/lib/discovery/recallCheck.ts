// @layer shell
import { type Faced, facedAll } from '../moment';
import { AppState } from 'react-native';
import { createOpeners } from '../openers';
import { db } from '../db';
import { boundsOf, distanceM } from '../geo';
import { notifier } from '../notify';
import type { LngLat } from '../types';
import { afterFire, createRecallPlaces, dueRecalls, isExpired, RECALL_RULES, reminderText } from './recall';
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

// Fires go to the place in front that listens (the walk screen's card, the recording bar), else to a notification:
// decided when a fire is shown, not where it was checked (audit). Every place listens; none takes another's place, so
// a walk screen kept behind the tabs never takes a fire out of sight (tend explore 21). A place that goes with one
// nobody has seen hands it on to the next in front (tend explore audit 23).
const places = createRecallPlaces();
const active = () => AppState.currentState === 'active';
/** What waits is offered against the walk still open: a reminder of a walk that ended is dropped. */
const offerHeld = () => {
  void db.getOpenWalk().then((w) => places.offer(active(), w?.id ?? null)).catch(() => {});
};
/** Listen for fired reminders, while `inFront` says this place can be seen; returns the unsubscribe. */
export function onRecallFired(show: (captures: Faced[]) => void, inFront: () => boolean = () => true): () => void {
  const off = places.listen(show, inFront);
  offerHeld();
  return off;
}
/** A place came to the front: it takes a reminder handed on unseen. */
export const recallPlaceShown = offerHeld;
/** A place goes with a reminder nobody has seen: the next place in front of its walk shows it. */
export function handOnRecall(walkId: string, captures: Faced[]) {
  void db.getOpenWalk().then((w) => places.handOn(walkId, captures, active(), w?.id ?? null)).catch(() => {});
}
AppState.addEventListener('change', (s) => {
  if (s === 'active') offerHeld();
});
// With the app in front and no place in front (a replay over the tabs), it waits for the next place (tend explore 24).
async function deliver(walkId: string, captures: Faced[]) {
  if (!places.take(walkId, captures, active())) await notifier.recall(reminderText(captures), captures.map((c) => c.id), walkId).catch(() => {});
}

// What waits in Undo, told by the Undo window (lib/deletion), which imports this module: so it is set, not imported.
let hiddenNow: () => ReadonlySet<string> = () => new Set();
export function setRecallHidden(fn: () => ReadonlySet<string>) {
  hiddenNow = fn;
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
    const due = dueRecalls({ here: path, walkId, now, quiet, recalls: await recalls(), captures: await db.momentsIn(box).then(facedAll), hidden: hiddenNow() });
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
