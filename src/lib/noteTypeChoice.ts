// @layer core
/**
 * Choosing a note's type at capture (note types NY18-NY25, the gate of Nov 13): what a tap in the row of eight
 * means, and what a choice on a new note's page waits for. They take types and nothing else: never a note's text,
 * time or place (NY13).
 */
import { noteTypeOf, type NoteType } from './noteType';

/** A tap on a type in the row of eight (NY19): it marks the note; a tap on the one already marked clears it. */
export function pickType(now: string | null | undefined, tapped: NoteType): NoteType | null {
  return noteTypeOf(now) === tapped ? null : tapped;
}

/**
 * A type chosen on a new note's page (NY24): written at once when the note is kept already, held for the note when
 * it is not (a page with no words keeps nothing, whatever was chosen), and nothing to do with neither.
 */
export function typeForNewNote(o: { kept: boolean; chosen: string | null }): 'set' | 'wait' | 'none' {
  if (o.kept) return 'set';
  return noteTypeOf(o.chosen) ? 'wait' : 'none';
}
