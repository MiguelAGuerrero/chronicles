// @layer core
import { type NoteType, noteTypeOf } from './noteType';
/** A note's text at most, as the composer allows (QL24). */
export const NOTE_MAX = 500;

/**
 * A note's edited text as it is stored (QL25): trimmed and cut to
 * `NOTE_MAX`; null when nothing is left, since deleting a note is the
 * menu's Delete, never an empty save.
 */
export function noteText(body: string): string | null {
  const text = body.trim().slice(0, NOTE_MAX).trimEnd();
  return text ? text : null;
}

/**
 * What a note's save writes (NY7, NY8): its text, and its type only when the save names one. `undefined` leaves the
 * type as it was; `null` is "No type"; a value outside the set is no type (NY2). Text and type go in one write.
 */
export function notePatch(body: string, type?: string | null): { body: string; note_type?: NoteType | null } {
  return type === undefined ? { body } : { body, note_type: noteTypeOf(type) };
}
