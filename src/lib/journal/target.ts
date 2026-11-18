// @layer core
/**
 * Where an entry from the open line goes (chronicle journal JN8; from capture-from-chronicle HC9, HC10 and its
 * audit 7): into the open walk, else a moment of its own. Until the keeper knows whether a walk is open,
 * nowhere: the line waits rather than keep a loose moment for a walk that is open.
 */
export function captureTarget(openWalk: { id: string } | null, known = true): { walkId: string } | { loose: true } | { wait: true } {
  if (!known) return { wait: true };
  return openWalk ? { walkId: openWalk.id } : { loose: true };
}

/** How long a location read serves: an emptied entry's read is used by the next one only this soon after it was asked (JN12, audit 5). */
export const SPARE_FIX_MS = 120_000;

/** Whether a read asked at `readAt` may still place an entry begun at `now`. */
export function spareFresh(readAt: number, now: number): boolean {
  return now - readAt >= 0 && now - readAt < SPARE_FIX_MS;
}
