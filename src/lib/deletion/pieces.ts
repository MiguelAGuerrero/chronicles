// @layer shell
import type { Ports } from '../ports/types';
import { withoutPiece } from '../moment';
import type { Moment } from '../types';
import { filesOf } from './core';

/**
 * Deleting one piece of a moment (moment stacks MS13, decision 0106), once its Undo window has passed: the piece and
 * its files go, and the moment stays with its place, time, threads, links, reminder and find. The last piece is the
 * moment itself: then the moment goes, with everything `deleteMoments` takes (OT16). `removeMedia` is passed in so
 * this loads in Node (the media module loads React Native).
 */
export function createPieceDelete(p: Pick<Ports, 'db'>) {
  return {
    async run(m: Pick<Moment, 'id' | 'pieces'>, pieceId: string, removeMedia: (refs: string[]) => Promise<void>): Promise<void> {
      // Read fresh: a small copy made since the menu opened goes too.
      const [now] = await p.db.getMomentsByIds([m.id]);
      const moment = now ?? null;
      const piece = (moment ?? m).pieces.find((x) => x.id === pieceId);
      if (!piece) return;
      const left = moment ? withoutPiece(moment, pieceId) : null;
      if (left) await p.db.deletePieces([pieceId]);
      else await p.db.deleteMoments([m.id]);
      await removeMedia(filesOf([piece]));
    },
  };
}
