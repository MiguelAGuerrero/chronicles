import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FORGET_CONFIRM, OFF_LINE } from '../../lib/resurface/copy';
import { Modal } from '../Modal';
import { Button, theme } from '../ui';

/**
 * The menu on Memories' header (MC8-MC10): Hidden, the switch, and Forget my choices, which asks once, in the
 * same sheet (no second Modal), and says what will be offered again.
 */
export function MemoriesMenu(props: { open: boolean; off: boolean; onClose: () => void; onHidden: () => void; onToggle: () => void; onForget: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const close = () => {
    setConfirming(false);
    props.onClose();
  };
  return (
    <Modal visible={props.open} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.back}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessible={false} />
        <View style={styles.sheet} testID="memories-menu-sheet" accessibilityViewIsModal>
          {confirming ? (
            <View style={styles.confirm}>
              <Text style={styles.label}>Forget my choices</Text>
              <Text style={styles.hint} testID="forget-confirm-text">{FORGET_CONFIRM}</Text>
              <View style={styles.row}>
                <Button testID="forget-confirm" label="Forget" onPress={() => { setConfirming(false); props.onForget(); }} />
                <Button label="Cancel" variant="secondary" onPress={() => setConfirming(false)} />
              </View>
            </View>
          ) : (
            <>
              <Pressable testID="menu-hidden" accessibilityRole="button" onPress={() => { setConfirming(false); props.onHidden(); }} style={styles.item}>
                <Text style={styles.label}>Hidden</Text>
                <Text style={styles.hint}>What you hid or asked for less of, to bring back</Text>
              </Pressable>
              <Pressable testID="menu-off" accessibilityRole="switch" accessibilityState={{ checked: !props.off }} onPress={props.onToggle} style={styles.item}>
                <Text style={styles.label}>Bring moments back</Text>
                <Text style={styles.hint}>{props.off ? OFF_LINE : 'On: a moment is brought back at the top'}</Text>
              </Pressable>
              <Pressable testID="menu-forget" accessibilityRole="button" onPress={() => setConfirming(true)} style={styles.item}>
                <Text style={styles.label}>Forget my choices</Text>
                <Text style={styles.hint}>Clears Hidden and your thread names; the switch stays</Text>
              </Pressable>
              <Pressable testID="menu-close" accessibilityRole="button" onPress={close} style={styles.item}>
                <Text style={[styles.label, { color: theme.muted }]}>Close</Text>
              </Pressable>
            </>
          )}
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
  confirm: { padding: 12, gap: 10 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
});
