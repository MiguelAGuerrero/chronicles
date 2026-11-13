// @layer core
/**
 * A note's type (NY1-NY17, decision 0161): one of eight ink marks the owner chooses on their own note, shown in place
 * of the generic note glyph. Never set from a note's text, time or place, never counted, filtered, sorted or read by
 * anything about a place: it is a mark, not a measure. The order is fixed and is the menu's.
 */
export type NoteType = 'question' | 'emphasis' | 'idea' | 'happy' | 'neutral' | 'sad' | 'like' | 'dislike';

/** `glyph` is an Ionicons name (the one ink glyph set the app uses); `name` is what a screen reader says. */
export type NoteTypeInfo = { id: NoteType; glyph: string; name: string };

export const NOTE_TYPES: readonly NoteTypeInfo[] = [
  { id: 'question', glyph: 'help-circle-outline', name: 'Question' },
  { id: 'emphasis', glyph: 'alert-circle-outline', name: 'Emphasis' },
  { id: 'idea', glyph: 'bulb-outline', name: 'Idea' },
  { id: 'happy', glyph: 'happy-outline', name: 'Happy' },
  // Ionicons has no neutral face: a plain dash in a circle, a mark of no lean either way.
  { id: 'neutral', glyph: 'remove-circle-outline', name: 'Neutral' },
  { id: 'sad', glyph: 'sad-outline', name: 'Sad' },
  { id: 'like', glyph: 'thumbs-up-outline', name: 'Like' },
  { id: 'dislike', glyph: 'thumbs-down-outline', name: 'Dislike' },
];

const BY_ID = new Map<string, NoteTypeInfo>(NOTE_TYPES.map((t) => [t.id, t]));

/** A stored value as a type: null for anything outside the set (a newer build's, a bad row), never an error (NY2). */
export function noteTypeOf(raw: unknown): NoteType | null {
  return typeof raw === 'string' && BY_ID.has(raw) ? (raw as NoteType) : null;
}

/** A note's mark: its type's glyph and spoken name; null for a note with none, and for anything that is not a note (NY3). */
export function markOf(c: { kind: string; note_type?: string | null }): NoteTypeInfo | null {
  if (c.kind !== 'text') return null;
  const t = noteTypeOf(c.note_type);
  return t ? BY_ID.get(t)! : null;
}
