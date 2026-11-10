// @layer shell
// @instance: the navigation destination's store, on the app's ports
import { ports } from '../../ports';
import { createNavStore } from './shell';

export const { saveNav, loadNav, clearNav, loadPendingDest, savePendingDest, saveForLater, saveWayBack, loadWayBack, clearWayBack } = createNavStore(ports);
