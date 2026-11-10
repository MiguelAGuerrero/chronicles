// @layer shell
import { type Faced, facedAll } from '../moment';
import { AppState } from 'react-native';
import { db } from '../db';
import { forgetRecalls } from '../discovery/recallCheck';
import { mediaBytes, removeMedia } from '../media';
import type { Walk } from '../types';
import { filesOfMoments, isMedia, mediaRemoveText, momentDeleteText, walkDeleteText, type ConfirmText } from './core';
import { createPending } from './pending';

/**
 * Clearing walks and moments (D1-D11): the app's one Undo window, wired to
 * real timers and storage. Every delete goes through here: rows first, in one
 * transaction, then files (a file left behind is never a row without its file).
 */
export const deletions = createPending({
  setTimer: (fn, ms) => setTimeout(fn, ms),
  clearTimer: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
});

// Going to the background stores what waits (D5): a pocketed phone may never come back to it.
AppState.addEventListener('change', (s) => {
  if (s === 'background') void deletions.flush();
});

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
  deletions.schedule({
    kind: 'walk',
    ids: [walk.id, ...captures.map((c) => c.id)],
    run: async () => {
      // Read again at the end of the window: a moment made since (none for a finished walk) or one deleted meanwhile.
      const now = await db.getMoments(walk.id).then(facedAll);
      await db.deleteWalk(walk.id);
      forgetRecalls();
      await removeMedia(filesOfMoments(now), [walk.id]);
    },
  });
}

/** D2: the walk's photos, videos and memos; the places they found stay found. */
export function removeWalkMedia(plan: WalkPlan) {
  const media = plan.media;
  deletions.schedule({
    kind: 'media',
    ids: media.map((c) => c.id),
    run: async () => {
      const ids = media.map((c) => c.id);
      // Read fresh: a thumbnail made since the menu opened goes too.
      const fresh = await db.getMomentsByIds(ids).then(facedAll);
      await db.deleteMoments(ids, { keepFinds: true });
      forgetRecalls();
      await removeMedia([...new Set(filesOfMoments([...media, ...fresh]))]);
    },
  });
}

/** What deleting one moment would say (D4). */
export async function planMoment(c: Faced): Promise<ConfirmText> {
  return momentDeleteText(c.kind, await mediaBytes(filesOfMoments([c])).catch(() => 0));
}

/** D3: one moment, its reminder and its find. Its file and thumbnail go, read fresh (a thumbnail made since). */
export function deleteMoment(c: Faced) {
  deletions.schedule({
    kind: 'moment',
    what: c.kind,
    ids: [c.id],
    run: async () => {
      const [fresh] = await db.getMomentsByIds([c.id]).then(facedAll);
      await db.deleteMoments([c.id]);
      forgetRecalls();
      await removeMedia([...new Set(filesOfMoments(fresh ? [c, fresh] : [c]))]);
    },
  });
}
