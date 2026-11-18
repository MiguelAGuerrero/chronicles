// @layer core
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
 * What a note written on its page stores (NP7, decision 0151): its body and the mark that the body is Markdown. A
 * moment's reactions are their own records (RX28), never part of a note's write.
 */
export function notePatch(body: string): { body: string; body_format: 'md' } {
  return { body, body_format: 'md' };
}
