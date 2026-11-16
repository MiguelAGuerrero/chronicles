import { Pressable, StyleSheet, Text, View } from 'react-native';
import { failedLine, retryLabel, shownOn, type LineHost } from '../lib/diagnostics/core';
import { failedSaves, hideFailed, retryFailed } from '../lib/diagnostics/sink';
import { space } from '../lib/space';
import { useStore } from '../lib/useStore';
import { theme } from './ui';

/**
 * The room left, in words, in the pills beside the capture buttons (SA3, SA10): the same ink pill as the
 * others at every level, with no icon, colour, haptic or motion of its own (SA7), and a dismiss (SA6).
 */
export function SpaceLine({ host }: { host: LineHost }) {
  const line = useStore(space.store, (s) => s.line);
  return (
    <>
      <SaveFailedLine host={host} />
      {line ? <RoomLine line={line} /> : null}
    </>
  );
}

function RoomLine({ line }: { line: string }) {
  return (
    <View testID="space-line" style={styles.pill} accessibilityLiveRegion="polite">
      <Text style={styles.text}>{line}</Text>
      <Pressable testID="space-dismiss" accessibilityRole="button" accessibilityLabel="Dismiss" onPress={() => space.dismiss()} hitSlop={10} style={styles.btn}>
        <Text style={styles.btnText}>OK</Text>
      </Pressable>
    </View>
  );
}

/**
 * Saves of the walker's that failed, in one line in words with Retry (EH7, decision 0179): the same ink pill, in the
 * same place, beside the capture buttons and never over them (EH14); no count, no alarm, announced politely (EH13).
 * Each host shows the failures of its screen (errors-handled audit 7); on the walk, Hide sets the line aside until
 * something new fails or the walk ends (audit 15).
 */
export function SaveFailedLine({ host }: { host: LineHost }) {
  const list = useStore(failedSaves, (s) => s.list);
  const hiddenAt = useStore(failedSaves, (s) => s.hiddenAt);
  const shown = shownOn(list, host, hiddenAt);
  const line = failedLine(shown);
  if (!line) return null;
  return (
    <View testID="save-failed-line" style={styles.pill} accessibilityLiveRegion="polite">
      <Text style={styles.text}>{line}</Text>
      <Pressable testID="save-failed-retry" accessibilityRole="button" accessibilityLabel={retryLabel(shown)} onPress={() => void retryFailed()} hitSlop={10} style={styles.btn}>
        <Text style={styles.btnText}>Retry</Text>
      </Pressable>
      {host === 'walk' ? (
        <Pressable testID="save-failed-hide" accessibilityRole="button" accessibilityLabel="Hide until something else isn’t saved" onPress={hideFailed} hitSlop={10} style={styles.btn}>
          <Text style={styles.btnText}>Hide</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.ink, borderRadius: 22, paddingVertical: 6, paddingLeft: 14, paddingRight: 6, maxWidth: 360 },
  text: { color: '#ffffff', fontSize: 15, fontWeight: '600', flexShrink: 1 },
  btn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)' },
  btnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
});
