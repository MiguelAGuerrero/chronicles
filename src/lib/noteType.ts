// @layer core
/**
 * A note's type (NY1-NY17, decision 0149): one of eight ink marks the owner chooses, never set from a note's text,
 * time or place and never counted. STUB for tests-first: the real set comes with its code.
 */
export type NoteType = 'question' | 'emphasis' | 'idea' | 'happy' | 'neutral' | 'sad' | 'like' | 'dislike';

export type NoteTypeInfo = { id: NoteType; glyph: string; name: string };

export const NOTE_TYPES: readonly NoteTypeInfo[] = [];

/** A stored value as a type: null for anything outside the set. */
export function noteTypeOf(_raw: unknown): NoteType | null {
  return null;
}

/** A note's mark: its type's glyph and spoken name; null for a note with none and for anything not a note. */
export function markOf(_c: { kind: string; note_type?: string | null }): NoteTypeInfo | null {
  return null;
}
