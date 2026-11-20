import { StyleSheet, Text, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { Button, theme } from './ui';

/**
 * The walk's-end question about offered gaps (Filling gaps, G15): keep every
 * likely way, or leave them to be decided from their cards. Said in words,
 * never a count; asked once, on the first replay.
 *
 * It floats over the map above the card's sheet, or, where that would leave
 * the walk no room (`lib/replay` `keepAskPlace`, replay-ceremony ui 11), it is
 * `inline`: the sheet's own first block, the same words and the same two
 * buttons, with nothing over the map.
 */
export function KeepGapsCard(props: {
  words: { title: string; sub: string; keep: string; leave: string };
  onKeep: () => void;
  onLeave: () => void;
  busy?: boolean;
  error?: string | null;
  /** Inside the card's sheet, not over the map. */
  inline?: boolean;
  /** The card's own box, once laid out: the screen decides where to ask from its height. */
  onLayout?: (e: LayoutChangeEvent) => void;
  /** Laid out to be measured and not yet asked: no hand, key or screen reader reaches it. */
  unseen?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const body = (
    <View testID="keep-gaps-card" style={props.inline ? styles.block : styles.card} accessibilityLiveRegion={props.unseen ? 'none' : 'polite'} onLayout={props.onLayout}>
      <Text style={styles.title} accessibilityRole="header">{props.words.title}</Text>
      <Text style={styles.sub}>{props.words.sub}</Text>
      {props.error ? <Text testID="keep-gaps-error" style={styles.error} accessibilityLiveRegion="polite">{props.error}</Text> : null}
      <View style={styles.actions}>
        <Button testID="keep-gaps" variant="secondary" label={props.words.keep} onPress={props.onKeep} busy={props.busy} busyLabel="Saving…" />
        <Button testID="leave-gaps" variant="secondary" label={props.words.leave} onPress={props.onLeave} disabled={props.busy} />
      </View>
    </View>
  );
  if (props.inline) return body;
  return (
    <View
      style={[styles.row, props.style]}
      pointerEvents={props.unseen ? 'none' : 'box-none'}
      accessibilityElementsHidden={props.unseen}
      importantForAccessibility={props.unseen ? 'no-hide-descendants' : 'auto'}
      aria-hidden={props.unseen}
    >
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { position: 'absolute', left: 12, right: 12, alignItems: 'center' },
  card: {
    backgroundColor: theme.surface, borderRadius: theme.radius, padding: 14, gap: 10, width: '100%', maxWidth: 520,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6,
  },
  // In the sheet: the sheet is its ground; a rule under it keeps it apart from the card's own lines.
  block: { gap: 10, paddingBottom: 14, marginBottom: 4, borderBottomWidth: 1.5, borderBottomColor: theme.edge },
  title: { fontSize: 16, fontWeight: '700', color: theme.ink },
  sub: { fontSize: 14, color: theme.muted },
  error: { fontSize: 14, color: theme.danger },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
});
