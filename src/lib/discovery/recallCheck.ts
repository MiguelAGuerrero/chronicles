import { db } from '../db';
import { boundsOf } from '../geo';
import type { Capture, LngLat } from '../types';
import { afterFire, dueRecalls, isExpired, RECALL_RULES } from './recall';

/** The walk being kept quiet (A2, R8): no reminders, no ambient alerts. */
export const QUIET_KEY = 'quiet_walk';

let running: Promise<Capture[]> | null = null;

/**
 * Checks the flagged captures near `here` and fires those due (R2, R5, R6,
 * R9): "once" clears, the rest count and remember this walk, and flags past
 * their until-date end silently. One check at a time, shared by the walk
 * screen (in front) and the location task (in the background), so a fix
 * never fires one twice.
 */
export function checkRecalls(walkId: string, here: LngLat, now = Date.now()): Promise<Capture[]> {
  if (running) return running.then(() => [] as Capture[]);
  running = (async () => {
    const recalls = await db.listRecalls();
    if (!recalls.length) return [];
    for (const r of recalls) if (isExpired(r, now)) await db.clearRecall(r.capture_id);
    const quiet = (await db.getMeta(QUIET_KEY)) === walkId;
    const near = await db.capturesIn(boundsOf([here], RECALL_RULES.reachM + 10)!);
    const due = dueRecalls({ here, walkId, now, quiet, recalls, captures: near });
    for (const { recall } of due) {
      const next = afterFire(recall, walkId, now);
      if (next.kind === 'clear') await db.clearRecall(recall.capture_id);
      else await db.setRecall({ ...recall, ...next.patch });
    }
    return due.map((d) => d.capture);
  })().finally(() => {
    running = null;
  });
  return running;
}
