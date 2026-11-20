// @layer shell
// @instance: stores (lib/store) the full-screen cards, every Modal, the bar's stop and its Edit pill set, read by the tab layout, the recording bar and Explore; and each walk's one end from the bar (barStops)
import type { BarStop } from './recordingBar';
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

/**
 * A stop from the recording bar under way (`lib/recordingBar`, `BarStop`): set by the bar's Stop as it begins and
 * cleared by that same stop as it ends, so a bar mounted again meanwhile (its tab back in front) still refuses its way
 * back and a second Stop (tend tabs audit 26).
 */
export const barStop = createStore<BarStop | null>(null);

/**
 * True while the recording bar's Edit pill stands above it (`lib/recordingBar`, `barOfferShown`): set by the bar, cleared as
 * it goes, so Explore's press hint steps aside meanwhile (tend tabs T36).
 */
export const barOfferUp = createStore(false);

/**
 * True while the recording bar holds a walk's reminder card above its line (`recording-reminder`): set by the bar, cleared
 * as it goes, so Explore's press hint steps aside meanwhile, as it does for the Edit pill (tend tabs audit 51).
 */
export const barReminderUp = createStore(false);

/**
 * Each walk's end from the recording bar, one at a time (tend tabs audit 53): a hold past the stop's bound, when the
 * Stop comes back, joins the end still under way instead of beginning a second (two replays, an empty walk dropped
 * twice). The end settles, failed or not, and the next hold runs anew.
 */
export function createBarStops() {
  const going = new Map<string, Promise<void>>();
  return {
    run(walkId: string, end: () => Promise<void>): Promise<void> {
      const was = going.get(walkId);
      if (was) return was;
      const done = end().finally(() => {
        if (going.get(walkId) === done) going.delete(walkId);
      });
      going.set(walkId, done);
      return done;
    },
  };
}

export const barStops = createBarStops();
