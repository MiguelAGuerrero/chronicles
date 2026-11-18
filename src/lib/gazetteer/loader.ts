// @layer adapter
import { validatePack, type GazetteerPack } from './pack';
import { buildIndex, type GazetteerIndex } from './search';

/** Where a pack comes from (GZ12): the app reads packs only; another dataset or a downloaded region is another source. */
export interface GazetteerSource {
  load(): Promise<GazetteerPack>;
}

/**
 * A source that reads its pack the first time `load` is called and keeps it (GZ15): never at launch. The read may be
 * asynchronous (the web's fetch, `source.web.ts`); either way the pack is validated before it is kept. A failed read is tried again.
 */
export function createGazetteerSource(read: () => unknown): GazetteerSource {
  let cached: Promise<GazetteerPack> | null = null;
  return {
    load() {
      if (!cached) {
        const p = (async () => {
          const pack = await read();
          const problems = validatePack(pack);
          if (problems.length) throw new Error(`gazetteer pack: ${problems[0]}`);
          return pack as GazetteerPack;
        })();
        cached = p;
        p.catch(() => {
          if (cached === p) cached = null;
        });
      }
      return cached;
    },
  };
}

const indexes = new WeakMap<GazetteerSource, Promise<GazetteerIndex>>();

/**
 * The lookup over a source's pack, built the first time it is asked for and kept (GZ15). It yields once first, so a screen
 * can draw "Getting ready…" before the build holds the thread. A failed read or build is tried again.
 */
export function indexOf(source: GazetteerSource): Promise<GazetteerIndex> {
  let p = indexes.get(source);
  if (!p) {
    const made: Promise<GazetteerIndex> = source.load().then(async (pack) => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      return buildIndex(pack);
    });
    indexes.set(source, made);
    made.catch(() => {
      if (indexes.get(source) === made) indexes.delete(source);
    });
    p = made;
  }
  return p;
}
