// @layer shell
// @instance: Split out on the app's ports and the one Undo window
import { deletions } from '../deletion';
import { ports } from '../ports';
import { createSplit } from './shell';

export const split = createSplit(ports, { schedule: (job) => deletions.schedule(job) });
