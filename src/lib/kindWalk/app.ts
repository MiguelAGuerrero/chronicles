// @layer shell
// @instance: the planner's settings on the app's ports
import { ports } from '../ports';
import { createKindWalkPrefs } from './prefs';

export const kindWalkPrefs = createKindWalkPrefs(ports);
