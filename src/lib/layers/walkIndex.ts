// @layer shell
// @instance: the live walk's Places spans over the maps' layers, built from the app's ports
import { loadSettings } from '../explore/settings';
import { ports } from '../ports';
import { layers } from './index';
import { createWalkLayers } from './walkShell';

/** The app's live-walk part in the layers: the walk screen calls `walkLayers.begin` through `useWalkLayers`. */
export const walkLayers = createWalkLayers(ports, layers, () => loadSettings().then((s) => s.passM));
