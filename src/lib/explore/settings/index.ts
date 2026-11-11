// @layer shell
// @instance: Explore's saved settings (what I'm into, the "?" range, the pocket alert), built from the app's ports
import { ports } from '../../ports';
import { createExploreSettings } from './shell';

export { DEFAULT_SETTINGS, HAPTIC_KEY, HIDDEN_KEY, KNOWN_KEY, RANGE_KEY, type ExploreSettings } from './shell';

/** The app's settings: the walk's drawer, the ready bar and Explore's panel are all doors to this one store. */
export const exploreSettings = createExploreSettings(ports);
export const { load: loadSettings, save: saveSettings, onSettings, toggleKind } = exploreSettings;
