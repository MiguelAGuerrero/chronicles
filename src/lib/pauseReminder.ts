// @layer core
/**
 * The paused reminder ("Paused for 10 min. Nothing is recorded until you
 * resume.") is a sticky notice tied to the pause: it ends with the pause,
 * not on a timer, so resuming takes it down by itself.
 */
export function noticeShown<N extends { message: string; forPause?: boolean }>(notice: N | null, paused: boolean): N | null {
  return notice && notice.forPause && !paused ? null : notice;
}
