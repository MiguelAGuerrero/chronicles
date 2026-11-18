// @layer shell
// @instance: stores (lib/store) the full-screen cards and every Modal set, read by the tab layout and the recording bar
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

/**
 * How many Modals are up (`components/Modal`, each while it shows): with any, the recording bar is out of sight beneath
 * it, so a reminder it holds waits (tend explore 22).
 */
export const modalsUp = createStore(0);

/** Counts a Modal up until the returned function is called, once. */
export function holdModal(): () => void {
  modalsUp.set((n) => n + 1);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    modalsUp.set((n) => Math.max(0, n - 1));
  };
}
