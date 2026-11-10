// @layer shell
import type { Faced } from '../moment';
import { captureBus, type CapturePatch } from '../captureBus';
import type { Ports } from '../ports/types';

/**
 * Saving a moment's edits from a screen with no capture path of its own
 * (Chronicle, the replay, Navigate's moments; ME21): stored first, then told
 * on the capture bus, so every open view of the walk shows it. A failed write
 * throws to the caller, and nothing is told.
 */
export function createCaptureEdits(p: Pick<Ports, 'db'>) {
  return {
    async save(c: Pick<Faced, 'id' | 'walk_id' | 'piece_id'>, patch: CapturePatch): Promise<void> {
      // The edit is the piece's own; the bus names the moment the screens show.
      await p.db.updatePiece(c.piece_id, patch);
      captureBus.patch(c.walk_id, c.id, patch, null);
    },
  };
}
