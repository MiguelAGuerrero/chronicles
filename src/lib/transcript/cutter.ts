// @layer adapter
/** The web cuts nothing: it reads no memos (see `engine.ts`). The phone's is `cutter.native.ts`. */
import type { Cutter } from './shell';

export const cutter: Cutter = {
  cut: async () => {
    throw new Error('Cutting audio is for phones.');
  },
  remove: async () => {},
};
