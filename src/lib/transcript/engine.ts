// @layer adapter
/**
 * The web's recognizer: none. Memo transcripts are for phones (decision 0165); nothing is read on the web, and the
 * words a database already holds are still shown. The phone's is `engine.native.ts`.
 */
import type { Engine } from './shell';

export const engine: Engine = {
  supportsOnDevice: async () => false,
  permission: async () => 'denied',
  requestPermission: async () => false,
  recognize: async () => {
    throw new Error('Speech recognition is for phones.');
  },
};
