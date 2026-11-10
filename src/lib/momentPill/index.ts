// @layer shell
// @instance: the Add to this moment pill on the app's clock
import { ports } from '../ports';
import { createMomentPill } from './shell';

export const momentPill = createMomentPill(ports, { setTimer: (fn, ms) => setTimeout(fn, ms), clearTimer: (id) => clearTimeout(id as ReturnType<typeof setTimeout>) });
export type { PillState } from './shell';
