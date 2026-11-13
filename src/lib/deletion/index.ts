// @layer shell
import { type Faced, facedAll, hasMore, pieceKey } from '../moment';
import { db } from '../db';
import { forgetRecalls, setRecallHidden } from '../discovery/recallCheck';
import { mediaBytes, removeMedia } from '../media';
import type { CaptureKind, Walk } from '../types';
import { filesOf, filesOfMoments, isMedia, mediaRemoveText, pieceDeleteText, stackDeleteText, momentDeleteText, walkDeleteText, type ConfirmText } from './core';
import { createPending } from './pending';
import { createDeleteRunner } from './runner';
import { isPendingJob, isPendingJobs } from './saved';

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
  save: (jobs) => void db.setMeta(PENDING_KEY, jobs.length ? JSON.stringify(jobs) : '').catch(() => {}),
});

// A reminder never brings back a moment waiting in Undo (ui-conformance audit 7).
setRecallHidden(() => deletions.hidden());

// A delete still waiting when the app was last killed is stored now, with no pill (UC13).
void db
  .getMeta(PENDING_KEY)
  .then((raw) => {
    const saved: unknown = raw ? JSON.parse(raw) : null;
    // An older app saved one delete; this one saves a list.
    const jobs = isPendingJobs(saved) ? saved : isPendingJob(saved) ? [saved] : [];
    return jobs.length ? deletions.resume(jobs) : undefined;
  })
  .catch(() => {});

/** What a walk's actions would take, for the confirm (D4, D11). */
export interface WalkPlan {
  walk: Walk;
  captures: Faced[];
  media: Faced[];
  streets: number;
  walkText: ConfirmText;
  mediaText: ConfirmText | null;
}

export async function planWalk(walkId: string): Promise<WalkPlan | null> {
  const walk = await db.getWalk(walkId);
  if (!walk || walk.open) return null;
  const [captures, summaries] = await Promise.all([db.getMoments(walkId).then(facedAll), db.listSummaries()]);
  const shown = captures.filter((c) => !deletions.hidden().has(c.id));
  const media = shown.filter(isMedia);
  const streets = summaries.find((s) => s.walk_id === walkId)?.streets_walked ?? 0;
  const [walkBytes, mediaBytesN] = await Promise.all([
    mediaBytes(filesOfMoments(shown), [walkId]),
    media.length ? mediaBytes(filesOfMoments(media)) : Promise.resolve(0),
  ]);
  const n = (k: Faced['kind']) => media.filter((c) => c.kind === k).length;
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
export async function planMoment(c: Faced): Promise<ConfirmText> {
  const bytes = await mediaBytes(filesOfMoments([c])).catch(() => 0);
  // A moment holding more than one piece is named as the moment, with every piece's size (MS13).
  return hasMore(c) ? stackDeleteText(bytes) : momentDeleteText(c.kind, bytes);
}

/** D3: one moment, its reminder and its find. Its file and thumbnail go, read fresh (a thumbnail made since). */
export function deleteMoment(c: Faced) {
  // A stacked moment's toast names the moment, never its face's kind (MS13).
  deletions.schedule({ kind: 'moment', what: hasMore(c) ? undefined : c.kind, ids: [c.id], spec: { type: 'moment', captureId: c.id } });
}

/**
 * MS13: one piece of a moment, after the Undo window; hidden meanwhile by `pieceKey`. The last piece takes the
 * moment (`deletion/pieces`).
 */
export function deletePiece(m: Faced, pieceId: string, kind: CaptureKind) {
  deletions.schedule({ kind: 'piece', what: kind, ids: [pieceKey(pieceId)], spec: { type: 'piece', momentId: m.id, pieceId } });
}

/** What deleting one piece, or a stacked moment, would say (MS13). */
export async function planPiece(m: Faced, pieceId: string): Promise<ConfirmText> {
  const p = m.pieces.find((x) => x.id === pieceId);
  return pieceDeleteText(p?.kind ?? m.kind, await mediaBytes(filesOf(p ? [p] : [])).catch(() => 0));
}

/**
 * A note page left empty (NP9, decision 0151): its note goes, with the usual Undo. A one-piece moment is the moment;
 * a note added to another moment is that piece (MS13).
 */
export function deleteNoteNow(n: { id: string; piece_id: string }) {
  if (n.piece_id === n.id) deletions.schedule({ kind: 'moment', what: 'text', ids: [n.id], spec: { type: 'moment', captureId: n.id } });
  else deletions.schedule({ kind: 'piece', what: 'text', ids: [pieceKey(n.piece_id)], spec: { type: 'piece', momentId: n.id, pieceId: n.piece_id } });
}
