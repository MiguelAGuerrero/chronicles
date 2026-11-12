import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Modal } from '../Modal';
import { theme } from '../ui';

/** A moment's More menu (RM20): bring it up less, never bring it back, or open it. */
export function MemoryMenu(props: { open: boolean; onClose: () => void; onLess: () => void; onHide: () => void; onOpen: () => void; /** Given for the resurfaced slip (chronicle journal JN20). */ onRelive?: () => void; onAnother?: () => void }) {
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
        <View style={styles.sheet} testID="memory-menu" accessibilityViewIsModal>
          {props.onRelive && item('resurfaced-relive', 'Relive it', 'Replays the walk or the day it came from', props.onRelive)}
          {props.onAnother && item('resurfaced-another', 'Another', 'Brings back a different moment', props.onAnother)}
          {item('menu-less', 'Show less like this', 'Brings this kind of thing up less often', props.onLess)}
          {item('menu-hide', 'Not this one', 'Keeps it, but never brings it back up', props.onHide)}
          {item('menu-open', 'Open the moment', 'Full screen, with its own menu', props.onOpen)}
          <Pressable testID="menu-cancel" accessibilityRole="button" onPress={props.onClose} style={styles.item}>
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
