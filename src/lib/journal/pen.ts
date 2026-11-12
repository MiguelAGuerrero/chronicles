// @layer core
/**
 * The open line's decisions (chronicle journal JN12, JN13, JN15, JN16; decision 0151): when typing begins an
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
  after: 'done' | 'kept' | null;
  /** The last save failed: the line says so and holds the words (JN13). */
  failed: boolean;
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
  | { k: 'save'; momentId: string; pieceId: string; body: string }
  | { k: 'drop'; momentId: string; pieceId: string }
  /** The open entry ends: the next piece begins a new one. */
  | { k: 'end' }
  /** The line empties. */
  | { k: 'clear' };

export const PEN_START: PenState = { body: '', entry: null, beginning: false, stored: '', after: null, failed: false };

/** Whether a body holds anything worth keeping: words or a reference. */
export const hasWords = (body: string): boolean => body.trim().length > 0;

const out = (state: PenState, ...effects: PenEffect[]) => ({ state, effects });

/** What letting go of the line does once its piece is stored: write what differs, then empty the line. */
function letGo(s: PenState, end: boolean): { state: PenState; effects: PenEffect[] } {
  const effects: PenEffect[] = [];
  if (s.entry) {
    if (!hasWords(s.body)) effects.push({ k: 'drop', ...s.entry });
    else if (s.body !== s.stored) effects.push({ k: 'save', ...s.entry, body: s.body });
  }
  if (s.entry || s.body) effects.push({ k: 'clear' });
  if (end) effects.push({ k: 'end' });
  return { state: PEN_START, effects };
}

export function penStep(s: PenState, e: PenEvent): { state: PenState; effects: PenEffect[] } {
  switch (e.k) {
    case 'type': {
      const next = { ...s, body: e.body };
      if (s.beginning) return out(next);
      if (!s.entry) {
        // The first character begins an entry (JN12); spaces alone begin nothing.
        if (!hasWords(e.body) || s.failed) return out(next);
        return out({ ...next, beginning: true }, { k: 'begin', body: e.body });
      }
      // Emptied: the piece is removed, so no blank entry is ever kept (JN13).
      if (!hasWords(e.body)) return out({ ...PEN_START, body: e.body }, { k: 'drop', ...s.entry });
      if (e.body === s.stored) return out(next);
      return out(next, { k: 'save', ...s.entry, body: e.body });
    }
    case 'began': {
      const entry = { momentId: e.momentId, pieceId: e.pieceId };
      const next: PenState = { ...s, entry, beginning: false, stored: e.body, failed: false };
      if (s.after) return letGo({ ...next, after: null }, s.after === 'done');
      if (!hasWords(s.body)) return out({ ...PEN_START, body: s.body }, { k: 'drop', ...entry });
      if (s.body !== e.body) return out(next, { k: 'save', ...entry, body: s.body });
      return out(next);
    }
    case 'beginFailed':
      return out({ ...s, beginning: false, after: null, failed: true });
    case 'saved':
      return out({ ...s, stored: e.body, failed: s.body === e.body ? false : s.failed });
    case 'saveFailed':
      return out({ ...s, failed: true });
    case 'retry': {
      if (!s.failed) return out(s);
      if (s.entry) return out(s, { k: 'save', ...s.entry, body: s.body });
      if (!hasWords(s.body)) return out({ ...s, failed: false });
      return out({ ...s, failed: false, beginning: true }, { k: 'begin', body: s.body });
    }
    case 'done':
    case 'kept': {
      // The begin is still on its way: remembered, and done once the piece is stored (JN15).
      if (s.beginning) return out({ ...s, after: e.k === 'done' || s.after === 'done' ? 'done' : 'kept' });
      return letGo(s, e.k === 'done');
    }
    case 'closed': {
      if (s.beginning) return out(s);
      return letGo(s, false);
    }
  }
}
