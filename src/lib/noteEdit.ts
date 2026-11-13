// @layer core
import { type NoteType, noteTypeOf } from './noteType';
/** A note's text at most (QL24; 20,000 since note pages NP8, decision 0151), counted as shown. */
export const NOTE_MAX = 20000;

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
 * What a note written on its page stores (NP7, decision 0151; note types NY7, NY8): its body, the mark that the body is
 * Markdown, and its type only when the save names one. `undefined` leaves the type as it was; `null` is "No type"; a value
 * outside the set is no type (NY2). Text and type go in one write.
 */
export function notePatch(body: string, type?: string | null, typeOnly = false): { body?: string; body_format?: 'md'; note_type?: NoteType | null } {
  // A type chosen on its own never rewrites the words or marks a note written before the page as Markdown (note types audit 26).
  if (typeOnly) return { note_type: noteTypeOf(type) };
  return type === undefined ? { body, body_format: 'md' } : { body, body_format: 'md', note_type: noteTypeOf(type) };
}
