// @layer shell
import { canJoin } from '../join/rules';
import type { Db } from '../db/types';
import { withoutPiece } from '../moment';
import { filesOf, filesOfMoments } from './core';
import type { DeleteSpec } from './pending';

/**
 * How long a walk's delete waits for the memo saves and kept photos still under way into it (tend tabs audit 49;
 * decision 0227, the owner: "Becomes a loose moment"): those that end in time go with the walk.
 */
export const WALK_SAVES_WAIT_MS = 10_000;

/**
 * Stores one waiting delete (D1-D3, owner threads' deletes, moment stacks' pieces and splits; decision 0113). Rows
 * first, in one transaction each, then files (a file left behind is never a row without its file). Every moment is
 * read fresh, so a small copy made since goes too, and a delete run again after a relaunch finds nothing left and
 * does nothing.
 */
export function createDeleteRunner(p: {
  db: Pick<Db, 'getMoments' | 'getMomentsByIds' | 'updateMoment' | 'deleteWalk' | 'deleteMoments' | 'deletePieces' | 'splitPiece' | 'joinMoment' | 'referencesTo' | 'applyThreads'>;
  removeMedia: (refs: string[], folders?: string[]) => Promise<unknown>;
  /** Drops the in-memory reminders of what went (the recall check's copy). */
  forgetRecalls: () => void;
  /** The saves under way into a walk (`memoGate.savesOf`), each settling when it ends. */
  saves?: { of(walkId: string): Promise<unknown>[] };
  /** Resolves after `ms` (a timer); passed in for the tests. */
  wait?: (ms: number) => Promise<void>;
}) {
  const wait = p.wait ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  /** A walk's moments that landed after its delete become loose moments: kept, never rows of a deleted walk. */
  const loosen = async (walkId: string) => {
    for (const m of await p.db.getMoments(walkId)) await p.db.updateMoment(m.id, { walk_id: null });
  };
  return async function run(spec: DeleteSpec): Promise<void> {
    switch (spec.type) {
      case 'walk': {
        // A memo or photo still being saved into the walk lands first and goes with it, for at most the bound; one
        // still under way after it is a loose moment once it lands (the gap between its row and that move is the
        // owner's accepted one; decision 0227).
        const late = p.saves?.of(spec.walkId) ?? [];
        if (late.length) {
          const all = Promise.all(late);
          const inTime = await Promise.race([all.then(() => true), wait(WALK_SAVES_WAIT_MS).then(() => false)]);
          if (!inTime) void all.then(() => loosen(spec.walkId)).catch(() => {});
        }
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
      case 'join': {
        const [entry] = await p.db.getMomentsByIds([spec.fromId]);
        // Already stacked (a relaunch after it was stored): nothing to do.
        if (!entry) return;
        // The bounds hold here as when it was offered: nothing points at the entry now, and the day, walk and place agree (audit 4).
        const [into] = await p.db.getMomentsByIds([spec.intoId]);
        if (!into || !canJoin(entry, into) || Object.values(await p.db.referencesTo(spec.fromId)).some(Boolean)) return;
        await p.db.joinMoment(spec.fromId, spec.intoId);
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
