import { forwardRef, useImperativeHandle, useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NOTE_MAX, noteText } from '../lib/noteEdit';
import { NOTE_TYPES, noteTypeOf, type NoteType } from '../lib/noteType';
import { editRefs, type EditorRef, fromEditor, insertRef, toEditor, typedAt } from '../lib/refs';
import { refLabel } from '../lib/threads/lines';
import { useKeyboardHeight } from '../lib/threads/useKeyboardHeight';
import { useMomentPool } from './threads/useMomentPool';
import { MomentPicker } from './threads/MomentPicker';
import { Icon, type IconName } from './icons';
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
  /** `type` is the chosen type when the owner changed it (null: "No type"), else undefined: the note's type stands (NY7, NY8). */
  onSave: (body: string, type?: NoteType | null) => void;
  /** The note's type as stored: with it the editor offers the Type row (NY6); a note being written in Respond has none to offer (NY15). */
  type?: string | null;
  onClose: () => void;
  title?: string;
  /** The note being written or edited, so @ can mention other moments but never itself (moment references RF1). */
  mention?: { self: string | null };
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
  const [picking, setPicking] = useState<number | null>(null);
  const [selection, setSelection] = useState<{ start: number; end: number } | undefined>(undefined);
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  // Dismissed, the @ stays as typed (RF1), and the words with it.
  useImperativeHandle(ref, () => ({ requestClose: () => (picking != null ? setPicking(null) : props.onClose()) }));
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
  // The Type row: a menu of the eight and "No type", opened in place (inside the viewer's Modal, never a second one).
  const start = noteTypeOf(props.type);
  const [chosen, setChosen] = useState<NoteType | null>(start);
  const [typeMenu, setTypeMenu] = useState(false);
  const shown = NOTE_TYPES.find((t) => t.id === chosen) ?? null;
  const save = () => {
    if (kept) props.onSave(kept, chosen !== start ? chosen : undefined);
  };
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[StyleSheet.absoluteFill, styles.back, { paddingTop: insets.top + 56, paddingBottom: Platform.OS === 'web' ? keyboard + 16 : 16 }]}
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
        {props.type !== undefined && (
          <View>
            <Pressable
              testID="note-type-row"
              accessibilityRole="button"
              accessibilityLabel={`Type, ${shown ? shown.name : 'No type'}`}
              accessibilityState={{ expanded: typeMenu }}
              onPress={() => setTypeMenu((o) => !o)}
              style={styles.typeRow}
            >
              <Text style={styles.typeLabel}>Type</Text>
              {shown && <Icon name={shown.glyph as IconName} size={20} color={theme.ink} />}
              <Text style={styles.typeValue}>{shown ? shown.name : 'No type'}</Text>
            </Pressable>
            {typeMenu && (
              <View testID="note-type-menu" style={styles.menu} accessibilityRole="radiogroup">
                {[{ id: null, glyph: null, name: 'No type' }, ...NOTE_TYPES].map((t) => (
                  <Pressable
                    key={t.id ?? 'none'}
                    testID={`note-type-item-${t.id ?? 'none'}`}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: chosen === t.id }}
                    accessibilityLabel={t.name}
                    onPress={() => {
                      setChosen(t.id);
                      setTypeMenu(false);
                    }}
                    style={styles.item}
                  >
                    <View style={styles.itemGlyph}>
                      {t.glyph ? <Icon name={t.glyph as IconName} size={22} color={theme.ink} testID={`note-type-glyph-${t.id}`} /> : null}
                    </View>
                    <Text style={styles.itemName}>{t.name}</Text>
                    {chosen === t.id && <Icon name="checkmark" size={18} color={theme.ink} />}
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}
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
});

const styles = StyleSheet.create({
  back: { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
  card: { backgroundColor: theme.surface, borderRadius: theme.radius, padding: 16, gap: 12, maxWidth: 520, width: '100%', alignSelf: 'center' },
  title: { fontSize: 17, fontWeight: '600', color: theme.ink },
  input: {
    minHeight: 120, maxHeight: 260, borderWidth: 1.5, borderColor: theme.edge, borderRadius: 10, padding: 10,
    fontSize: 16, color: theme.ink, textAlignVertical: 'top',
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, borderTopWidth: 1, borderTopColor: theme.line },
  typeLabel: { fontSize: 15, color: theme.muted, flexGrow: 1 },
  typeValue: { fontSize: 15, color: theme.ink },
  // Nine entries in two columns: all of them in view at once, five rows of 44 (nothing hidden behind a scroll).
  menu: { flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1, borderColor: theme.line, borderRadius: 10, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 10, width: '50%' },
  itemGlyph: { width: 24, alignItems: 'center' },
  itemName: { fontSize: 16, color: theme.ink, flexGrow: 1 },
});
