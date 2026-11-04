// @layer shell
import { createStore } from './store';

/**
 * True while a full-screen card covers the tabs (the area card on a phone): the tab layout
 * folds the tab bar and the recording bar away, and the card brings them back as it goes.
 * Set by the card alone, in an effect that clears it on unmount, so a card that unmounts
 * for any reason (the tab loses focus, a notification opens the walk) never leaves the
 * tabs hidden.
 */
export const tabsHidden = createStore(false);
