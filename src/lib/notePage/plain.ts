// @layer core
import { Lexer, type Token, type Tokens } from 'marked';

/**
 * Note pages (NP10, decision 0151): a note the page wrote, as words. Its Markdown is read with `marked`, the lexer
 * `@tiptap/markdown` writes it with, and only the text is kept: no `#`, `-`, `[x]`, `>`, `**` or `*`, and the
 * entities the editor writes (`&gt;`) read as their characters. Each block is a line; a line break stays one.
 */
const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ' };
const decode = (s: string) => s.replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (_m, e: string) => ENTITIES[e]);

/** The words of inline tokens, in order. */
function inline(tokens: Token[] | undefined): string {
  if (!tokens) return '';
  let out = '';
  for (const t of tokens) {
    if (t.type === 'br') out += '\n';
    else if (t.type === 'escape') out += (t as Tokens.Escape).text;
    else if (t.type === 'html') out += decode((t as Tokens.HTML).text);
    else if ('tokens' in t && t.tokens && t.tokens.length) out += inline(t.tokens);
    else if ('text' in t && typeof t.text === 'string') out += decode(t.text);
    else out += decode(t.raw);
  }
  return out;
}

/** Every block as its lines, lists and quotes opened up. */
function blocks(tokens: Token[], lines: string[]): void {
  for (const t of tokens) {
    if (t.type === 'space' || t.type === 'hr') continue;
    if (t.type === 'list') {
      for (const item of (t as Tokens.List).items) blocks(item.tokens, lines);
    } else if (t.type === 'blockquote') {
      blocks((t as Tokens.Blockquote).tokens, lines);
    } else if (t.type === 'heading' || t.type === 'paragraph' || t.type === 'text') {
      const words = inline((t as Tokens.Text).tokens ?? [{ type: 'text', raw: (t as Tokens.Text).text, text: (t as Tokens.Text).text } as Token]);
      lines.push(...words.split('\n'));
    } else if (t.type === 'checkbox') {
      continue;
    } else if ('tokens' in t && t.tokens) {
      blocks(t.tokens, lines);
    } else if ('text' in t && typeof t.text === 'string') {
      lines.push(...decode(t.text).split('\n'));
    } else {
      lines.push(t.raw.trim());
    }
  }
}

export function stripMarks(md: string): string {
  const lines: string[] = [];
  blocks(new Lexer({ gfm: true }).lex(md), lines);
  // A bare box with no words is no words (note-pages audit 6).
  return lines.map((l) => l.trim()).filter((l) => l.length > 0 && !/^\[[ xX]?\]$/.test(l)).join('\n');
}

/** What the replay's screen-reader step reads of a note (NP10): its first 300 characters, then a line that it goes on. */
export const STEP_NOTE_CHARS = 300;
export const STEP_NOTE_MORE = 'The note goes on; open it to read the rest';
export function stepNote(words: string): { text: string; more: string | null } {
  if (words.length <= STEP_NOTE_CHARS) return { text: words, more: null };
  const cut = words.slice(0, STEP_NOTE_CHARS);
  const at = cut.lastIndexOf(' ');
  return { text: (at > STEP_NOTE_CHARS / 2 ? cut.slice(0, at) : cut).trimEnd(), more: STEP_NOTE_MORE };
}
