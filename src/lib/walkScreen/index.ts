// @layer shell
// @instance: the walk screen's shell, on the app's ports
import { ports } from '../ports';
import { createWalkScreen } from './shell';

export type { StreetsAround, WalkScreenShell } from './shell';
export { NEAR_RADIUS_M } from './shell';

/** The walk screen's effects, on the app's real ports (the walk screen in parts, WS6). */
export const walkScreen = createWalkScreen(ports);
