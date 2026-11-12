// @layer core
/**
 * The open line's decisions (chronicle journal JN12, JN13, JN15, JN16; decision 0155): when typing begins an
 * entry, when it is saved, when an emptied one is removed, and when the line lets go of it. A reducer: the view
 * runs the effects with the capture code it already has.
 */

export interface PenState {
  /** The line's text as stored: a note's body, references as tokens. */
  body: string;
  /** The piece the line is writing, once it is stored. */
  entry: { momentId: string; pieceId: string } | null;
  /** A begin is on its way to the store. */
  beginning: boolean;
  /** What the piece last held in the store, so nothing is written twice. */
  stored: string;
  /** Done or another capture arrived while the begin was on its way. */
  after: 'done' | 'kept' | 'closed' | null;
  /** The last save failed: the line says so and holds the words (JN13). */
  failed: boolean;
  /**
   * The line is letting go of its words (Done, a kept capture, the entry closed) and waits for their write: it
   * empties only once they are known to be kept, so a failed save never loses them (audit 4).
   */
  leaving: 'done' | 'kept' | 'closed' | null;
}

export type PenEvent =
  | { k: 'type'; body: string }
  | { k: 'began'; momentId: string; pieceId: string; body: string }
  | { k: 'beginFailed' }
  | { k: 'saved'; body: string }
  | { k: 'saveFailed' }
  | { k: 'retry' }
  /** Done: the keyboard goes and the entry ends (JN13, JN15). */
  | { k: 'done' }
  /** A photo, video or memo was kept: the words written so far stand as their own piece (JN15). */
  | { k: 'kept' }
  /** The open entry closed by itself: two minutes, leaving, a walk's 100 m (JN15). */
  | { k: 'closed' };

export type PenEffect =
  | { k: 'begin'; body: string }
  /** `now`: written at once, not after the typing pause. */
  | { k: 'save'; momentId: string; pieceId: string; body: string; now?: true }
  | { k: 'drop'; momentId: string; pieceId: string }
  /** The open entry ends: the next piece begins a new one. */
  | { k: 'end' }
  /** The line empties. */
  | { k: 'clear' };

export const PEN_START: PenState = { body: '', entry: null, beginning: false, stored: '', after: null, failed: false, leaving: null };

/** Whether a body holds anything worth keeping: words or a reference. */
export const hasWords = (body: string): boolean => body.trim().length > 0;

const out = (state: PenState, ...effects: PenEffect[]) => ({ state, effects });

/** Letting go of the line: what differs is written first, and the line empties once that write is known to have landed. */
function letGo(s: PenState, how: 'done' | 'kept' | 'closed'): { state: PenState; effects: PenEffect[] } {
  const end: PenEffect[] = how === 'done' ? [{ k: 'end' }] : [];
  if (!s.entry) return out(PEN_START, ...(s.body ? [{ k: 'clear' } as PenEffect] : []), ...end);
  if (!hasWords(s.body)) return out(PEN_START, { k: 'drop', ...s.entry }, { k: 'clear' }, ...end);
  if (s.body === s.stored) return out(PEN_START, { k: 'clear' }, ...end);
  return out({ ...s, leaving: how }, { k: 'save', ...s.entry, body: s.body, now: true });
}

export function penStep(s0: PenState, e: PenEvent): { state: PenState; effects: PenEffect[] } {
  // Typing again takes the line back: it is no longer letting go.
  const s = e.k === 'type' && s0.leaving ? { ...s0, leaving: null } : s0;
  switch (e.k) {
    case 'type': {
      const next = { ...s, body: e.body };
      if (s.beginning) return out(next);
      if (!s.entry) {
        // The first character begins an entry (JN12); spaces alone begin nothing. After a begin that failed, the
        // next words begin again by themselves (audit 4).
        if (!hasWords(e.body)) return out({ ...next, failed: false });
        return out({ ...next, beginning: true, failed: false }, { k: 'begin', body: e.body });
      }
      // Emptied: the piece is removed, so no blank entry is ever kept (JN13).
      if (!hasWords(e.body)) return out({ ...PEN_START, body: e.body }, { k: 'drop', ...s.entry });
      if (e.body === s.stored) return out(next);
      return out(next, { k: 'save', ...s.entry, body: e.body });
    }
    case 'began': {
      const entry = { momentId: e.momentId, pieceId: e.pieceId };
      const next: PenState = { ...s, entry, beginning: false, stored: e.body, failed: false };
      if (s.after) return letGo({ ...next, after: null }, s.after);
      if (!hasWords(s.body)) return out({ ...PEN_START, body: s.body }, { k: 'drop', ...entry });
      if (s.body !== e.body) return out(next, { k: 'save', ...entry, body: s.body });
      return out(next);
    }
    case 'beginFailed':
      return out({ ...s, beginning: false, after: null, failed: true });
    case 'saved': {
      // A write that lands after the line gave its entry away (to a page) is no longer the line's (audit 4).
      if (!s.entry) return out(s);
      const kept = e.body === s.body;
      if (s.leaving && kept) return out(PEN_START, { k: 'clear' }, ...(s.leaving === 'done' ? [{ k: 'end' } as PenEffect] : []));
      return out({ ...s, stored: e.body, failed: kept ? false : s.failed });
    }
    case 'saveFailed':
      if (!s.entry) return out(s);
      return out({ ...s, failed: true, leaving: null });
    case 'retry': {
      if (!s.failed) return out(s);
      if (s.entry) return out(s, { k: 'save', ...s.entry, body: s.body, now: true });
      if (!hasWords(s.body)) return out({ ...s, failed: false });
      return out({ ...s, failed: false, beginning: true }, { k: 'begin', body: s.body });
    }
    case 'done':
    case 'kept':
    case 'closed': {
      // The begin is still on its way: remembered, and done once the piece is stored (JN15, audit 10).
      if (s.beginning) return out({ ...s, after: e.k === 'done' || s.after === 'done' ? 'done' : s.after ?? e.k });
      if (s.leaving) return out({ ...s, leaving: e.k === 'done' ? 'done' : s.leaving });
      return letGo(s, e.k);
    }
  }
}
