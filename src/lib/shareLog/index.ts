// @layer shell
// @instance: the GPS log's read, on the app's ports and this device's name
import { ports } from '../ports';
import { deviceName } from './share';
import { createWalkLog } from './shell';

export { shareLogText } from './share';

export const { walkLogText } = createWalkLog(ports, deviceName);
