// @layer shell
// @instance: Stack with previous on the app's ports and the one Undo window
import { deletions } from '../deletion';
import { momentPill } from '../momentPill';
import { ports } from '../ports';
import { createJoin } from './shell';

export const join = createJoin(ports, { schedule: (job) => deletions.schedule(job), closeOpen: () => momentPill.newMoment() });
