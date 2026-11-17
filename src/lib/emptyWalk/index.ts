// @layer shell
// @instance: the app's drop of an empty walk, built from the real db and the Undo window
import { deletions } from '../deletion';
import { ports } from '../ports';
import { createDropEmpty } from './shell';

export const dropEmpty = createDropEmpty(ports, { schedule: (job) => deletions.schedule(job) });
