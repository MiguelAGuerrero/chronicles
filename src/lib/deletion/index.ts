// @layer shell
import { db } from '../db';
import { forgetRecalls } from '../discovery/recallCheck';
import { mediaBytes, removeMedia } from '../media';
import type { Capture, Walk } from '../types';
import { filesOf, isMedia, mediaRemoveText, momentDeleteText, walkDeleteText, type ConfirmText } from './core';
import { createPending } from './pending';
import { createDeleteRunner } from './runner';
import { isPendingJob } from './saved';

/**
 * Clearing walks and moments (D1-D11): the app's one Undo window, wired to
 * real timers and storage. Every delete goes through here: rows first, in one
 * transaction, then files (a file left behind is never a row without its file).
 */
/** Meta: the delete waiting in the Undo window (UC13), as JSON; `isPendingJob` reads it back. */
export const PENDING_KEY = 'pending_delete';
const run = createDeleteRunner({ db, removeMedia, forgetRecalls });

export const deletions = createPending({
  setTimer: (fn, ms) => setTimeout(fn, ms),
  clearTimer: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
  run,
  // Kept so a killed app stores it at the next launch (UC13, decision 0113); a failed write only loses that.
  save: (job) => void db.setMeta(PENDING_KEY, job ? JSON.stringify(job) : '').catch(() => {}),
});

// A delete still waiting when the app was last killed is stored now, with no pill (UC13).
void db
  .getMeta(PENDING_KEY)
  .then((raw) => {
    const job: unknown = raw ? JSON.parse(raw) : null;
    return isPendingJob(job) ? deletions.resume(job) : undefined;
  })
  .catch(() => {});

/** What a walk's actions would take, for the confirm (D4, D11). */
export interface WalkPlan {
  walk: Walk;
  captures: Capture[];
  media: Capture[];
  streets: number;
  walkText: ConfirmText;
  mediaText: ConfirmText | null;
}

export async function planWalk(walkId: string): Promise<WalkPlan | null> {
  const walk = await db.getWalk(walkId);
  if (!walk || walk.open) return null;
  const [captures, summaries] = await Promise.all([db.getCaptures(walkId), db.listSummaries()]);
  const shown = captures.filter((c) => !deletions.hidden().has(c.id));
  const media = shown.filter(isMedia);
  const streets = summaries.find((s) => s.walk_id === walkId)?.streets_walked ?? 0;
  const [walkBytes, mediaBytesN] = await Promise.all([
    mediaBytes(filesOf(shown), [walkId]),
    media.length ? mediaBytes(filesOf(media)) : Promise.resolve(0),
  ]);
  const n = (k: Capture['kind']) => media.filter((c) => c.kind === k).length;
  return {
    walk,
    captures: shown,
    media,
    streets,
    walkText: walkDeleteText({ moments: shown.length, streets, bytes: walkBytes }),
    mediaText: media.length ? mediaRemoveText({ photos: n('photo'), videos: n('video'), voices: n('voice'), bytes: mediaBytesN }) : null,
  };
}

/** D1: the walk and everything tied to it, after the Undo window. */
export function deleteWalk(plan: WalkPlan) {
  const { walk, captures } = plan;
  deletions.schedule({ kind: 'walk', ids: [walk.id, ...captures.map((c) => c.id)], spec: { type: 'walk', walkId: walk.id } });
}

/** D2: the walk's photos, videos and memos; the places they found stay found. */
export function removeWalkMedia(plan: WalkPlan) {
  const ids = plan.media.map((c) => c.id);
  deletions.schedule({ kind: 'media', ids, spec: { type: 'media', walkId: plan.walk.id, captureIds: ids } });
}

/** What deleting one moment would say (D4). */
export async function planMoment(c: Capture): Promise<ConfirmText> {
  return momentDeleteText(c.kind, await mediaBytes(filesOf([c])).catch(() => 0));
}

/** D3: one moment, its reminder and its find. Its file and thumbnail go, read fresh (a thumbnail made since). */
export function deleteMoment(c: Capture) {
  deletions.schedule({ kind: 'moment', what: c.kind, ids: [c.id], spec: { type: 'moment', captureId: c.id } });
}
