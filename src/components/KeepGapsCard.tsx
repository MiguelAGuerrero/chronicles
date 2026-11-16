import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Button, theme } from './ui';

/**
 * The walk's-end question about offered gaps (Filling gaps, G15): keep every
 * likely way, or leave them to be decided from their cards. Said in words,
 * never a count; asked once, on the first replay.
 */
export function KeepGapsCard(props: {
  words: { title: string; sub: string };
  onKeep: () => void;
  onLeave: () => void;
  busy?: boolean;
  error?: string | null;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.row, props.style]} pointerEvents="box-none">
      <View testID="keep-gaps-card" style={styles.card}>
        <Text style={styles.title} accessibilityRole="header">{props.words.title}</Text>
        <Text style={styles.sub}>{props.words.sub}</Text>
        {props.error ? <Text testID="keep-gaps-error" style={styles.error} accessibilityLiveRegion="polite">{props.error}</Text> : null}
        <View style={styles.actions}>
          <Button testID="keep-gaps" label="Keep them" onPress={props.onKeep} busy={props.busy} busyLabel="Saving…" />
          <Button testID="leave-gaps" variant="secondary" label="Leave them" onPress={props.onLeave} disabled={props.busy} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { position: 'absolute', left: 12, right: 12, alignItems: 'center' },
  card: {
    backgroundColor: theme.surface, borderRadius: theme.radius, padding: 14, gap: 10, width: '100%', maxWidth: 520,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6,
  },
  title: { fontSize: 16, fontWeight: '700', color: theme.ink },
  sub: { fontSize: 14, color: theme.muted },
  error: { fontSize: 14, color: theme.danger },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
});
