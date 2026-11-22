// @layer shell
import type { Ports } from '../ports/types';
import { placesSpansKey, decodeSpans, encodeSpans, toggleSpans } from '../explore/placesSpans';
import type { Layers } from './shell';

/*
 * The live walk's part in the layers (decision 0260, amending 0234's MD3 and MD10): the walk draws the one setting every map
 * shares (`map_layers`, `./shell`), so what the ready map shows is what the walk starts with, and a switch on the walk is
 * remembered for every map and the next walk. What stays the walk's own is the spans Places was on during it
 * (`places_spans:<walk>`), which the replay counts passes within (MD9): opened as the walk opens with Places on, and kept
 * from every switch while it is open, whichever map made it. The factory takes its ports and the maps' layers so a Node test
 * runs it with fakes; the app's instance is `./walkIndex`.
 */

export interface WalkLayers {
  /** The walk now open on the walk screen (null when none): from here until the next call its Places spans are kept. */
  begin(walkId: string | null): Promise<void>;
}

export function createWalkLayers(p: Pick<Ports, 'db' | 'clock'>, maps: Pick<Layers, 'store' | 'load'>): WalkLayers {
  let walkId: string | null = null;
  // Places as last kept for the open walk, so only a change is written.
  let places: boolean | null = null;
  // One write at a time, so two quick switches never read the same spans.
  let queue: Promise<void> = Promise.resolve();
  const keep = (id: string, on: boolean) =>
    (queue = queue.then(async () => {
      const spans = decodeSpans(await p.db.getMeta(placesSpansKey(id)).catch(() => null));
      const after = toggleSpans(spans, on, p.clock.now());
      if (after !== spans) await p.db.setMeta(placesSpansKey(id), encodeSpans(after)).catch(() => {});
    }));
  maps.store.subscribe(() => {
    const s = maps.store.get();
    if (!walkId || !s.loaded || !!s.on.places === places) return;
    places = !!s.on.places;
    void keep(walkId, places);
  });
  return {
    async begin(id) {
      walkId = id;
      places = null;
      if (!id) return;
      await maps.load();
      if (walkId !== id) return;
      places = !!maps.store.get().on.places;
      // On: a span opens unless one is (a resumed walk). Off: one left open (switched off while the walk was away) closes.
      await keep(id, places);
    },
  };
}
