// @layer shell
// @instance: the scenic routes' leanings, on the app's ports
import { ports } from '../ports';
import { createRouteLeanings } from './shell';

export { ROUTE_LEANINGS_KEY } from './shell';

export const routeLeanings = createRouteLeanings(ports);
