// @layer shell
// @instance: the small copies Memories' cards ask for, on the app's ports
import { makeThumb } from '../media/thumb';
import { ports } from '../ports';
import { createThumbs } from './shell';

export const thumbs = createThumbs(ports, { makeThumb });
