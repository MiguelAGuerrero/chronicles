import { Pressable, StyleSheet, Text, View } from 'react-native';
import { space } from '../lib/space';
import { useStore } from '../lib/useStore';
import { theme } from './ui';

/**
 * The room left, in words, in the pills beside the capture buttons (SA3, SA10): the same ink pill as the
 * others at every level, with no icon, colour, haptic or motion of its own (SA7), and a dismiss (SA6).
 */
export function SpaceLine() {
  const line = useStore(space.store, (s) => s.line);
  if (!line) return null;
  return (
    <View testID="space-line" style={styles.pill} accessibilityLiveRegion="polite">
      <Text style={styles.text}>{line}</Text>
      <Pressable testID="space-dismiss" accessibilityRole="button" accessibilityLabel="Dismiss" onPress={() => space.dismiss()} hitSlop={10} style={styles.btn}>
        <Text style={styles.btnText}>OK</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.ink, borderRadius: 22, paddingVertical: 6, paddingLeft: 14, paddingRight: 6, maxWidth: 360 },
  text: { color: '#ffffff', fontSize: 15, fontWeight: '600', flexShrink: 1 },
  btn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)' },
  btnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
});
