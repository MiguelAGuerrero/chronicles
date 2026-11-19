// @layer shell
// @instance: the live walk's layers, built from the app's ports
import { ports } from '../ports';
import { createWalkLayers } from './walkShell';

/** The app's live-walk layers: the walk screen reads `walkLayers.store` through `useWalkLayers` and switches with `walkLayers.set`. */
export const walkLayers = createWalkLayers(ports);
