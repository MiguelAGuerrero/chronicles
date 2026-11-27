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
  /** `runs`: the route's runs of car ground as found, for the map's casing (G5), with `runsRoute` the route they were found for. */
  store: Store<{ show: Stretch | null; runs: readonly Stretch[]; runsRoute: string | null }>;
  /** A new route is being followed: the old route's stretches and line go, what was said stays (walkability audit 7). */
  route(route: string | null): void;
  /**
   * The route's car stretches (null route: none, and what was said is forgotten). The same route again changes nothing.
   * `runs`: the area runs alone, unmerged (G5: only ground built around cars is cased, never a fast road on plain ground).
   */
  stretches(route: string | null, list: readonly Stretch[], runs?: readonly Stretch[]): void;
  /** The walker's distance along the route (alongRoute). */
  at(alongM: number): void;
}

export function createAheadWatch(p: Pick<Ports, 'clock'>): AheadWatch {
  const store = createStore<{ show: Stretch | null; runs: readonly Stretch[]; runsRoute: string | null }>({ show: null, runs: [], runsRoute: null });
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
    if (r.show?.key !== store.get().show?.key) store.set({ ...store.get(), show: r.show });
  };
  const reset = (next: string, keepSaid: boolean) => {
    route = next;
    list = [];
    state = { said: keepSaid ? state.said : [], shown: null };
    if (store.get().show || store.get().runs.length) store.set({ show: null, runs: [], runsRoute: null });
  };
  return {
    store,
    route(next) {
      if (next === null) {
        route = null;
        list = [];
        along = null;
        state = { said: [], shown: null };
        if (store.get().show || store.get().runs.length) store.set({ show: null, runs: [], runsRoute: null });
        return;
      }
      if (next !== route) reset(next, true);
    },
    stretches(next, found, runs = []) {
      if (next === null) {
        route = null;
        list = [];
        along = null;
        state = { said: [], shown: null };
        store.set({ show: null, runs: [], runsRoute: null });
        return;
      }
      // A reroute keeps what was said: stretches are keyed by street and segment, not by the route.
      if (next !== route) reset(next, true);
      list = found;
      store.set({ ...store.get(), runs, runsRoute: next });
      step();
    },
    at(alongM) {
      along = alongM;
      step();
    },
  };
}
