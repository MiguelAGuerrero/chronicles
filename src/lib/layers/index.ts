// @layer shell
// @instance: the layers' state, built from the app's ports
import { ports } from '../ports';
import { createLayers } from './shell';

/** The app's layers: views read `layers.store` with `useStore` and switch with `layers.set`. */
export const layers = createLayers(ports);
