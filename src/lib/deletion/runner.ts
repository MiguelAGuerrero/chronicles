// @layer shell
import type { Db } from '../db/types';
import { filesOf } from './core';
import type { DeleteSpec } from './pending';

/**
 * Stores one waiting delete (D1-D3, owner threads' deletes; decision 0113). Rows first, in one transaction each, then
 * files (a file left behind is never a row without its file). Every capture is read fresh, so a thumbnail made since
 * goes too, and a delete run again after a relaunch finds nothing left and does nothing.
 */
export function createDeleteRunner(p: {
  db: Pick<Db, 'getCaptures' | 'getCapturesByIds' | 'deleteWalk' | 'deleteCaptures' | 'applyThreads'>;
  removeMedia: (refs: string[], folders?: string[]) => Promise<unknown>;
  /** Drops the in-memory reminders of what went (the recall check's copy). */
  forgetRecalls: () => void;
}) {
  return async function run(spec: DeleteSpec): Promise<void> {
    switch (spec.type) {
      case 'walk': {
        const caps = await p.db.getCaptures(spec.walkId);
        await p.db.deleteWalk(spec.walkId);
        p.forgetRecalls();
        await p.removeMedia(filesOf(caps), [spec.walkId]);
        return;
      }
      case 'media': {
        const fresh = await p.db.getCapturesByIds(spec.captureIds);
        await p.db.deleteCaptures(spec.captureIds, { keepFinds: true });
        p.forgetRecalls();
        await p.removeMedia([...new Set(filesOf(fresh))]);
        return;
      }
      case 'moment': {
        const fresh = await p.db.getCapturesByIds([spec.captureId]);
        await p.db.deleteCaptures([spec.captureId]);
        p.forgetRecalls();
        await p.removeMedia([...new Set(filesOf(fresh))]);
        return;
      }
      case 'thread':
        await p.db.applyThreads({ deleteThreads: [spec.threadId] });
        return;
      case 'remove':
        await p.db.applyThreads({ deleteMembers: [{ thread_id: spec.threadId, moment_id: spec.momentId }] });
        return;
    }
  };
}
