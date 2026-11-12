// @layer adapter
/**
 * The note page's document (NP3, NP7, NP13, decision 0149): TipTap's extensions, and the Markdown a note's body
 * holds, through `@tiptap/markdown`. A mention is `@[id|words]` (0125). A note without the mark (`body_format`
 * null, every note written before) is read literally: each of its lines a paragraph of plain text, so `# 3 buses`
 * stays as typed, and once written in it is kept as Markdown that shows the same characters.
 */
import type { AnyExtension, JSONContent, MarkdownToken, NodeViewRenderer } from '@tiptap/core';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { Mention } from '@tiptap/extension-mention';
import { MarkdownManager } from '@tiptap/markdown';
import { Paragraph } from '@tiptap/extension-paragraph';
import { StarterKit } from '@tiptap/starter-kit';
import { parseRefs, refToken } from '../refs';

export type BodyFormat = 'md' | null;

const TOKEN = /^@\[([A-Za-z0-9_-]+)(?:\|([^\]|\n]*))?\]/;

/** A mention as the body has always held it, `@[id|words]` (0125), never TipTap's own shortcode. */
export const NoteMention = Mention.extend({
  markdownTokenizer: {
    name: 'mention',
    level: 'inline',
    start: (src: string) => src.indexOf('@['),
    tokenize: (src: string) => {
      const m = TOKEN.exec(src);
      if (!m) return undefined;
      return { type: 'mention', raw: m[0], attributes: { id: m[1], label: m[2]?.trim() || null } } as MarkdownToken;
    },
  },
  parseMarkdown: (token, h) => h.createNode('mention', (token as MarkdownToken & { attributes: Record<string, unknown> }).attributes),
  renderMarkdown: (node) => refToken(String(node.attrs?.id ?? ''), (node.attrs?.label as string | null) ?? null),
});

/** A line of a paragraph that Markdown would read as a block of its own is kept as text (NP7). */
const LEADING = /^(\s*)(#{1,6}(?=\s|$)|\d+(?=[.)]\s)|[-+*](?=\s)|>)/;
const keepLeading = (line: string) =>
  line
    // An indent would read as code: it is kept as no-break spaces, which read the same (note-pages audit 7).
    .replace(/^[ \t]+/, (ws) => ws.replace(/\t/g, '    ').replace(/ /g, '\u00a0'))
    // A line of three or more -, * or _ would read as a rule (note-pages audit 7).
    .replace(/^(\u00a0*)([-*_])((?:\s*\2){2,}\s*)$/, '$1\\$2$3')
    .replace(LEADING, (_m, sp: string, mark: string) => `${sp}${/^\d/.test(mark) ? mark : `\\${mark[0]}${mark.slice(1)}`}`)
    .replace(/^(\s*\d+)([.)])(?=\s)/, '$1\\$2');

const SafeParagraph = Paragraph.extend({
  renderMarkdown(node, helpers, ctx) {
    const md = this.parent ? this.parent(node, helpers, ctx) : helpers.renderChildren(node.content ?? []);
    return md.split('\n').map(keepLeading).join('\n');
  },
});

/** What the editor adds to the document's own extensions: the @ picker, and whether a box ticks while reading. */
export type EditorOptions = {
  mention?: Parameters<typeof NoteMention.configure>[0];
  /** A tap on a checkbox while reading changes nothing (NP5; the steward's S1, decision 0114). */
  readOnlyTicks?: boolean;
  /** How a checkbox is heard (NP12). */
  checkboxLabel?: (text: string, checked: boolean) => string;
  /** How a mention is drawn: the reader draws it as a card of its moment (RF4). */
  mentionView?: NodeViewRenderer;
};

/** The extensions the document is made of: the subset of the spec and nothing more (no link, image, code or rule). */
export function noteExtensions(o: EditorOptions = {}): AnyExtension[] {
  return [
    StarterKit.configure({ paragraph: false, code: false, codeBlock: false, strike: false, link: false, underline: false, horizontalRule: false, heading: { levels: [1, 2] } }),
    SafeParagraph,
    TaskList,
    TaskItem.configure({
      nested: false,
      onReadOnlyChecked: () => !!o.readOnlyTicks,
      ...(o.checkboxLabel ? { a11y: { checkboxLabel: (node, checked) => o.checkboxLabel!(node.textContent, checked) } } : {}),
    }),
    (o.mentionView ? NoteMention.extend({ addNodeView: () => o.mentionView! }) : NoteMention).configure(o.mention ?? {}),
  ];
}

let manager: MarkdownManager | null = null;
const markdown = () => (manager ??= new MarkdownManager({ extensions: noteExtensions() }));

/** One line of a literal note: its words and its mentions, nothing read as a mark. */
const literalLine = (line: string): JSONContent => {
  const content: JSONContent[] = [];
  for (const p of parseRefs(line)) {
    if ('text' in p) content.push({ type: 'text', text: p.text });
    else content.push({ type: 'mention', attrs: { id: p.ref, label: p.label } });
  }
  return content.length ? { type: 'paragraph', content } : { type: 'paragraph' };
};

/** A body as the editor's document. */
export function toDoc(body: string, format: BodyFormat): JSONContent {
  if (format === 'md') return markdown().parse(body);
  return { type: 'doc', content: body.split('\n').map(literalLine) };
}

/** The editor's document as the body it is kept as (always Markdown). */
export function toBody(doc: JSONContent): string {
  return markdown().serialize(doc).replace(/\s+$/, '');
}
