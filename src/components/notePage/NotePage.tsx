import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { AppState, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NOTE_MAX } from '../../lib/noteEdit';
import { closable, startSave, stepSave, type SaveEffect, type SaveEvent } from '../../lib/notePage/autosave';
import type { NoteHead } from '../../lib/notePage/head';
import { fits, roomOfCount } from '../../lib/notePage/room';
import type { BodyFormat } from '../../lib/notePage/schema';
import { refLabel } from '../../lib/threads/lines';
import { useKeyboardHeight } from '../../lib/threads/useKeyboardHeight';
import { Icon } from '../icons';
import { MomentPicker } from '../threads/MomentPicker';
import { useMomentPool } from '../threads/useMomentPool';
import { theme } from '../ui';
import { useMentionCards } from './useMentionCards';
import JournalEditor, { type FormatKind, type Formats, type JournalHandle, type Palette } from './JournalEditor';

/** How a page keeps what is written (NP9): a new note becomes a moment once it has words; then it is saved; left empty, it goes. */
export type NoteStore = {
  kept: boolean;
  create: (body: string) => Promise<void>;
  save: (body: string) => Promise<void>;
  remove: () => void;
};

/** A new note's store over the screen's own captures (NP1): kept by `keep`, then saved by its ids. */
export function newNoteStore(keep: (body: string) => Promise<{ id: string; piece_id: string } | null>, setNote: (ids: { id: string; piece_id: string }, body: string) => Promise<void>, remove: (ids: { id: string; piece_id: string }) => void): NoteStore {
  let ids: { id: string; piece_id: string } | null = null;
  return {
    kept: false,
    async create(body) {
      const k = await keep(body);
      if (!k) throw new Error('The note was not kept.');
      ids = k;
    },
    async save(body) {
      if (!ids) throw new Error('The note is not kept yet.');
      await setNote(ids, body);
    },
    remove() {
      if (ids) remove(ids);
    },
  };
}

export const PALETTE: Palette = { ink: theme.ink, muted: theme.muted, line: theme.line, edge: theme.edge, bg: theme.surface, surface: theme.bg };
export const PLACEHOLDER = 'Start writing';

/** The page's saving (NP9): `autosave.ts`'s reducer, its effects run through the store, a pause read every quarter second. */
function useAutosave(store: NoteStore, initial: string) {
  const [first] = useState(() => startSave({ kept: store.kept, body: initial, now: Date.now() }));
  const state = useRef(first);
  const storeRef = useRef(store);
  const alive = useRef(true);
  const [failed, setFailed] = useState(false);
  const runRef = useRef<(e: SaveEvent) => void>(() => {});
  // Left, the page closes once nothing is in flight; a failure keeps it open with its words (note-pages audit 4).
  const closeWhenKept = useRef<(() => void) | null>(null);
  useEffect(() => {
    storeRef.current = store;
    const exec = (fx: SaveEffect) => {
      const s = storeRef.current;
      if (fx.type === 'delete') return s.remove();
      const done = fx.type === 'create' ? s.create(fx.body) : s.save(fx.body);
      done.then(() => runRef.current({ type: 'saved', text: fx.body }), () => runRef.current({ type: 'failed' }));
    };
    runRef.current = (e) => {
      const r = stepSave(state.current, e);
      state.current = r.state;
      if (alive.current) setFailed(r.state.failed);
      r.effects.forEach(exec);
      const close = closeWhenKept.current;
      if (close && closable(state.current)) {
        closeWhenKept.current = null;
        close();
      } else if (close && state.current.failed) closeWhenKept.current = null;
    };
  });
  useEffect(() => {
    alive.current = true;
    const tick = setInterval(() => runRef.current({ type: 'tick', now: Date.now() }), 250);
    const app = AppState.addEventListener('change', (s) => {
      if (s === 'background' || s === 'inactive') runRef.current({ type: 'background' });
    });
    return () => {
      alive.current = false;
      clearInterval(tick);
      app.remove();
      // Every way out keeps what is written (NP9), a host that closes the page too.
      if (!state.current.leaving) runRef.current({ type: 'leave' });
    };
  }, []);
  return {
    failed,
    edit: (text: string) => runRef.current({ type: 'edit', text, now: Date.now() }),
    /** Leaves: `close` runs once what is written is kept, or at once if nothing needs keeping; never after a failure. */
    leave: (close: () => void) => {
      closeWhenKept.current = close;
      runRef.current({ type: 'leave' });
    },
  };
}

const PANEL: { kind: FormatKind; label: string; glyph: string; on: (f: Formats) => boolean }[][] = [
  [
    { kind: 'h1', label: 'Heading', glyph: 'Heading', on: (f) => f.h1 },
    { kind: 'h2', label: 'Subheading', glyph: 'Subheading', on: (f) => f.h2 },
    { kind: 'body', label: 'Body', glyph: 'Body', on: (f) => !f.h1 && !f.h2 },
  ],
  [
    { kind: 'bold', label: 'Bold', glyph: 'B', on: (f) => f.bold },
    { kind: 'italic', label: 'Italic', glyph: 'I', on: (f) => f.italic },
    { kind: 'bullet', label: 'Bulleted list', glyph: '•', on: (f) => f.bullet },
    { kind: 'ordered', label: 'Numbered list', glyph: '1.', on: (f) => f.ordered },
    { kind: 'task', label: 'Checklist', glyph: '☐', on: (f) => f.task },
    { kind: 'quote', label: 'Quote', glyph: '❝', on: (f) => f.quote },
  ],
];
const NONE: Formats = { h1: false, h2: false, bold: false, italic: false, bullet: false, ordered: false, task: false, quote: false };

export type NotePageHandle = { requestClose(): void };

/** One of the page's tools: 44 pt, named, and pressed or not where it toggles (NP4); the bar's say their name (note-pages audit 21). */
function Tool(props: { testID: string; label: string; caption?: string; onPress: () => void; on?: boolean; disabled?: boolean; children: React.ReactNode }) {
  return (
    <Pressable
      testID={props.testID}
      accessibilityRole="button"
      accessibilityLabel={props.label}
      accessibilityState={{ selected: props.on, disabled: props.disabled }}
      aria-pressed={props.on}
      disabled={props.disabled}
      onPress={props.onPress}
      style={({ pressed }) => [styles.tool, props.caption != null && styles.toolCaptioned, props.on && styles.toolOn, (pressed || props.disabled) && styles.dim]}
    >
      {props.children}
      {props.caption != null ? <Text style={styles.caption}>{props.caption}</Text> : null}
    </Pressable>
  );
}

/**
 * A note's page (NP1-NP14, decision 0151), in Apple Journal's manner: the day and the moment's context at its head,
 * the words under them, kept as they are written. Done is the one way out, and keeps (so do Escape and Back; note-pages
 * audit 19). Aa opens the format panel, @
 * the moment picker, the camera (where the page was opened to capture) a photo kept as its own moment and mentioned.
 * Drawn inside whichever Modal is open, never as a Modal of its own (iOS: no Modal over a Modal).
 */
export const NotePage = forwardRef<NotePageHandle, {
  body: string;
  bodyFormat: BodyFormat;
  head: NoteHead;
  store: NoteStore;
  onClose: () => void;
  /** The moment the page belongs to, so @ never mentions it. */
  self: string | null;
  onCamera?: () => Promise<{ id: string; label: string } | null>;
}>(function NotePage(props, ref) {
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();
  const editor = useRef<JournalHandle>(null);
  const save = useAutosave(props.store, props.body);
  const [formats, setFormats] = useState<Formats>(NONE);
  const [panel, setPanel] = useState(false);
  const [picking, setPicking] = useState(false);
  const [past, setPast] = useState(false);
  const [shown, setShown] = useState('');
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const pool = useMomentPool(picking);
  const [now] = useState(() => Date.now());
  // The room line counts what the editor counts, so it says full when the editor takes no more (note-pages audit 8).
  const room = roomOfCount(count);
  const onClose = props.onClose;
  const leave = () => save.leave(onClose);
  useImperativeHandle(ref, () => ({
    requestClose: () => {
      if (picking) setPicking(false);
      else if (panel) setPanel(false);
      else leave();
    },
  }));
  const mention = (id: string, label: string) => {
    if (!fits(shown, label)) return;
    editor.current?.insertMention(id, label);
  };
  const camera = props.onCamera;
  const bottom = Platform.OS === 'web' ? keyboard : 0;
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[StyleSheet.absoluteFill, styles.page]} testID="note-page">
      <View style={[styles.top, { paddingTop: insets.top + 6 }]} testID="note-top">
        <View style={styles.topBtn} />
        <Text style={[styles.short, save.failed && styles.failed]} numberOfLines={1} testID="note-short" accessibilityLiveRegion="polite">
          {save.failed ? 'Not saved yet' : past ? props.head.short : ''}
        </Text>
        <Pressable testID="note-done" accessibilityRole="button" accessibilityLabel="Done" onPress={leave} style={({ pressed }) => [styles.topBtn, styles.topRight, pressed && styles.dim]}>
          <Text style={[styles.topText, styles.done]}>Done</Text>
        </Pressable>
      </View>
      <View style={styles.body}>
        <JournalEditor
          ref={editor}
          dom={{ style: { flex: 1 }, keyboardDisplayRequiresUserAction: false } as never}
          body={props.body}
          bodyFormat={props.bodyFormat}
          editable
          autoFocus
          placeholder={PLACEHOLDER}
          maxChars={NOTE_MAX}
          head={{ day: props.head.day, line: props.head.line }}
          palette={PALETTE}
          onChange={(body, text, n) => {
            setShown(text);
            setCount(n);
            save.edit(body);
          }}
          onFormats={setFormats}
          onMention={() => setPicking(true)}
          onOpenMention={() => {}}
          onTapToEdit={() => {}}
          onScrolled={setPast}
        />
      </View>
      {panel && (
        <View style={styles.panel} testID="note-format-panel" accessibilityRole="toolbar" accessibilityLabel="Format">
          {PANEL.map((row, i) => (
            <ScrollView key={i} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.panelRow}>
              {row.map((b) => (
                <Tool key={b.kind} testID={`note-format-${b.kind}`} label={b.label} on={b.on(formats)} onPress={() => editor.current?.format(b.kind)}>
                  <Text style={[styles.glyph, b.kind === 'bold' && styles.bold, b.kind === 'italic' && styles.italic]}>{b.glyph}</Text>
                </Tool>
              ))}
            </ScrollView>
          ))}
        </View>
      )}
      <View style={[styles.bar, { paddingBottom: (keyboard && Platform.OS !== 'ios' ? 0 : insets.bottom) + 6, marginBottom: bottom }]} testID="note-bar" accessibilityRole="toolbar">
        <Tool testID="note-format" label="Format" caption="Format" on={panel} onPress={() => setPanel((p) => !p)}>
          <Text style={styles.glyph}>Aa</Text>
        </Tool>
        <Tool testID="note-mention" label="Mention a moment" caption="Mention" onPress={() => setPicking(true)}>
          <Text style={styles.glyph}>@</Text>
        </Tool>
        {camera ? (
          <Tool
            testID="note-camera"
            label="Take a photo or video"
            caption="Camera"
            disabled={busy}
            onPress={() => {
              setBusy(true);
              void camera()
                .then((k) => k && mention(k.id, k.label))
                .finally(() => setBusy(false));
            }}
          >
            <Icon name="camera" size={22} color={theme.ink} />
          </Tool>
        ) : null}
        <Text style={styles.room} testID="note-room" accessibilityLiveRegion="polite">{room.line ?? ''}</Text>
      </View>
      {picking && (
        <MomentPicker
          pool={pool}
          self={props.self}
          title="Mention a moment"
          onPick={(v) => {
            setPicking(false);
            mention(v.id, refLabel(v, now));
          }}
          onClose={() => {
            setPicking(false);
            editor.current?.focus();
          }}
        />
      )}
    </KeyboardAvoidingView>
  );
});

/**
 * A note's page read in the viewer (NP5): the same head and drawing, nothing editable; a tap on the words asks to
 * edit, a mention opens its moment, a checkbox changes nothing (the steward's S1, decision 0114).
 */
export function NoteReader(props: { body: string; bodyFormat: BodyFormat; head: NoteHead; onEdit?: () => void; onOpenMention: (id: string) => void }) {
  const mentions = useMentionCards(props.body);
  return (
    <View style={styles.reader} testID="note-reader">
      <JournalEditor
        dom={{ style: { flex: 1 } } as never}
        mentions={mentions}
        body={props.body}
        bodyFormat={props.bodyFormat}
        editable={false}
        autoFocus={false}
        placeholder=""
        maxChars={NOTE_MAX}
        head={{ day: props.head.day, line: props.head.line }}
        palette={PALETTE}
        onChange={() => {}}
        onFormats={() => {}}
        onMention={() => {}}
        onOpenMention={props.onOpenMention}
        onTapToEdit={() => props.onEdit?.()}
        onScrolled={() => {}}
      />
    </View>
  );
}


const styles = StyleSheet.create({
  page: { backgroundColor: theme.surface, zIndex: 10 },
  reader: { flex: 1, backgroundColor: theme.surface, position: 'relative' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingBottom: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.line, backgroundColor: theme.surface },
  topBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44, minWidth: 64, paddingHorizontal: 6 },
  topRight: { justifyContent: 'flex-end' },
  topText: { fontSize: 17, color: theme.ink },
  done: { fontWeight: '600' },
  short: { flex: 1, textAlign: 'center', fontSize: 15, color: theme.muted },
  failed: { color: theme.ink, fontWeight: '600' },
  body: { flex: 1, position: 'relative' },
  panel: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.line, backgroundColor: theme.bg, paddingVertical: 6, gap: 4 },
  panelRow: { paddingHorizontal: 8, gap: 6, alignItems: 'center' },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingTop: 6, borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.line, backgroundColor: theme.surface },
  tool: { minWidth: 44, minHeight: 44, paddingHorizontal: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  toolCaptioned: { minWidth: 64, paddingVertical: 2, gap: 0 },
  caption: { fontSize: 11, color: theme.ink, marginTop: -2 },
  toolOn: { backgroundColor: theme.line, borderWidth: 1.5, borderColor: theme.ink },
  glyph: { fontSize: 17, color: theme.ink, fontWeight: '500' },
  bold: { fontWeight: '800' },
  italic: { fontStyle: 'italic' },
  room: { flex: 1, textAlign: 'right', fontSize: 13, color: theme.muted },
  dim: { opacity: 0.5 },
});
