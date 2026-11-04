// @layer shell
import { ports } from '../ports';
import { createOutlines } from './outlineRead';
import { overtureOutlines } from './overtureOutlines';

/** Town outlines (TO12), read from Overture's divisions and kept on the phone: the app's instance. */
export const outlines = createOutlines({ ...ports, source: overtureOutlines });
