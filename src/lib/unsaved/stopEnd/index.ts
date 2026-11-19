// @layer shell
// @instance: both Stops' end, on the app's memo gate, its holder of unsaved captures and the walk's end
import { memoGate } from '../../memoGate';
import { endWalk } from '../../session';
import { unsaved } from '..';
import { createStopEnd } from './shell';

export const stopEnd = createStopEnd({ gate: memoGate, unsaved, endWalk });
