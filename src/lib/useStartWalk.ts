// @layer view
import { useState } from 'react';
import { db } from './db';
import { memoGate } from './memoGate';
import { askMotion } from './walkMotion';
import { saveForLater } from './nav/store';
import type { Waypoint } from './nav/types';
import { RecorderError } from './recorder/types';
import { startWalk } from './session';
import { parseStartMode, START_MODE_KEY, startPlan, walkHerePlan, type StartMode } from './startPlan';
import { showWalk } from './walkNav';

/** `tone: 'info'`: location refused, a quiet notice (T26); otherwise a fault. */
export type StartError = { message: string; openSettings?: boolean; tone?: 'info' | 'error' };

/**
 * Starts a walk at once (NV19, NV12, NV25): Navigate's Start, and Walk here on
 * Explore and Chronicle. The mode is the one saved (`start_mode`) unless given;
 * the plan's meta is written before the walk screen opens, so it starts with
 * them. Never waits for a fix: the walk's recorder takes over (NV28).
 *
 * With a walk already open (minimized), Walk here routes that walk there, as
 * its own Go here, and returns to it (NV10): the walk screen routes the
 * destination in meta nav as it comes back.
 */
export function useStartWalk() {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<StartError | null>(null);
  /**
   * `inPlace` (NR6): the ready walk screen starts the walk itself, so nothing is opened; it gets the
   * walk's notice params back once the plan's meta is written, and `null` if the walk didn't start.
   */
  const start = async (
    dest: Waypoint | null,
    mode?: StartMode,
    opts?: { inPlace?: boolean; onError?: (e: StartError) => void },
  ): Promise<Record<string, string> | null> => {
    // Motion first, straight from the tap: an iPhone's browser asks only then (Motion, MO1).
    void askMotion();
    setError(null);
    setStarting(true);
    try {
      // Never under a memo (tabs audit 3): one being saved (Navigate left mid-memo) is waited for.
      if (!(await memoGate.readyToStart())) {
        setError({ message: 'A voice memo is recording. Save it first.' });
        return null;
      }
      const open = await db.getOpenWalk().catch(() => null);
      const here = walkHerePlan(open?.id ?? null, dest);
      if (here.kind !== 'start') {
        if (here.kind === 'route') for (const [k, v] of here.meta) await db.setMeta(k, v);
        if (!opts?.inPlace) showWalk();
        return {};
      }
      const chosen = mode ?? parseStartMode(await db.getMeta(START_MODE_KEY).catch(() => null));
      const { walk, warning } = await startWalk();
      const plan = startPlan({ walkId: walk.id, now: Date.now(), mode: chosen, dest, warning });
      for (const [k, v] of plan.meta) await db.setMeta(k, v);
      // In place, every start says it is recording (NR6); a recorder warning still wins.
      if (opts?.inPlace) return plan.params?.warning ? plan.params : { started: '1' };
      showWalk(plan.params);
      return plan.params ?? {};
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const said: StartError = { message, openSettings: e instanceof RecorderError && e.openSettings, tone: e instanceof RecorderError ? e.tone : 'error' };
      setError(said);
      opts?.onError?.(said);
      // In place, a walk that opened before its plan failed shows the error on the walk (audit 10).
      if (opts?.inPlace && (await db.getOpenWalk().catch(() => null))) return { error: message };
      return null;
    } finally {
      setStarting(false);
    }
  };
  /**
   * When I get there (DW3, DW4; decision 0121): the place becomes Navigate's destination and Navigate,
   * ready, opens. No walk starts and nothing watches for arrival: only Start begins the walk.
   */
  const later = async (dest: Waypoint): Promise<void> => {
    setError(null);
    try {
      await saveForLater(dest);
      showWalk();
    } catch (e) {
      setError({ message: e instanceof Error ? e.message : String(e) });
    }
  };
  return { start, later, starting, error, setError };
}
