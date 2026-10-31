import type { Notifier } from './notify.types';

/** A pause this long gets a reminder that nothing is being recorded. */
export const PAUSE_REMIND_MS = 10 * 60_000;

/**
 * expo-notifications has no web build. A web walk only records while its page
 * is open and on screen, so the walk screen's own reminder is the one that is seen.
 */
export const notifier: Notifier = {
  async pauseStarted() {},
  async pauseEnded() {},
};
