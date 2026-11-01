import { router } from 'expo-router';
import { useState } from 'react';
import { db } from './db';
import type { Waypoint } from './nav/types';
import { RecorderError } from './recorder/types';
import { startWalk } from './session';
import { parseStartMode, START_MODE_KEY, startPlan, type StartMode } from './startPlan';

export type StartError = { message: string; openSettings?: boolean };

/**
 * Starts a walk at once (NV19, NV12, NV25): Navigate's Start, and Walk here on
 * Explore and Chronicle. The mode is the one saved (`start_mode`) unless given;
 * the plan's meta is written before the walk screen opens, so it starts with
 * them. Never waits for a fix: the walk's recorder takes over (NV28).
 */
export function useStartWalk() {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<StartError | null>(null);
  const start = async (dest: Waypoint | null, mode?: StartMode) => {
    setError(null);
    setStarting(true);
    try {
      const chosen = mode ?? parseStartMode(await db.getMeta(START_MODE_KEY).catch(() => null));
      const { walk, warning } = await startWalk();
      const plan = startPlan({ walkId: walk.id, now: Date.now(), mode: chosen, dest, warning });
      for (const [k, v] of plan.meta) await db.setMeta(k, v);
      router.push(plan.params ? { pathname: '/walk', params: plan.params } : '/walk');
    } catch (e) {
      setError({ message: e instanceof Error ? e.message : String(e), openSettings: e instanceof RecorderError && e.openSettings });
    } finally {
      setStarting(false);
    }
  };
  return { start, starting, error, setError };
}
