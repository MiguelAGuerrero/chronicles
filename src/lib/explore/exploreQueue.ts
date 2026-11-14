// @layer shell
import { readJoin, type ChecklistArea } from './explore';
import type { LngLat } from '../types';

export type ExploreResult = { ok: true; areas: ChecklistArea[] } | { ok: false };
type Read = (centre: LngLat, opts: { remember: boolean }, shouldStop: () => boolean) => Promise<ExploreResult>;

/**
 * The explore reads' queue (E5; tend explore 15, audit 11), its read passed in, so a test runs it with a fake: one read
 * at a time, the same centre sharing the running read (`readJoin`), another centre waiting for it, then reading its own.
 * `hold` marks a read on its way from the moment a caller starts deciding where to read (the build, the archive, the
 * kept reads come first), so `pending` is true before `running` is: a capture made meanwhile waits for that read.
 */
export function createReadQueue(read: Read) {
  let running: Promise<ExploreResult> | null = null;
  let runningAt: LngLat | null = null;
  let held = 0;
  const run = (centre: LngLat, opts: { remember: boolean }, shouldStop: () => boolean): Promise<ExploreResult> => {
    const join = readJoin(running ? runningAt : null, centre);
    if (running && join === 'join') return running;
    if (running && join === 'wait') return running.then(() => run(centre, opts, shouldStop));
    runningAt = centre;
    const mine: Promise<ExploreResult> = read(centre, opts, shouldStop)
      .catch((): ExploreResult => ({ ok: false }))
      .finally(() => {
        if (running === mine) {
          running = null;
          runningAt = null;
        }
      });
    running = mine;
    return mine;
  };
  return {
    read: run,
    /** Whether a read runs now. */
    running: () => running != null,
    /** Whether a read runs, or a caller holding the queue is still deciding where to read (tend explore audit 11). */
    pending: () => running != null || held > 0,
    async hold<T>(fn: () => Promise<T>): Promise<T> {
      held++;
      try {
        return await fn();
      } finally {
        held--;
      }
    },
  };
}
