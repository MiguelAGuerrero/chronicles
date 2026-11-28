// @layer shell
// @instance: a walk's quiet end, on the app's ports, the snap from the tiles in code, Where I've been and the walk's listeners
import { snapWalk } from '../finish';
import { pastLines } from '../pastLines';
import { ports } from '../ports';
import { tileCollector } from '../tileCollector';
import { notifyWalkChanged } from '../walkEvents';
import { createQuietEnd } from './shell';

export const quietEnd = createQuietEnd(ports, {
  snap: (walk) => snapWalk(walk, tileCollector()),
  rebuildLine: (walkId) => pastLines.build(walkId),
  changed: () => void notifyWalkChanged(),
});
