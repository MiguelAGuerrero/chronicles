// @layer shell
// @instance: a store (lib/store) the area card sets and the tab layout reads
import { createStore } from './store';

/**
 * True while a full-screen card covers the tabs (the area card on a phone): the tab layout
 * folds the tab bar and the recording bar away, and the card brings them back as it goes.
 * Set by the card alone, in an effect that clears it on unmount, so a card that unmounts
 * for any reason (the tab loses focus, a notification opens the walk) never leaves the
 * tabs hidden.
 */
export const tabsHidden = createStore(false);

let holds = 0;

/**
 * Hides the tabs until the returned function is called, however many cards hold them: the area card, and the walk planner over it. The
 * tabs come back only when the last hold is released, in whatever order they unmount (walk planner audit 12).
 */
export function hideTabs(): () => void {
  holds += 1;
  tabsHidden.set(true);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holds -= 1;
    tabsHidden.set(holds > 0);
  };
}
