// @layer shell
// @instance: owner threads, on the app's ports and the Undo window
import { deletions } from '../deletion';
import { ports } from '../ports';
import { createThreads } from './shell';

export type { ThreadsState } from './shell';
export const threads = createThreads(ports, { schedule: (job) => deletions.schedule(job), flush: () => deletions.flush() });
