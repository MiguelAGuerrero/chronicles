import { StyleSheet, Text, View } from 'react-native';
import { WalkBandIcon } from '../WalkBandIcon';
import { theme } from '../ui';

/** The heads-up line in the pills (WK15): quiet, no sound, no haptic, nothing to press, and it never touches the route (WK16). */
export function HeadsUpLine(props: { line: string | null; show: boolean }) {
  if (!props.line || !props.show) return null;
  return (
    <View testID="walk-ahead" pointerEvents="none" style={styles.ahead} accessibilityLiveRegion="polite">
      <WalkBandIcon band="car" size={20} />
      <Text style={styles.aheadText}>{props.line}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ahead: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: 360, backgroundColor: theme.glass, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.line },
  aheadText: { color: theme.ink, fontSize: 14, flexShrink: 1 },
});
