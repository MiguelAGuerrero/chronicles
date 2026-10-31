/** Reminders about a walk that reach the walker outside the app. */
export interface Notifier {
  /** A pause began: remind the walker after PAUSE_REMIND_MS that nothing is recorded. */
  pauseStarted(walkId: string): Promise<void>;
  /** The pause ended (resumed or stopped): the reminder is no longer due. */
  pauseEnded(walkId: string): Promise<void>;
}
