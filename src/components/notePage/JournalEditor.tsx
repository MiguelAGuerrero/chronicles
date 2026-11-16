'use dom';

/**
 * The note page's editor (NP3-NP7, NP12, NP13; decision 0151): TipTap, run by Expo's DOM components, a WebView on
 * phones and plain DOM on the web. It draws the page's head and its words; the app around it holds the bars, the
 * picker, the camera and the saving. Everything it says back is plain data: the body as Markdown, the words as shown,
 * which formats are on, that @ was typed.
 */
import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type Ref } from 'react';
import { EditorContent, NodeViewWrapper, ReactNodeViewRenderer, useEditor, type Editor, type ReactNodeViewProps } from '@tiptap/react';
import { CharacterCount, Placeholder } from '@tiptap/extensions';
import { IS_DOM, useDOMImperativeHandle, type DOMImperativeFactory, type DOMProps } from 'expo/dom';
import { NOTE_CSP } from '../../lib/notePage/csp';
import { noteExtensions, toBody, toDoc, type BodyFormat } from '../../lib/notePage/schema';

export type Formats = { h1: boolean; h2: boolean; bold: boolean; italic: boolean; bullet: boolean; ordered: boolean; task: boolean; quote: boolean };
export type FormatKind = 'h1' | 'h2' | 'body' | 'bold' | 'italic' | 'bullet' | 'ordered' | 'task' | 'quote';
export type Palette = { ink: string; muted: string; line: string; edge: string; bg: string; surface: string };

/** What the app asks of the editor (Expo DOM's handle: plain JSON arguments). `format` takes a `FormatKind`. */
export interface JournalHandle extends DOMImperativeFactory {
  format: (...args: JSONValue[]) => void;
  insertMention: (...args: JSONValue[]) => void;
  focus: (...args: JSONValue[]) => void;
  /** Lets go of the caret, so the keyboard goes down while another layer is up (note pictures NI14). */
  blur: (...args: JSONValue[]) => void;
}
type JSONValue = Parameters<DOMImperativeFactory[string]>[number];

/** A mention as the reader draws it: `useMentionCards`' JSON (RF4, RF5). */
type Picture = { src: string; video: boolean; spoken: string; context: string | null };
type Card = { gone: true; text: string } | { gone: false; name: string; line: string; spoken: string; picture?: Picture };
const Cards = createContext<Record<string, Card> | undefined>(undefined);

/** Whether the page is being written: a mention is then a chip or a picture, and a tap on a picture asks for its menu. */
const Writing = createContext(false);

/**
 * A mention: while writing a chip; a photo's or video's picture where it has been made (note pictures NI1-NI3, NI10);
 * in the reader a card of its moment, its words and its date, place and walk, or that it is gone (RF4, RF5).
 */
function MentionView(p: ReactNodeViewProps) {
  const cards = useContext(Cards);
  const writing = useContext(Writing);
  const id = String(p.node.attrs.id);
  const c = cards?.[id];
  if (c && !c.gone && c.picture) {
    const pic = c.picture;
    return (
      <NodeViewWrapper as="span" className="mention picture" data-id={id} data-testid="note-picture" role="button" tabIndex={0} aria-label={`${pic.spoken}${writing ? '. Edit' : '. Open'}`}>
        <span className="pic-frame">
          <img src={pic.src} alt="" draggable={false} />
          {pic.video ? <span className="pic-play" aria-hidden="true" /> : null}
        </span>
        {pic.context ? <span className="pic-context" data-testid="note-picture-context">{pic.context}</span> : null}
      </NodeViewWrapper>
    );
  }
  if (!c || (writing && !c.gone)) return <NodeViewWrapper as="span" className="mention" data-id={id} role={writing ? 'link' : undefined} tabIndex={writing ? 0 : undefined}>@{String(p.node.attrs.label ?? 'a moment')}</NodeViewWrapper>;
  if (c.gone) return <NodeViewWrapper as="span" className="card gone" data-testid="ref-card-gone">{c.text}</NodeViewWrapper>;
  return (
    <NodeViewWrapper as="span" className="card mention" data-id={id} data-testid="ref-card" role="button" tabIndex={0} aria-label={c.spoken}>
      <span className="card-name">{c.name}</span>
      <span className="card-line">{c.line}</span>
    </NodeViewWrapper>
  );
}

type Props = {
  dom?: DOMProps;
  /** The cards of the moments mentioned (RF4), and their pictures; while writing, a mention is a chip unless it has a picture. */
  mentions?: Record<string, Card>;
  ref?: Ref<JournalHandle>;
  body: string;
  bodyFormat: BodyFormat;
  editable: boolean;
  autoFocus: boolean;
  placeholder: string;
  maxChars: number;
  head: { day: string; line: string };
  palette: Palette;
  /** The body, the words as shown, and the editor's own count of them (the one its limit holds to). */
  onChange: (body: string, shown: string, count: number) => void;
  onFormats: (f: Formats) => void;
  /** @ was typed (the picker opens); the @ stays as typed if nothing is picked (RF1). */
  onMention: () => void;
  onOpenMention: (id: string) => void;
  /** A tap on a picture while writing: the app opens its menu (note pictures NI13). */
  onPictureTap?: (id: string | null) => void;
  /** A tap on the words while reading (NP5). */
  onTapToEdit: () => void;
  /** The head has scrolled away (NP2): the top bar shows its short form. */
  onScrolled: (past: boolean) => void;
};

const formatsOf = (e: Editor): Formats => ({
  h1: e.isActive('heading', { level: 1 }),
  h2: e.isActive('heading', { level: 2 }),
  bold: e.isActive('bold'),
  italic: e.isActive('italic'),
  bullet: e.isActive('bulletList'),
  ordered: e.isActive('orderedList'),
  task: e.isActive('taskList'),
  quote: e.isActive('blockquote'),
});

export default function JournalEditor(props: Props) {
  const { ref } = props;
  const cb = useRef(props);
  useEffect(() => {
    cb.current = props;
  });
  const range = useRef<{ from: number; to: number } | null>(null);
  const [past, setPast] = useState(false);
  const headRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!IS_DOM) return;
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = NOTE_CSP;
    document.head.appendChild(meta);
  }, []);

  const editor = useEditor({
    editable: props.editable,
    immediatelyRender: true,
    autofocus: props.autoFocus && props.editable ? 'end' : false,
    content: toDoc(props.body, props.bodyFormat),
    extensions: [
      ...noteExtensions({
        readOnlyTicks: false,
        mentionView: ReactNodeViewRenderer(MentionView, { as: 'span' }),
        checkboxLabel: (text, checked) => `Checkbox, ${checked ? 'ticked' : 'not ticked'}${text ? `: ${text}` : ''}`,
        mention: {
          HTMLAttributes: { class: 'mention' },
          renderHTML: ({ node }) => ['span', { class: 'mention', 'data-id': String(node.attrs.id), role: 'link', tabindex: '0' }, `@${node.attrs.label ?? 'a moment'}`],
          suggestion: {
            char: '@',
            items: () => [],
            render: () => ({
              onStart: (p) => {
                range.current = p.range;
                cb.current.onMention();
              },
              onUpdate: (p) => {
                range.current = p.range;
              },
            }),
          },
        },
      }),
      Placeholder.configure({ placeholder: props.placeholder }),
      CharacterCount.configure({ limit: props.maxChars }),
    ],
    editorProps: {
      // Being written it is `note-input`; read, `note-text`, so a reply's page over a read note is never confused with it.
      attributes: { 'data-testid': props.editable ? 'note-input' : 'note-text', 'aria-label': 'Note', role: 'textbox', 'aria-multiline': 'true', class: 'page' },
    },
    onUpdate: ({ editor: e }) => cb.current.onChange(toBody(e.getJSON()), e.getText({ blockSeparator: '\n' }), e.storage.characterCount.characters()),
    onSelectionUpdate: ({ editor: e }) => cb.current.onFormats(formatsOf(e)),
    onTransaction: ({ editor: e }) => cb.current.onFormats(formatsOf(e)),
  });

  useEffect(() => {
    editor?.setEditable(props.editable);
  }, [editor, props.editable]);

  useDOMImperativeHandle(ref ?? null, () => ({
    format: (...args) => {
      const kind = args[0] as FormatKind;
      if (!editor) return;
      const c = editor.chain().focus();
      if (kind === 'h1') c.toggleHeading({ level: 1 }).run();
      else if (kind === 'h2') c.toggleHeading({ level: 2 }).run();
      else if (kind === 'body') c.setParagraph().run();
      else if (kind === 'bold') c.toggleBold().run();
      else if (kind === 'italic') c.toggleItalic().run();
      else if (kind === 'bullet') c.toggleBulletList().run();
      else if (kind === 'ordered') c.toggleOrderedList().run();
      else if (kind === 'task') c.toggleTaskList().run();
      else if (kind === 'quote') c.toggleBlockquote().run();
    },
    insertMention: (...args) => {
      const [id, label] = args as [string, string];
      if (!editor) return;
      const at = range.current ?? { from: editor.state.selection.from, to: editor.state.selection.to };
      range.current = null;
      editor.chain().focus().insertContentAt(at, [{ type: 'mention', attrs: { id, label } }, { type: 'text', text: ' ' }]).run();
    },
    focus: () => {
      range.current = null;
      editor?.commands.focus();
    },
    blur: () => {
      editor?.commands.blur();
    },
  }), [editor]);

  const p = props.palette;
  // vision-ok: CSS sizing (an image no wider than its column), not a tally or a score of anything
  const css = `
    .page, .page:focus, .page:focus-visible, [data-testid=note-input]:focus-visible { outline: none !important; }
    .page { font-size: 17px; line-height: 1.5; color: ${p.ink}; min-height: 40vh; padding-bottom: 96px; }
    .page p { margin: 0 0 10px; }
    .page h1 { font-size: 26px; line-height: 1.25; margin: 18px 0 8px; font-weight: 700; }
    .page h2 { font-size: 20px; line-height: 1.3; margin: 16px 0 6px; font-weight: 650; }
    .page ul, .page ol { padding-left: 24px; margin: 0 0 10px; }
    .page ul[data-type=taskList] { list-style: none; padding-left: 0; }
    .page ul[data-type=taskList] > li { display: flex; gap: 10px; align-items: flex-start; }
    .page ul[data-type=taskList] > li > label { flex: 0 0 auto; min-width: 28px; min-height: 28px; display: flex; align-items: center; justify-content: center; }
    .page ul[data-type=taskList] > li > label input { width: 20px; height: 20px; accent-color: ${p.ink}; margin: 0; }
    .page ul[data-type=taskList] > li > label span { display: none; }
    .page ul[data-type=taskList] > li > div { flex: 1; min-width: 0; padding-top: 1px; }
    .page ul[data-type=taskList] > li > div p { margin: 0 0 6px; }
    .page blockquote { margin: 0 0 10px; padding-left: 14px; border-left: 3px solid ${p.muted}; }
    .page .mention { border: 1px solid ${p.edge}; border-radius: 8px; padding: 1px 6px; background: ${p.surface}; white-space: nowrap; cursor: pointer; }
    .page .mention.picture { display: block; width: fit-content; max-width: 100%; margin: 8px 0; padding: 0; border: 0; background: none; white-space: normal; cursor: pointer; }
    .page .pic-frame { position: relative; display: block; line-height: 0; }
    .page .pic-frame img { display: block; max-width: 100%; height: auto; border-radius: 12px; border: 1px solid ${p.edge}; background: ${p.surface}; user-select: none; -webkit-user-select: none; -webkit-user-drag: none; }
    .page .pic-play { position: absolute; inset: 0; margin: auto; width: 44px; height: 44px; border-radius: 22px; background: rgba(0,0,0,.55); }
    .page .pic-play::after { content: ''; position: absolute; left: 17px; top: 12px; border-style: solid; border-width: 10px 0 10px 16px; border-color: transparent transparent transparent #fff; }
    .page .pic-context { display: block; margin-top: 4px; font-size: 13px; line-height: 1.3; color: ${p.muted}; }
    .page .card { display: flex; flex-direction: column; gap: 2px; margin: 8px 0; padding: 8px 10px; border: 1px solid ${p.edge}; border-radius: 12px; background: ${p.surface}; cursor: pointer; white-space: normal; }
    .page .card-name { font-weight: 600; font-size: 15px; }
    .page .card-line { font-size: 13px; color: ${p.muted}; }
    .page .card.gone { color: ${p.muted}; cursor: default; }
    .page p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: ${p.muted}; float: left; height: 0; pointer-events: none; }
  `;
  const root: CSSProperties = { position: 'absolute', inset: 0, overflowY: 'auto', background: p.bg, color: p.ink, fontFamily: '-apple-system, system-ui, Roboto, sans-serif', WebkitTextSizeAdjust: '100%' };
  return (
    <div
      style={root}
      data-testid="note-scroll"
      onScroll={(e) => {
        const h = headRef.current ? headRef.current.offsetHeight : 80;
        const now = e.currentTarget.scrollTop > h;
        if (now !== past) {
          setPast(now);
          cb.current.onScrolled(now);
        }
      }}
      onClick={(e) => {
        const el = e.target as HTMLElement;
        const mention = el.closest('.mention');
        if (mention && !cb.current.editable) {
          cb.current.onOpenMention(mention.getAttribute('data-id') ?? '');
          return;
        }
        // While writing, a tap on a picture is a way to its menu (NI13); a tap elsewhere on the page closes it.
        if (cb.current.editable) {
          if (mention?.classList.contains('picture')) {
            e.preventDefault();
            cb.current.onPictureTap?.(mention.getAttribute('data-id') ?? '');
          } else cb.current.onPictureTap?.(null);
        }
        // A box in the reader is a way in, like the words: it opens the page and ticks nothing (note-pages audit 23).
        if (!cb.current.editable && el.closest('.page')) {
          if (el.closest('label')) e.preventDefault();
          cb.current.onTapToEdit();
        }
      }}
    >
      <style>{css}</style>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 20px 0' }}>
        <header ref={headRef} data-testid="note-head" style={{ marginBottom: 18 }}>
          <h1 role="heading" aria-level={1} style={{ fontSize: 28, lineHeight: 1.2, fontWeight: 700, margin: '0 0 6px', color: p.ink }} data-testid="note-day">{props.head.day}</h1>
          <p style={{ fontSize: 15, margin: 0, color: p.muted }} data-testid="note-line">{props.head.line}</p>
        </header>
        <Cards.Provider value={props.mentions}>
          <Writing.Provider value={props.editable}>
            <EditorContent editor={editor} />
          </Writing.Provider>
        </Cards.Provider>
      </div>
    </div>
  );
}

