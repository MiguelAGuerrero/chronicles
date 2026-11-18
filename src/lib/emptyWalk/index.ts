// @layer shell
// @instance: the app's drop of an empty walk, built from the real db and the Undo window
import { deletions } from '../deletion';
import { memoGate } from '../memoGate';
import { ports } from '../ports';
import { unsaved } from '../unsaved';
import { createDropEmpty } from './shell';

// Never while a memo or photo is still being saved, a held one's Retry included (T35).
export const dropEmpty = createDropEmpty(ports, {
  schedule: (job) => deletions.schedule(job),
  underWay: () => memoGate.underWay() || unsaved.retrying(),
});
