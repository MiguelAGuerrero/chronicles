// @layer shell
import { createStore } from '../store';
import type { Camera } from '../useTabMap';
import { keepsSection, sectionOnRoute, type Section } from './section';

/** The map's view, kept while the app is open, so Map, Walks and Days come back where they were (audit 8, the owner's call). */
export interface KeptMap {
  camera: Camera | null;
  /** The places last framed (`boundsKey`): a map that finds them unchanged does not frame them again. */
  fittedTo: string;
}

/**
 * The Chronicle section on screen (RM1). Starts on Memories at launch; the root layout tells it of every
 * route. `visit` counts the times the app went elsewhere, so a view can tell a new open of Memories (a new
 * moment brought back) from coming back out of a replay (audit 4).
 */
export const chronicleSection = (() => {
  const store = createStore<Section>('memories');
  let visits = 0;
  let map: KeptMap | null = null;
  return {
    store,
    set: (s: Section) => store.set(s),
    /** Every path the app moves to. */
    noteRoute(path: string) {
      if (!keepsSection(path)) visits += 1;
      store.set((s) => sectionOnRoute(s, path));
    },
    visit: () => visits,
    keptMap: () => map,
    keepMap(view: KeptMap) {
      map = view;
    },
  };
})();
