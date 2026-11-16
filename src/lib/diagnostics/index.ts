// @layer shell
// @instance: the app's diagnostics log, attached to the sink at startup (index.js loads it before the router)
import { ports } from '../ports';
import { dayOf } from './core';
import { createDiagnostics } from './shell';

export const diagnostics = createDiagnostics(ports);

/** An entry's local day, never its time (errors-handled audit 14, the owner, Nov 16). */
export const localDay = (t: number) => dayOf(t, new Date(t).getTimezoneOffset());
