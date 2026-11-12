// @layer core
/**
 * Note pages (NP10, decision 0149): a note the page wrote, as words. Its Markdown is read with `marked`, the lexer
 * `@tiptap/markdown` writes it with, and only the text is kept: no `#`, `-`, `[x]`, `>`, `**` or `_`, and the
 * entities the editor writes (`&gt;`) read as their characters. Lines stay lines.
 */
export function stripMarks(_md: string): string {
  throw new Error('note pages: not built');
}

/** What the replay's screen-reader step reads of a note (NP10): its first 300 characters, then a line that it goes on. */
export const STEP_NOTE_CHARS = 300;
export const STEP_NOTE_MORE = 'The note goes on; open it to read the rest';
export function stepNote(_words: string): { text: string; more: string | null } {
  throw new Error('note pages: not built');
}
