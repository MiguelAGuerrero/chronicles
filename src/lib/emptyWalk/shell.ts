// @layer shell
import type { PendingJob } from '../deletion/pending';
import type { Ports } from '../ports/types';
import { readTrace } from '../rides';
import { isEmptyWalk } from './core';

export interface DropEmptyDeps {
  /** Hands the drop to the Undo window (`deletions.schedule`), passed in because it loads React Native. */
  schedule: (job: PendingJob) => void;
}

/**
 * After a walk's stop is written (EW10): reads what it holds and, if it holds nothing, schedules its delete as the
 * app's own drop (volatile: a kill restores it, EW9). Any failure to read keeps the walk, and the replay plays.
 */
export function createDropEmpty(p: Pick<Ports, 'db'>, deps: DropEmptyDeps) {
  return async function dropEmpty(walkId: string): Promise<boolean> {
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
      if (!isEmptyWalk({ moments: moments.length, pauses: pauses.length, stills: stills.length, fills: gaps.length, trace })) return false;
      deps.schedule({ kind: 'walk', ids: [walkId], spec: { type: 'walk', walkId }, volatile: true });
      return true;
    } catch {
      return false;
    }
  };
}
