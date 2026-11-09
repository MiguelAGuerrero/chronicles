// @layer adapter
import { Paths } from 'expo-file-system';
import type { SpaceProbe } from './core';

/**
 * A phone's room (SA1): expo-file-system's free space on the volume that holds the app's documents
 * (decision 0107, Expo first). On iOS it is the plain free size, which leaves out what the system could
 * purge, so it reads low, never high. Nothing to ask: a phone's app storage is never cleared by a browser.
 */
export const probe: SpaceProbe = {
  async free() {
    const n: unknown = Paths.availableDiskSpace;
    return typeof n === 'number' ? n : null;
  },
  async persist() {
    return null;
  },
  homeScreen: () => false,
};
