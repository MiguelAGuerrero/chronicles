// @layer shell
import type { Ports } from '../ports/types';
import { createStore, type Store } from '../store';
import { aheadStep, type AheadState, type Stretch } from './ahead';

/*
 * The heads-up ahead (WK15, WK16): holds what has been said on this route and what is shown, over the
 * pure `aheadStep`. A shell because it keeps state and reads the clock. It only says: nothing in it
 * touches the route.
 */

export interface AheadWatch {
  store: Store<{ show: Stretch | null }>;
  /** A new route is being followed: the old route's stretches and line go, what was said stays (walkability audit 7). */
  route(route: string | null): void;
  /** The route's car stretches (null route: none, and what was said is forgotten). The same route again changes nothing. */
  stretches(route: string | null, list: readonly Stretch[]): void;
  /** The walker's distance along the route (alongRoute). */
  at(alongM: number): void;
}

export function createAheadWatch(p: Pick<Ports, 'clock'>): AheadWatch {
  const store = createStore<{ show: Stretch | null }>({ show: null });
  let route: string | null = null;
  let list: readonly Stretch[] = [];
  let state: AheadState = { said: [], shown: null };
  /** Where the walker last was along the route, so stretches that arrive late are judged against it. */
  let along: number | null = null;
  const step = () => {
    if (route === null || along === null) return;
    const r = aheadStep(state, list, along, p.clock.now());
    state = r.state;
    // Only replace the shown stretch when it changed, so a view re-renders on a change and not on every fix.
    if (r.show?.key !== store.get().show?.key) store.set({ show: r.show });
  };
  const reset = (next: string, keepSaid: boolean) => {
    route = next;
    list = [];
    state = { said: keepSaid ? state.said : [], shown: null };
    if (store.get().show) store.set({ show: null });
  };
  return {
    store,
    route(next) {
      if (next === null) {
        route = null;
        list = [];
        along = null;
        state = { said: [], shown: null };
        if (store.get().show) store.set({ show: null });
        return;
      }
      if (next !== route) reset(next, true);
    },
    stretches(next, found) {
      if (next === null) {
        route = null;
        list = [];
        along = null;
        state = { said: [], shown: null };
        store.set({ show: null });
        return;
      }
      // A reroute keeps what was said: stretches are keyed by street and segment, not by the route.
      if (next !== route) reset(next, true);
      list = found;
      step();
    },
    at(alongM) {
      along = alongM;
      step();
    },
  };
}
