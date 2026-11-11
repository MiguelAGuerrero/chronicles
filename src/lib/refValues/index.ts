// @layer shell
// @instance: the reference values setting, on the app's ports
import { ports } from '../ports';
import { createRefValues } from './shell';

export const refValues = createRefValues(ports);
