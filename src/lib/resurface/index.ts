// @layer shell
// @instance: Chronicle's Memories, on the app's ports
import { ports } from '../ports';
import { words } from '../transcribe';
import { createResurface } from './shell';

export type { ResurfaceState } from './shell';
export const resurface = createResurface(ports, { transcript: words.transcript });
// A memo's words arrived or went (MX6, MX7): Memories reads again, so threads and the card use them.
words.subscribe(() => void resurface.refresh());
