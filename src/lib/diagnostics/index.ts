// @layer shell
// @instance: the app's diagnostics log, attached to the sink at startup (index.js loads it before the router)
import { ports } from '../ports';
import { createDiagnostics } from './shell';

export const diagnostics = createDiagnostics(ports);

/** An entry's local date and time, as the walker reads one. */
export const localWhen = (t: number) => new Date(t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
