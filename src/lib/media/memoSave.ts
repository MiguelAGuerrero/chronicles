// @layer core
import { saveFailLine } from '../space/core';

/**
 * The file a stopped voice memo holds: the recorder's uri, only when this memo's own prepare or stop set it
 * (tend captures 1). On the web the uri is set only once a stop answers, so a stop given up on after
 * `STOP_TIMEOUT_MS`, or a recorder that stopped by itself, leaves none, or the last memo's: one already kept
 * and let go (a Retry that cannot work), or one still held for its own Retry (kept twice, under this one's
 * time). Phones name a new file at each prepare (expo-audio 58's sources), so theirs always differs.
 */
export function memoFile(before: string | null, after: string | null): string | null {
  return after && after !== before ? after : null;
}

/** Where a memo whose save failed goes: held here for Retry, or let go, with nothing to retry. */
export type MemoHold = 'here' | 'none';

/**
 * A voice memo whose save failed (SA8, SA9): held for Retry only when it has a file to retry with. With
 * none, a Retry could never succeed, so it is said, in the words every failed save has, and let go
 * (tend captures 1); `lost` lets Stop end the walk rather than ask for a Retry that is not there.
 */
export function failedMemo(m: { file: string | null; outOfSpace: boolean }): { hold: MemoHold; line: string; result: 'failed' | 'lost' } {
  if (!m.file) return { hold: 'none', line: saveFailLine('voice', false), result: 'lost' };
  return { hold: 'here', line: saveFailLine('voice', m.outOfSpace), result: 'failed' };
}
