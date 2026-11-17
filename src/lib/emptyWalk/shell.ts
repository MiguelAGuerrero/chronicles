// @layer shell
import type { PendingJob } from '../deletion/pending';
import type { Ports } from '../ports/types';

export interface DropEmptyDeps {
  /** Hands the drop to the Undo window (`deletions.schedule`), passed in because it loads React Native. */
  schedule: (job: PendingJob) => void;
}

/** Test-first stub (empty-walk EW1, EW10): reads a stopped walk and drops it if it is empty. */
export function createDropEmpty(_p: Pick<Ports, 'db'>, _deps: DropEmptyDeps) {
  return async function dropEmpty(_walkId: string): Promise<boolean> {
    throw new Error('not implemented');
  };
}
