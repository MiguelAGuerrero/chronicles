import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Modal } from '../Modal';
import { theme } from '../ui';

/** A moment's menu inside one of the owner's threads (OT8): open it, or take it out of this thread (it stays kept). */
export function ThreadMomentMenu(props: { open: boolean; onClose: () => void; onOpen: () => void; onRemove: () => void }) {
  const item = (testID: string, label: string, hint: string, fn: () => void) => (
    <Pressable testID={testID} accessibilityRole="button" onPress={fn} style={styles.item}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.hint}>{hint}</Text>
    </Pressable>
  );
  return (
    <Modal visible={props.open} transparent animationType="fade" onRequestClose={props.onClose}>
      <View style={styles.back}>
        <Pressable style={StyleSheet.absoluteFill} onPress={props.onClose} accessible={false} />
        <View style={styles.sheet} testID="thread-moment-menu" accessibilityViewIsModal>
          {item('thread-menu-open', 'Open the moment', 'Full screen, with Respond and its own menu', props.onOpen)}
          {item('thread-menu-remove', 'Remove from this thread', 'The moment stays kept, and so do its other threads', props.onRemove)}
          <Pressable testID="thread-menu-cancel" accessibilityRole="button" onPress={props.onClose} style={styles.item}>
            <Text style={[styles.label, { color: theme.muted }]}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  back: { flex: 1, backgroundColor: 'rgba(20,24,32,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: theme.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 12, paddingBottom: 24, gap: 2, width: '100%', maxWidth: 640, alignSelf: 'center' },
  item: { minHeight: 52, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  label: { color: theme.ink, fontSize: 16, fontWeight: '600' },
  hint: { color: theme.muted, fontSize: 13 },
});
