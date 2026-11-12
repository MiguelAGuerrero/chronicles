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

export function penStep(s: PenState, _e: PenEvent): { state: PenState; effects: PenEffect[] } {
  return { state: s, effects: [] };
}

/** Whether a body holds anything worth keeping: words or a reference. */
export const hasWords = (_body: string): boolean => false;
