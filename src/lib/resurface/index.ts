// @layer shell
// @instance: Chronicle's Memories, on the app's ports
import { ports } from '../ports';
import { createResurface } from './shell';

export type { ResurfaceState } from './shell';
export const resurface = createResurface(ports);
