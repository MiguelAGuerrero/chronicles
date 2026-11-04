// @layer shell
import { ports } from '../ports';
import { createFog } from './shell';

export { FOG_RULES } from './rules';
export type { Fog, FogRefresh, FogState } from './shell';

/** A fog for one walk screen, on the app's ports (`./shell` is what tests build with fakes). */
export const newFog = () => createFog(ports);
