// @layer shell
// @instance: reactions, on the app's ports
import { ports } from '../ports';
import { createReactions } from './shell';

export const reactions = createReactions(ports);
