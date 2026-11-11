import { forwardRef, useImperativeHandle, useMemo, useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NOTE_MAX, noteText } from '../lib/noteEdit';
import { freshFix, enterPicks } from '../lib/refKeywords';
import { FRESH_FIX_MS } from '../lib/pieceStamp';
import { editRefs, type EditorRef, fromEditor, insertKeyword, insertRef, type KeywordRef, menuQuery, menuStaysOpen, toEditor, typedAt, wordAfterAt } from '../lib/refs';
import type { LngLat } from '../lib/types';
import { refLabel } from '../lib/threads/lines';
import { useKeyboardHeight } from '../lib/threads/useKeyboardHeight';
import { useMomentPool } from './threads/useMomentPool';
import { RefPalette, type RefMenuHandle } from './threads/RefPalette';
import { RefResolve } from './threads/RefResolve';
import { Button, theme } from './ui';

/**
 * Edit a note (QL24): its text prefilled, 500 characters at most as the
 * composer, Save only while something is written (deleting is the menu's
 * Delete). Drawn inside the viewer's Modal, never as a second one (iOS can't
 * present a Modal over a Modal).
 */
/** Back and Escape reach the editor through its host's Modal: the @ picker closes first, then the editor (tend chronicle 1). */
export type NoteEditorHandle = { requestClose(): void };

export const NoteEditor = forwardRef<NoteEditorHandle, {
  body: string;
  onSave: (body: string) => void;
  onClose: () => void;
  title?: string;
  /** The note being written or edited, so @ can mention other moments but never itself (moment references RF1). */
  mention?: {
    self: string | null;
    fix?: { saved: LngLat | null; stamp: LngLat | null };
    /** The last fix the app knows, with when: a new reply may offer place keywords from it only while it is fresh (audit 13). */
    lastFix?: { at: LngLat; t: number } | null;
    t?: number;
    minutesIn?: number | null;
  };
}>(function NoteEditor(props, ref) {
  const insets = useSafeAreaInsets();
  // The web's keyboard is not avoided by KeyboardAvoidingView: rise above it by its height (fix respond-bottom audit 3).
  const keyboard = useKeyboardHeight();
  const pool = useMomentPool();
  const [now] = useState(() => Date.now());
  const wordsOf = (id: string) => {
    const v = pool.byId.get(id);
    return v ? refLabel(v, now) : null;
  };
  // A reference reads as "@" and its words, and goes whole (RF3); what is saved puts its token back.
  const [state, setState] = useState<{ text: string; refs: EditorRef[] }>(() => toEditor(props.body, () => null));
  // Where the "@" was typed, the cursor, and whether "Over there" is being resolved (RK21): the menu is open from the "@" to
  // the cursor, until a space.
  const [picking, setPicking] = useState<number | null>(null);
  const [cursor, setCursor] = useState(0);
  const [resolving, setResolving] = useState(false);
  const menu = useRef<RefMenuHandle>(null);
  const [selection, setSelection] = useState<{ start: number; end: number } | undefined>(undefined);
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  // Dismissed, the @ stays as typed (RF1), and the words with it.
  useImperativeHandle(ref, () => ({ requestClose: () => (resolving ? setResolving(false) : picking != null ? setPicking(null) : props.onClose()) }));
  const query = picking != null ? menuQuery(state.text, picking, cursor) : null;
  const onChange = (next: string) => {
    const edited = editRefs(state.text, next, state.refs);
    setState(edited);
    setSelection(undefined);
    const at = props.mention ? typedAt(state.text, next) : null;
    if (at != null && edited.text === next) {
      setPicking(at);
      setCursor(at + 1);
      return;
    }
    // Typing on: the cursor moves with the text, and a space or a delete past the "@" closes the menu.
    const moved = Math.max(0, cursor + (next.length - state.text.length));
    setCursor(moved);
    if (picking != null && !menuStaysOpen(edited.text, picking, moved, resolving)) setPicking(null);
  };
  // Web: the arrows move the menu's highlight and Enter picks it; with no menu, the field's own keys (RK22).
  const onKeyPress = (e: { nativeEvent: { key: string }; preventDefault?: () => void }) => {
    if (query == null || !menu.current?.hasItems()) return;
    const k = e.nativeEvent.key;
    const composing = !!(e.nativeEvent as { isComposing?: boolean }).isComposing;
    if (k === 'ArrowDown' || k === 'ArrowUp') {
      e.preventDefault?.();
      menu.current.move(k === 'ArrowDown' ? 1 : -1);
    } else if ((k === 'Enter' || k === 'Tab') && enterPicks(query, menu.current.touched(), composing) && menu.current.pickHighlighted()) e.preventDefault?.();
  };
  const [opened] = useState(() => Date.now());
  // The moment's own fix, else the last known one while it is as fresh as the reply's stamp (RK4, RK13, audit 13).
  const savedFix = props.mention?.fix?.saved ?? null;
  const stampFix = props.mention?.fix?.stamp ?? null;
  const lastFix = props.mention?.lastFix ?? null;
  const fix = useMemo(() => ({ saved: savedFix, stamp: stampFix ?? freshFix(lastFix, opened, FRESH_FIX_MS) }), [savedFix, stampFix, lastFix, opened]);
  const putKeyword = (k: KeywordRef) => {
    if (picking == null) return;
    const r = insertKeyword(state.text, picking, state.refs, k, wordAfterAt(state.text, picking));
    setState({ text: r.text, refs: r.refs });
    setSelection({ start: r.cursor, end: r.cursor });
    setPicking(null);
    setResolving(false);
    setCursor(r.cursor);
    input.current?.focus();
  };
  const pick = (id: string) => {
    if (picking == null) return;
    const r = insertRef(state.text, picking, state.refs, id, wordsOf(id), wordAfterAt(state.text, picking));
    setState({ text: r.text, refs: r.refs });
    setSelection({ start: r.cursor, end: r.cursor });
    setPicking(null);
    setCursor(r.cursor);
    input.current?.focus();
  };
  // The 500 characters count what is shown; a reference's token is never cut in two.
  const kept = noteText(state.text) ? fromEditor(state.text, state.refs).trim() : null;
  const save = () => {
    if (kept) props.onSave(kept);
  };
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[StyleSheet.absoluteFill, styles.back, props.mention && styles.backTop, { paddingTop: insets.top + 56, paddingBottom: Platform.OS === 'web' ? keyboard + 16 : 16 }]}
    >
      <View testID="note-editor" style={styles.card} accessibilityViewIsModal>
        <Text style={styles.title} accessibilityRole="header">{props.title ?? 'Edit note'}</Text>
        <TextInput
          testID="note-edit-input"
          autoFocus
          multiline
          ref={input}
          value={state.text}
          onChangeText={onChange}
          onKeyPress={onKeyPress}
          onSelectionChange={(e) => {
            const end = e.nativeEvent.selection.end;
            setCursor(end);
            if (picking != null && !menuStaysOpen(state.text, picking, end, resolving)) setPicking(null);
          }}
          selection={selection}
          placeholder={props.mention ? 'What’s worth remembering? Type @ to mention a place, a time or a moment' : 'What’s worth remembering?'}
          placeholderTextColor={theme.muted}
          accessibilityLabel="Note"
          maxLength={NOTE_MAX}
          style={styles.input}
        />
        <View style={styles.actions}>
          <Button variant="ghost" label="Cancel" onPress={props.onClose} />
          <Button testID="note-edit-save" label="Save" onPress={save} disabled={!kept} />
        </View>
      </View>
      {query != null && (
        // Beside the field, never over it; dismissed, the @ stays as typed (RF1, RK21).
        <RefPalette
          ref={menu}
          pool={pool}
          self={props.mention?.self ?? null}
          fix={fix}
          t={props.mention?.t ?? opened}
          minutesIn={props.mention?.minutesIn ?? null}
          query={query}
          onKeyword={putKeyword}
          onResolve={() => setResolving(true)}
          onMoment={(v) => pick(v.id)}
        />
      )}
      {resolving && (
        <RefResolve
          fix={fix}
          title="Over there"
          onPick={(r) => putKeyword({ key: 'there', word: 'over there', value: r.value, payload: r.payload })}
          onClose={() => {
            setResolving(false);
            input.current?.focus();
          }}
        />
      )}
    </KeyboardAvoidingView>
  );
});

const styles = StyleSheet.create({
  back: { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
  // With the @ menu the card is pinned near the top, so it never moves as the menu changes size (audit 22).
  backTop: { justifyContent: 'flex-start' },
  card: { backgroundColor: theme.surface, borderRadius: theme.radius, padding: 16, gap: 12, maxWidth: 520, width: '100%', alignSelf: 'center' },
  title: { fontSize: 17, fontWeight: '600', color: theme.ink },
  input: {
    minHeight: 120, maxHeight: 260, borderWidth: 1.5, borderColor: theme.edge, borderRadius: 10, padding: 10,
    fontSize: 16, color: theme.ink, textAlignVertical: 'top',
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
