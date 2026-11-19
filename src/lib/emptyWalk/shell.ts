// @layer shell
import type { PendingJob } from '../deletion/pending';
import type { Ports } from '../ports/types';
import { readTrace } from '../rides';
import { isEmptyWalk, pausesKept } from './core';

export interface DropEmptyDeps {
  /** Hands the drop to the Undo window (`deletions.schedule`), passed in because it loads React Native. */
  schedule: (job: PendingJob) => void;
  /**
   * A memo or photo still being saved, anywhere (`memoGate.underWay`): the walk is kept, uncertain means kept (EW6), so
   * what lands after the stop has its walk (T35, the owner, Nov 18: "Shape + never drop mid-save").
   */
  underWay?: () => boolean;
}

/**
 * After a walk's stop is written (EW10): reads what it holds and, if it holds nothing, schedules its delete as the
 * app's own drop (volatile: a kill restores it, EW9). Any failure to read keeps the walk, and the replay plays.
 */
export function createDropEmpty(p: Pick<Ports, 'db'>, deps: DropEmptyDeps) {
  return async function dropEmpty(walkId: string): Promise<boolean> {
    // Asked before the reads and again after them, so a save that ends or begins meanwhile is never missed (T35).
    if (deps.underWay?.()) return false;
    try {
      const walk = await p.db.getWalk(walkId);
      if (!walk || walk.open) return false;
      const [moments, points, pauses, stills, gaps] = await Promise.all([
        p.db.getMoments(walkId),
        p.db.getPoints(walkId),
        p.db.getPauses(walkId),
        p.db.getStills(walkId),
        p.db.getGapDecisions(walkId),
      ]);
      const trace = readTrace(points, walk.started_at, pauses, stills);
      // A closed walk has its end; a pause open at Stop is not counted (EW5, decision 0220).
      const kept = pausesKept(pauses, walk.ended_at ?? Number.POSITIVE_INFINITY);
      if (!isEmptyWalk({ moments: moments.length, pauses: kept, stills: stills.length, fills: gaps.length, trace })) return false;
      if (deps.underWay?.()) return false;
      deps.schedule({ kind: 'walk', ids: [walkId], spec: { type: 'walk', walkId }, volatile: true });
      return true;
    } catch {
      return false;
    }
  };
}
