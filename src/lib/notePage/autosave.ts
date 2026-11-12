// @layer core
import { NOTE_SAVE_PAUSE } from '../motionTokens';
import { stripMarks } from './plain';
/**
 * Saving a page as it is written (NP9, decision 0151): a reducer, because pauses, leaving, the background, a save
 * in flight and a failed one tangle (functional-core rule). The view runs its effects through the screen's own
 * create, save and delete. Time is an argument.
 */
export type SaveState = {
  /** Kept as a moment yet: a new page is not until it has words. */
  kept: boolean;
  /** The text on the page now. */
  text: string;
  /** The text last stored. */
  stored: string;
  editedAt: number;
  inFlight: boolean;
  failed: boolean;
  leaving: boolean;
  /** Its delete has gone out: never twice. */
  deleted?: boolean;
};

export type SaveEvent =
  | { type: 'edit'; text: string; now: number }
  | { type: 'tick'; now: number }
  | { type: 'leave' }
  | { type: 'background' }
  | { type: 'saved'; text: string }
  | { type: 'failed' };

export type SaveEffect = { type: 'create'; body: string } | { type: 'save'; body: string } | { type: 'delete' };

/** Words, not marks: a page of only empty bullets, boxes or quotes has none (note-pages audit 6). */
const has = (text: string) => text.trim().length > 0 && stripMarks(text).trim().length > 0;

/** The page may close: nothing in flight, nothing failed (note-pages audit 4). A failure keeps it open, its words on it. */
export const closable = (s: SaveState): boolean => !s.inFlight && !s.failed;

export function startSave(o: { kept: boolean; body: string; now: number }): SaveState {
  return { kept: o.kept, text: o.body, stored: o.body, editedAt: o.now, inFlight: false, failed: false, leaving: false };
}

/**
 * The one write the page needs now, if any: a new page with words becomes a moment; a kept one is saved when it
 * differs from what is stored. An empty page never writes (steward S8): only leaving deletes a kept one.
 */
function write(s: SaveState): { state: SaveState; effects: SaveEffect[] } {
  if (s.inFlight || !has(s.text) || s.text === s.stored) return { state: s, effects: [] };
  return { state: { ...s, inFlight: true, failed: false }, effects: [{ type: s.kept ? 'save' : 'create', body: s.text }] };
}

export function stepSave(s: SaveState, e: SaveEvent): { state: SaveState; effects: SaveEffect[] } {
  switch (e.type) {
    case 'edit':
      return { state: { ...s, text: e.text, editedAt: e.now, failed: false }, effects: [] };
    case 'tick':
      // A failed save waits for the next change (or the way out) before it tries again.
      if (s.failed || e.now - s.editedAt < NOTE_SAVE_PAUSE) return { state: s, effects: [] };
      return write(s);
    case 'background':
      return write({ ...s, failed: false });
    case 'leave': {
      // Left once already (note-pages audit 11): what that started is running; a failure since is retried.
      if (s.leaving && !s.failed) return { state: s, effects: [] };
      const left = { ...s, leaving: true, failed: false };
      if (!has(s.text)) {
        if (!s.kept || s.inFlight) return { state: left, effects: [] };
        return { state: { ...left, deleted: true }, effects: [{ type: 'delete' }] };
      }
      return write(left);
    }
    case 'saved': {
      const landed = { ...s, kept: true, stored: e.text, inFlight: false, failed: false };
      // Words typed while it was in flight are written at once when leaving, else at the next pause.
      if (landed.leaving) {
        if (!has(landed.text)) return landed.deleted ? { state: landed, effects: [] } : { state: { ...landed, deleted: true }, effects: [{ type: 'delete' }] };
        return write(landed);
      }
      return { state: landed, effects: [] };
    }
    case 'failed':
      return { state: { ...s, inFlight: false, failed: true }, effects: [] };
  }
}
