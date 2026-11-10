// @layer shell
// @instance: a place's reach, on the app's ports
import { ports } from '../../ports';
import { createReach } from './shell';

export const reach = createReach(ports);
