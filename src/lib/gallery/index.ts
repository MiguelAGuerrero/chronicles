// @layer shell
// @instance: the media gallery's shell, on the app's ports
import { makeThumb } from '../media/thumb';
import { ports } from '../ports';
import { createGallery } from './shell';

export const gallery = createGallery(ports, { makeThumb });
