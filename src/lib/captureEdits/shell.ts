// @layer shell
import { captureBus, type CapturePatch } from '../captureBus';
import type { Ports } from '../ports/types';
import type { Capture } from '../types';

/**
 * Saving a moment's edits from a screen with no capture path of its own
 * (Chronicle, the replay, Navigate's moments; ME21): stored first, then told
 * on the capture bus, so every open view of the walk shows it. A failed write
 * throws to the caller, and nothing is told.
 */
export function createCaptureEdits(p: Pick<Ports, 'db'>) {
  return {
    async save(c: Pick<Capture, 'id' | 'walk_id'>, patch: CapturePatch): Promise<void> {
      await p.db.updateCapture(c.id, patch);
      captureBus.patch(c.walk_id, c.id, patch, null);
    },
  };
}
