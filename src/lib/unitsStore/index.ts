// @layer shell
// @instance: the units setting's store, on the app's ports
import { ports } from '../ports';
import { createUnitsStore } from './shell';

export { UNITS_KEY } from './shell';

export const { loadUnits, saveUnits } = createUnitsStore(ports);
