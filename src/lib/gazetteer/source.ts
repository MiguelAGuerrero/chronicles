// @layer adapter
import type { GazetteerPack } from './pack';

/** Where a pack comes from (GZ12): the app reads packs only; another dataset or a downloaded region is another source. */
export interface GazetteerSource {
  load(): Promise<GazetteerPack>;
}

/** A source that reads its pack the first time `load` is called and keeps it (GZ15): never at launch. */
export function createGazetteerSource(_read: () => unknown): GazetteerSource {
  throw new Error('place-search: not built');
}
