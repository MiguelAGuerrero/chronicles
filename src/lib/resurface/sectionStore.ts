// @layer shell
import { createStore } from '../store';
import { sectionOnRoute, type Section } from './section';

/** The Chronicle section on screen (RM1). Starts on Memories at launch; the root layout tells it of every route. */
export const chronicleSection = (() => {
  const store = createStore<Section>('memories');
  return {
    store,
    set: (s: Section) => store.set(s),
    /** Every path the app moves to. */
    noteRoute: (path: string) => store.set((s) => sectionOnRoute(s, path)),
  };
})();
