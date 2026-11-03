import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NOTE_MAX, noteText } from '../lib/noteEdit';
import { Button, theme } from './ui';

/**
 * Edit a note (QL24): its text prefilled, 500 characters at most as the
 * composer, Save only while something is written (deleting is the menu's
 * Delete). Drawn inside the viewer's Modal, never as a second one (iOS can't
 * present a Modal over a Modal).
 */
export function NoteEditor(props: { body: string; onSave: (body: string) => void; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState(props.body);
  const kept = noteText(text);
  const save = () => {
    if (kept) props.onSave(kept);
  };
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[StyleSheet.absoluteFill, styles.back, { paddingTop: insets.top + 56 }]}
    >
      <View testID="note-editor" style={styles.card} accessibilityViewIsModal>
        <Text style={styles.title} accessibilityRole="header">Edit note</Text>
        <TextInput
          testID="note-edit-input"
          autoFocus
          multiline
          value={text}
          onChangeText={setText}
          placeholder="What’s worth remembering?"
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
