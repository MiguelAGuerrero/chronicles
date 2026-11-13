// @layer adapter
/**
 * The web's recognizer: none. Memo transcripts are for phones (decision 0166); nothing is read on the web, nothing is
 * stored or asked, and the words a database already holds are still shown. The phone's is `engine.native.ts`.
 */
import type { Engine } from './shell';

export const engine: Engine = {
  supportsOnDevice: async () => false,
  permission: async () => 'unavailable',
  requestPermission: async () => false,
  recognize: async () => {
    throw new Error('Speech recognition is for phones.');
  },
  abort: () => {},
};
