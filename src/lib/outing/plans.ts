// @layer shell
// @instance: the open session's journey plan on the app's ports
import { ports } from '../ports';
import { createPlanStore } from './planStore';

export const journeyPlans = createPlanStore(ports);
