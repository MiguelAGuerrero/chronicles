// @layer core
/**
 * Explore's "What's good here?" (tend explore 2): one look at a time, each with its own token, so a cancelled look stays
 * stopped when a newer one starts: its read ends, its line is never shown, and its end never clears the newer one.
 */
export type Look = { seq: number; live: number | null };
export const IDLE: Look = { seq: 0, live: null };

/** A new look, or null while one is live. */
export function startLook(s: Look): { state: Look; token: number } | null {
  if (s.live != null) return null;
  const token = s.seq + 1;
  return { state: { seq: token, live: token }, token };
}

/** Whether the look with this token is still the live one. */
export const isLive = (s: Look, token: number): boolean => s.live === token;

/** Cancel stops whichever look is live. */
export const cancelLook = (s: Look): Look => (s.live == null ? s : { ...s, live: null });

/** A look ends itself only while it is the live one; a stale end changes nothing. */
export const endLook = (s: Look, token: number): Look => (isLive(s, token) ? { ...s, live: null } : s);
