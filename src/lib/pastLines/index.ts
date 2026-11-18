// @layer shell
// @instance: the earlier walks' lines, built from the app's ports
import { ports } from '../ports';
import { createPastLines } from './shell';

/** The app's earlier walks' lines (Where I've been): `usePastLines` reads them, Stop builds one, a gap decision drops one. */
export const pastLines = createPastLines(ports);
