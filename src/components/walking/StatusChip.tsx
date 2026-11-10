import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../ui';
import type { Problem } from './useRecorderStatus';

/** The status chip: only when something is wrong. Not recording is a button (QL19); the rest is plain text. */
export function StatusChip(props: { problem: Problem | null; error: boolean; onWhy: () => void }) {
  const { problem } = props;
  if (!problem) return null;
  if (props.error) {
    // Not recording is a button: its tap brings the recorder's notice back (why, and on a
    // phone Open Settings) after it was dismissed (QL19).
    return (
      <Pressable
        testID="status-chip"
        accessibilityRole="button"
        accessibilityLabel="Not recording. Why?"
        onPress={props.onWhy}
        style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
      >
        <View style={[styles.statusDot, { backgroundColor: problem.color }]} />
        <Text style={styles.chipText}>{problem.label}</Text>
      </Pressable>
    );
  }
  return (
    <View style={styles.chip} accessible accessibilityLabel={problem.label} accessibilityLiveRegion="polite">
      <View style={[styles.statusDot, { backgroundColor: problem.color }]} />
      <Text style={styles.chipText}>{problem.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.surface, borderRadius: 999,
    paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.line,
  },
  chipPressed: { opacity: 0.8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  chipText: { color: theme.ink, fontWeight: '600', fontSize: 14 },
});
