/** Reminders about a walk that reach the walker outside the app. */
export interface Notifier {
  /** A pause began: remind the walker after PAUSE_REMIND_MS that nothing is recorded. */
  pauseStarted(walkId: string): Promise<void>;
  /** The pause ended (resumed or stopped): the reminder is no longer due. */
  pauseEnded(walkId: string): Promise<void>;
  /**
   * A flagged capture came back while the app is in the background (R3): one
   * notification carrying its content, with "Stop reminding me" (R8).
   */
  recall(text: { title: string; body: string }, captureIds: string[], walkId: string): Promise<void>;
  /** An ambient hint (A7, A9): category, distance and side; a tap opens its mark. Phone only. */
  ambient(text: string, markId: string, walkId: string): Promise<void>;
  /** Asks for notifications while the app is in front (a reminder was set); the location task only checks. */
  ask(): Promise<void>;
}
