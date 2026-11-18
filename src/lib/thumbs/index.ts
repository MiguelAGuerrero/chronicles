// @layer shell
// @instance: every preview's small copies and stills, on the app's ports
import { removeMedia } from '../media';
import { makeThumb } from '../media/thumb';
import { ports } from '../ports';
import { createThumbs } from './shell';

export const thumbs = createThumbs(ports, { makeThumb, remove: (refs) => removeMedia(refs).then(() => {}) });
