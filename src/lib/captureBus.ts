import type { Capture } from './types';

/**
 * News of a capture just kept, for the other capture paths of the same walk
 * (NV9): the recording bar's camera keeps a photo for the open walk while the
 * walk screen is down, and a walk screen mounting meanwhile hears of it, so a
 * capture made just before Return to walk is shown once, never lost or twice.
 * Storage stays the truth; this only keeps the screens' lists in step.
 */
type Listener = { walkId: string; owner: object; fn: (c: Capture) => void };
const listeners = new Set<Listener>();

export const captureBus = {
  /** Listen for captures of a walk kept by any path but the owner's own. */
  subscribe(walkId: string, owner: object, fn: (c: Capture) => void): () => void {
    const l = { walkId, owner, fn };
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  emit(c: Capture, from: object) {
    if (!c.walk_id) return;
    for (const l of [...listeners]) if (l.walkId === c.walk_id && l.owner !== from) l.fn(c);
  },
};

/**
 * A walk's captures as stored, joined with those already on screen: one per
 * id, the copy on screen winning (it is pinned at the last position until
 * stop, and carries a caption just set), in time order.
 */
export function mergeCaptures(stored: Capture[], onScreen: Capture[]): Capture[] {
  const byId = new Map<string, Capture>();
  for (const c of stored) byId.set(c.id, c);
  for (const c of onScreen) byId.set(c.id, c);
  return [...byId.values()].sort((a, b) => a.t - b.t);
}
