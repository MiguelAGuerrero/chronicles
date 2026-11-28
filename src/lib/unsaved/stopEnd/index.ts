// @layer shell
// @instance: both Stops' end, on the app's memo gate, its holder of unsaved captures, the walk's end and its quiet point
import { memoGate } from '../../memoGate';
import { quietEnd } from '../../quietEnd';
import { endWalk } from '../../session';
import { unsaved } from '..';
import { createStopEnd } from './shell';

export const stopEnd = createStopEnd({ gate: memoGate, unsaved, endWalk, quietAt: quietEnd.at });
