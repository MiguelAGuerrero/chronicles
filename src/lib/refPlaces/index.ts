// @layer shell
// @instance: the reference keywords' resolver, on the app's ports
import { ports } from '../ports';
import { createRefResolver } from './shell';

export { REF_READ_MS } from './shell';

export const refResolver = createRefResolver(ports);
