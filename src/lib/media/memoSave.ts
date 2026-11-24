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

/**
 * A step of the memo set aside by a discard (T48, the owner's "Undo + Close, stays", decision 0233, amending 0008's
 * 5 s; ui-patterns, decision 0113). No clock: it stays until it is used (Undo keeps it), closed, replaced by the next
 * capture or discard, or its screen goes; each of those lets the one set aside go. `keep` is the memo to save, `letGo`
 * the one whose file is dropped.
 */
export type SetAsideEvent<M> = { type: 'discard'; memo: M } | { type: 'undo' | 'close' | 'capture' | 'leave' };
export function setAside<M>(held: M | null, e: SetAsideEvent<M>): { held: M | null; keep: M | null; letGo: M | null } {
  if (e.type === 'discard') return { held: e.memo, keep: null, letGo: held };
  if (e.type === 'undo') return { held: null, keep: held, letGo: null };
  return { held: null, keep: null, letGo: held };
}

/** The discarded memo's Close, saying what it leaves, as the delete's Undo pill does (deletion `dismissLabel`). */
export const DISCARD_CLOSE_LABEL = 'Close, it stays discarded';

/**
 * The width the discard pill's one row takes at the default text size: its words, Undo and Close side by side, with the
 * pill's padding and gaps (the walk's pill, the wider of the two screens'; tend walk-screen audit 28).
 */
export const DISCARD_ROW_PX = 340;
/**
 * Whether the discard pill's words take a line of their own above Undo and Close: when the row the pills have beside the
 * capture stack (`room`) cannot hold them on one line, as on every phone, so Close never hangs outside the pill over the
 * stack and the words never wrap (tend walk-screen audit 28; the dead-zone nudge's narrow layout, audit 13).
 */
export function discardPillStacks(room: number, fontScale = 1): boolean {
  return room < DISCARD_ROW_PX * Math.max(1, fontScale);
}
