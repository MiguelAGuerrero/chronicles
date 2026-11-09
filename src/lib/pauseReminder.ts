// @layer core
/**
 * The paused reminder ("Paused for 10 min. Nothing is recorded until you
 * resume.") is a sticky notice tied to one pause, named by its `started_at`:
 * it ends with that pause, not on a timer, so resuming takes it down by
 * itself and a later pause never shows an earlier one's.
 */
export function noticeShown<N extends { message: string; forPause?: number }>(notice: N | null, openPauseAt: number | null): N | null {
  return notice && notice.forPause != null && notice.forPause !== openPauseAt ? null : notice;
}
