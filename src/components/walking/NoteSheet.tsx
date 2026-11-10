import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Modal } from '../Modal';
import { Button, theme } from '../ui';
import type { WalkCaptures } from './useWalkCaptures';

/** A line about here: the walk's note. Every way out keeps the draft; only Save clears it. */
export function NoteSheet(props: { captures: WalkCaptures; top: number }) {
  const { note, cap } = props.captures;
  return (
    <Modal visible={note.open} transparent animationType="fade" onRequestClose={() => note.setOpen(false)}>
      {/* Every way out keeps the draft; only Save clears it. */}
      <Pressable style={styles.modalBack} onPress={() => note.setOpen(false)} accessibilityLabel="Close note">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.modalWrap, { paddingTop: props.top + 56 }]}>
          <Pressable style={styles.modal} onPress={() => {}} accessible={false}>
            <Text style={styles.modalTitle} accessibilityRole="header">A line about here</Text>
            <TextInput
              testID="note-input"
              autoFocus
              multiline
              value={note.text}
              onChangeText={note.setText}
              placeholder="What caught your eye?"
              placeholderTextColor={theme.muted}
              accessibilityLabel="Note"
              returnKeyType="done"
              submitBehavior="blurAndSubmit"
              onSubmitEditing={note.save}
              maxLength={500}
              style={styles.input}
            />
            <View style={styles.modalRow}>
              <Button variant="ghost" label="Close" onPress={() => note.setOpen(false)} />
              <Button testID="note-save" label="Save" onPress={note.save} busy={cap.busy === 'text'} disabled={!note.text.trim()} />
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  modalWrap: { flex: 1, justifyContent: 'flex-start', paddingHorizontal: 16 },
  modal: { backgroundColor: theme.surface, borderRadius: theme.radius, padding: 16, gap: 12, maxWidth: 520, width: '100%', alignSelf: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '600', color: theme.ink },
  input: { minHeight: 90, borderWidth: 1.5, borderColor: theme.edge, borderRadius: 12, padding: 12, fontSize: 16, color: theme.ink, textAlignVertical: 'top' },
  modalRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
