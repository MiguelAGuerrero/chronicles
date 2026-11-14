import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../ui';

/**
 * A pill above the journal's bar (out of OpenLine, a file over the size limit; decision 0178): words, and at most
 * one action (Retry, Undo, Settings). Announced politely; never a dialog.
 */
export function BandPill(props: { testID: string; words: string; action?: { label: string; onPress: () => void; testID?: string } }) {
  const { action } = props;
  return (
    <View style={styles.pill} accessibilityLiveRegion="polite" testID={props.testID}>
      <Text style={styles.pillText}>{props.words}</Text>
      {action && (
        <Pressable accessibilityRole="button" onPress={action.onPress} style={styles.pillBtn} testID={action.testID}>
          <Text style={styles.pillBtnText}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { width: '100%', maxWidth: 480, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.ink, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 14, minHeight: 48 },
  pillText: { color: theme.bg, fontSize: 14, flex: 1 },
  pillBtn: { minHeight: 44, minWidth: 44, justifyContent: 'center', paddingHorizontal: 8 },
  pillBtnText: { color: theme.bg, fontSize: 14, fontWeight: '700' },
});
