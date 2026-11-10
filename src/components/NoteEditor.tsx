import { useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NOTE_MAX, noteText } from '../lib/noteEdit';
import { editRefs, type EditorRef, fromEditor, insertRef, toEditor, typedAt } from '../lib/refs';
import { refLabel } from '../lib/threads/lines';
import { useMomentPool } from './threads/useMomentPool';
import { MomentPicker } from './threads/MomentPicker';
import { Button, theme } from './ui';

/**
 * Edit a note (QL24): its text prefilled, 500 characters at most as the
 * composer, Save only while something is written (deleting is the menu's
 * Delete). Drawn inside the viewer's Modal, never as a second one (iOS can't
 * present a Modal over a Modal).
 */
export function NoteEditor(props: {
  body: string;
  onSave: (body: string) => void;
  onClose: () => void;
  title?: string;
  /** The note being written or edited, so @ can mention other moments but never itself (moment references RF1). */
  mention?: { self: string | null };
}) {
  const insets = useSafeAreaInsets();
  const pool = useMomentPool();
  const [now] = useState(() => Date.now());
  const wordsOf = (id: string) => {
    const v = pool.byId.get(id);
    return v ? refLabel(v, now) : null;
  };
  // A reference reads as "@" and its words, and goes whole (RF3); what is saved puts its token back.
  const [state, setState] = useState<{ text: string; refs: EditorRef[] }>(() => toEditor(props.body, () => null));
  const [picking, setPicking] = useState<number | null>(null);
  const [selection, setSelection] = useState<{ start: number; end: number } | undefined>(undefined);
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const onChange = (next: string) => {
    const edited = editRefs(state.text, next, state.refs);
    setState(edited);
    setSelection(undefined);
    const at = props.mention ? typedAt(state.text, next) : null;
    if (at != null && edited.text === next) setPicking(at);
  };
  const pick = (id: string) => {
    if (picking == null) return;
    const r = insertRef(state.text, picking, state.refs, id, wordsOf(id));
    setState({ text: r.text, refs: r.refs });
    setSelection({ start: r.cursor, end: r.cursor });
    setPicking(null);
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
      style={[StyleSheet.absoluteFill, styles.back, { paddingTop: insets.top + 56 }]}
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
          selection={selection}
          placeholder={props.mention ? 'What’s worth remembering? Type @ to mention a moment' : 'What’s worth remembering?'}
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
      {picking != null && (
        // Dismissed, the @ stays as typed (RF1).
        <MomentPicker pool={pool} self={props.mention?.self ?? null} title="Mention a moment" onPick={(v) => pick(v.id)} onClose={() => setPicking(null)} />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  back: { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
  card: { backgroundColor: theme.surface, borderRadius: theme.radius, padding: 16, gap: 12, maxWidth: 520, width: '100%', alignSelf: 'center' },
  title: { fontSize: 17, fontWeight: '600', color: theme.ink },
  input: {
    minHeight: 120, maxHeight: 260, borderWidth: 1.5, borderColor: theme.edge, borderRadius: 10, padding: 10,
    fontSize: 16, color: theme.ink, textAlignVertical: 'top',
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
