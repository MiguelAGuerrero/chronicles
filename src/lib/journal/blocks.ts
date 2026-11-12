// @layer core
import { Lexer, type Token, type Tokens } from 'marked';

/**
 * A page-written note on the journal's sheet (chronicle journal JN26, JN27; decisions 0151, 0154): its Markdown read
 * into blocks the sheet draws with plain native text (a heading, a bullet, a numbered line, a checkbox, a quote, a
 * paragraph), never the editor itself: a list of entries cannot hold a web view each. A block's text keeps its
 * mention tokens (`@[id|words]`), so the sheet can draw them as cards; every other mark is read as its words. Read
 * with `marked`, the lexer `@tiptap/markdown` writes with, as `notePage/plain` does.
 */
export type NoteBlock =
  | { k: 'heading'; level: 1 | 2; text: string }
  | { k: 'para'; text: string }
  | { k: 'bullet'; text: string }
  | { k: 'number'; n: number; text: string }
  | { k: 'task'; done: boolean; text: string }
  | { k: 'quote'; text: string };

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ' };
const decode = (s: string) => s.replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (_m, e: string) => ENTITIES[e]);

// A mention's token holds `[`, `|` and `]`, which Markdown would read as its own: each is set aside as a private-use
// mark while the note is lexed, and put back in the block it landed in.
const MENTION = /@\[[^\]\n]*\]/g;
const HELD = /(\d+)/g;

/** The words of inline tokens, in order. */
function inline(tokens: Token[] | undefined): string {
  if (!tokens) return '';
  let out = '';
  for (const t of tokens) {
    if (t.type === 'br') out += '\n';
    else if (t.type === 'escape') out += (t as Tokens.Escape).text;
    else if (t.type === 'html') out += decode((t as Tokens.HTML).text);
    else if (t.type === 'checkbox') continue;
    else if ('tokens' in t && t.tokens && t.tokens.length) out += inline(t.tokens);
    else if ('text' in t && typeof t.text === 'string') out += decode(t.text);
    else out += decode(t.raw);
  }
  return out;
}

/** The words of a block token: its inline tokens, or its own text. */
const wordsOf = (t: Token): string => {
  const own = (t as Tokens.Text).tokens;
  if (own && own.length) return inline(own);
  return 'text' in t && typeof t.text === 'string' ? decode(t.text) : decode(t.raw);
};

/** The words of a list item or a quote: its blocks' words, a line each. */
function wordsIn(tokens: Token[]): string {
  const lines: string[] = [];
  for (const t of tokens) {
    if (t.type === 'space' || t.type === 'hr' || t.type === 'checkbox') continue;
    if (t.type === 'list') for (const item of (t as Tokens.List).items) lines.push(wordsIn(item.tokens));
    else if (t.type === 'blockquote') lines.push(wordsIn((t as Tokens.Blockquote).tokens));
    else lines.push(wordsOf(t));
  }
  return lines.map((l) => l.trim()).filter(Boolean).join('\n');
}

function walk(tokens: Token[], out: NoteBlock[]): void {
  for (const t of tokens) {
    if (t.type === 'space' || t.type === 'hr') continue;
    if (t.type === 'heading') {
      out.push({ k: 'heading', level: (t as Tokens.Heading).depth <= 1 ? 1 : 2, text: wordsOf(t).trim() });
    } else if (t.type === 'list') {
      const list = t as Tokens.List;
      let n = typeof list.start === 'number' ? list.start : 1;
      for (const item of list.items) {
        const text = wordsIn(item.tokens);
        if (item.task) out.push({ k: 'task', done: !!item.checked, text });
        else if (list.ordered) out.push({ k: 'number', n: n++, text });
        else out.push({ k: 'bullet', text });
      }
    } else if (t.type === 'blockquote') {
      out.push({ k: 'quote', text: wordsIn((t as Tokens.Blockquote).tokens) });
    } else {
      out.push({ k: 'para', text: wordsOf(t).trim() });
    }
  }
}

/** The blocks of a note the page wrote, in order. A block with no words (a bare box) is none. */
export function noteBlocks(md: string): NoteBlock[] {
  const held: string[] = [];
  const safe = md.replace(MENTION, (m) => `${held.push(m) - 1}`);
  const out: NoteBlock[] = [];
  walk(new Lexer({ gfm: true }).lex(safe), out);
  return out
    .map((b) => ({ ...b, text: b.text.replace(HELD, (_m, i: string) => held[Number(i)] ?? '') }))
    .filter((b) => b.text.trim().length > 0 && !/^\[[ xX]?\]$/.test(b.text.trim()));
}

/** The sheet draws this many blocks of an entry, and says the entry goes on (JN27). */
export const SHEET_BLOCKS = 12;
/** Said under a long entry on the sheet, in the app's voice. */
export const ENTRY_GOES_ON = 'The entry goes on; open it to read the rest';

/** The blocks the sheet draws, and whether the entry goes on past them. */
export function sheetBlocks(blocks: NoteBlock[], max = SHEET_BLOCKS): { shown: NoteBlock[]; more: boolean } {
  return blocks.length > max ? { shown: blocks.slice(0, max), more: true } : { shown: blocks, more: false };
}
