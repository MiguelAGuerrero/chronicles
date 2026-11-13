// @layer shell
import { type Faced, patchFaced } from './moment';

/**
 * News of a capture just kept, for the other capture paths of the same walk
 * (NV9): the recording bar's camera and Navigate's row keep captures for the
 * open walk while the walk screen is down, and a walk screen mounting
 * meanwhile hears of them, so a capture made just before Return to walk is
 * shown once, never lost or twice. A later change to one (its thumbnail, made
 * after it was kept) goes out as a patch, even once the path that made it is
 * gone (tabs audit 5). Storage stays the truth; this only keeps the screens'
 * lists in step.
 */
export type CapturePatch = Partial<Pick<Faced, 'thumb_path' | 'lat' | 'lon' | 'caption' | 'caption_y' | 'body' | 'body_format' | 'edit' | 'note_type'>>;
/** The channel for loose moments, which belong to no walk (media-editing audit 2). */
export const LOOSE_MOMENTS = '@loose-moments';
type Listener = { walkId: string; owner: object; fn: (c: Faced) => void; onPatch?: (id: string, patch: CapturePatch, pieceId?: string) => void };
const listeners = new Set<Listener>();

export const captureBus = {
  /** Listen for captures of a walk kept (or changed) by any path but the owner's own. */
  subscribe(walkId: string, owner: object, fn: (c: Faced) => void, onPatch?: (id: string, patch: CapturePatch, pieceId?: string) => void): () => void {
    const l = { walkId, owner, fn, onPatch };
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  emit(c: Faced, from: object) {
    if (!c.walk_id) return;
    for (const l of [...listeners]) if (l.walkId === c.walk_id && l.owner !== from) l.fn(c);
  },
  /**
   * A capture already sent changed after (tabs audit 5), or was edited (a
   * note's text, QL25). `from` null: a screen with no path of its own (the
   * replay, a day), so every listener hears it.
   */
  patch(walkId: string | null, id: string, patch: CapturePatch, from: object | null, pieceId?: string) {
    // A loose moment's change goes to whoever lists loose moments (Navigate, ready).
    const key = walkId ?? LOOSE_MOMENTS;
    for (const l of [...listeners]) if (l.walkId === key && l.owner !== from) l.onPatch?.(id, patch, pieceId);
  },
};

/** A list with one capture's fields changed; the same list when it isn't there. */
export function applyPatch(list: Faced[], id: string, patch: CapturePatch, pieceId?: string): Faced[] {
  if (!list.some((c) => c.id === id)) return list;
  return list.map((c) => (c.id === id ? patchFaced(c, patch, pieceId) : c));
}

/**
 * A walk's captures as stored, joined with those already on screen: one per
 * id, the copy on screen winning (it is pinned at the last position until
 * stop, and carries a caption just set), in time order.
 */
export function mergeCaptures(stored: Faced[], onScreen: Faced[]): Faced[] {
  const byId = new Map<string, Faced>();
  for (const c of stored) byId.set(c.id, c);
  for (const c of onScreen) byId.set(c.id, c);
  return [...byId.values()].sort((a, b) => a.t - b.t);
}
