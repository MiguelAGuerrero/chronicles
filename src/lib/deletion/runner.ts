// @layer shell
import type { Db } from '../db/types';
import { withoutPiece } from '../moment';
import { filesOf, filesOfMoments } from './core';
import type { DeleteSpec } from './pending';

/**
 * Stores one waiting delete (D1-D3, owner threads' deletes, moment stacks' pieces and splits; decision 0113). Rows
 * first, in one transaction each, then files (a file left behind is never a row without its file). Every moment is
 * read fresh, so a small copy made since goes too, and a delete run again after a relaunch finds nothing left and
 * does nothing.
 */
export function createDeleteRunner(p: {
  db: Pick<Db, 'getMoments' | 'getMomentsByIds' | 'deleteWalk' | 'deleteMoments' | 'deletePieces' | 'splitPiece' | 'applyThreads'>;
  removeMedia: (refs: string[], folders?: string[]) => Promise<unknown>;
  /** Drops the in-memory reminders of what went (the recall check's copy). */
  forgetRecalls: () => void;
}) {
  return async function run(spec: DeleteSpec): Promise<void> {
    switch (spec.type) {
      case 'walk': {
        const moments = await p.db.getMoments(spec.walkId);
        await p.db.deleteWalk(spec.walkId);
        p.forgetRecalls();
        await p.removeMedia(filesOfMoments(moments), [spec.walkId]);
        return;
      }
      case 'media': {
        const fresh = await p.db.getMomentsByIds(spec.captureIds);
        await p.db.deleteMoments(spec.captureIds, { keepFinds: true });
        p.forgetRecalls();
        await p.removeMedia([...new Set(filesOfMoments(fresh))]);
        return;
      }
      case 'moment': {
        const fresh = await p.db.getMomentsByIds([spec.captureId]);
        await p.db.deleteMoments([spec.captureId]);
        p.forgetRecalls();
        await p.removeMedia([...new Set(filesOfMoments(fresh))]);
        return;
      }
      case 'piece': {
        // The last piece is the moment itself: then the moment goes, with everything deleteMoments takes (OT16).
        const [moment] = await p.db.getMomentsByIds([spec.momentId]);
        const piece = moment?.pieces.find((x) => x.id === spec.pieceId);
        if (!moment || !piece) return;
        if (withoutPiece(moment, spec.pieceId)) await p.db.deletePieces([spec.pieceId]);
        else await p.db.deleteMoments([moment.id]);
        p.forgetRecalls();
        await p.removeMedia(filesOf([piece]));
        return;
      }
      case 'split': {
        const [moment] = await p.db.getMomentsByIds([spec.moment.id]);
        // Already its own moment (a relaunch after it was stored): nothing to do.
        if (moment) return;
        await p.db.splitPiece(spec.pieceId, spec.moment);
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
