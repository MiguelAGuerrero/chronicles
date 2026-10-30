import { db } from './db';
import { newId } from './id';
import { recorder } from './recorder';
import type { Walk } from './types';

/**
 * The walk lifecycle, in one place so every screen goes through the same
 * guards: one open walk at a time, start and stop never re-entered, and an
 * open walk re-attached at launch rather than when a screen happens to mount.
 */

let starting: Promise<{ walk: Walk; warning?: string }> | null = null;
let stopping: Promise<void> | null = null;

/** Starts a walk, or returns the one already open. Throws RecorderError. */
export function startWalk(): Promise<{ walk: Walk; warning?: string }> {
  if (!starting) {
    starting = (async () => {
      const open = await db.getOpenWalk();
      if (open) return { walk: open };
      const id = newId();
      // Updates start before the row exists; the task drops the few fixes
      // that arrive in between rather than writing to a missing walk.
      const { warning } = await recorder.start(id);
      const walk: Walk = {
        id, started_at: Date.now(), ended_at: null, title: null, epilogue: null, open: true, area: null, snapped_build: null,
      };
      try {
        await db.createWalk(walk);
      } catch (e) {
        await recorder.stop().catch(() => {});
        throw e;
      }
      return { walk, warning };
    })().finally(() => {
      starting = null;
    });
  }
  return starting;
}

/**
 * Closes the walk: the end time is written first, so a batch delivered late
 * or an app killed mid-stop can never extend it. Streets are derived later,
 * behind the replay's first beat.
 */
export function stopWalk(walkId: string): Promise<void> {
  if (!stopping) {
    stopping = (async () => {
      await db.updateWalk(walkId, { ended_at: Date.now(), open: false });
      await recorder.stop();
    })().finally(() => {
      stopping = null;
    });
  }
  return stopping;
}

/** At launch or reload: re-attaches the recorder to an open walk. Returns it, if any. */
export async function reconcileOpenWalk(): Promise<Walk | null> {
  const open = await db.getOpenWalk();
  if (!open) {
    if (recorder.isRecording()) await recorder.stop();
    return null;
  }
  if (!recorder.isRecording()) await recorder.resume(open.id);
  return open;
}
