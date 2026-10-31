import { db } from './db';
import { newId } from './id';
import { clearNav } from './nav/store';
import { notifier } from './notify';
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
      const at = Date.now();
      await db.updateWalk(walkId, { ended_at: at, open: false });
      await db.endPause(walkId, at);
      await recorder.stop();
      void notifier.pauseEnded(walkId);
      // Navigation ends with the walk (N10).
      await clearNav().catch(() => {});
    })().finally(() => {
      stopping = null;
    });
  }
  return stopping;
}

/**
 * Pauses the walk: the pause is written first, then recording stops, so no
 * position is recorded while paused and the paused time does not count. A
 * phone reminds the walker later if the pause runs long (asking for
 * permission at the first pause, without holding the pause up).
 */
export async function pauseWalk(walkId: string): Promise<void> {
  await db.startPause(walkId, Date.now());
  await recorder.stop();
  notifier.pauseStarted(walkId).catch(() => {});
}

/**
 * Picks recording back up, then ends the pause. Location permission is asked
 * for again (a one-time grant can lapse during a long pause); if it is
 * refused, this throws and the walk stays paused.
 */
export async function resumeWalk(walkId: string): Promise<void> {
  await recorder.start(walkId);
  await db.endPause(walkId, Date.now());
  void notifier.pauseEnded(walkId);
}

/** Whether a walk is paused right now. */
export async function isPaused(walkId: string): Promise<boolean> {
  return (await db.getPauses(walkId)).some((p) => p.ended_at == null);
}

/**
 * At launch or reload: re-attaches the recorder to an open walk, unless the
 * walk was left paused. Returns it, if any.
 */
export async function reconcileOpenWalk(): Promise<Walk | null> {
  const open = await db.getOpenWalk();
  if (!open) {
    if (recorder.isRecording()) await recorder.stop();
    return null;
  }
  const paused = await isPaused(open.id);
  // After a relaunch the recorder's own flag is false even if the OS kept
  // updates running through the pause; stop checks with the OS itself.
  if (paused) await recorder.stop();
  if (!paused && !recorder.isRecording()) await recorder.resume(open.id);
  return open;
}
