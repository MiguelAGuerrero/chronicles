import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Slot, SlotId } from '../../lib/journal/actions';
import { Icon, type IconName } from '../icons';
import { theme } from '../ui';

/** Each slot's glyph: a symbol people already know, never the two-card stack mark (decision 0196, SW1). */
const GLYPH: Record<SlotId, IconName> = {
  react: 'happy-outline',
  respond: 'arrow-undo-outline',
  thread: 'link-outline',
  edit: 'create-outline',
  stack: 'arrow-up-circle-outline',
};

/**
 * The quick-action row under an entry (decision 0196, SW1): four fixed slots in ink, 44 pt each, an icon with a one-word caption and a spoken name. A slot that does not apply is empty and moves no other. It decides nothing: `slots` comes from core.
 */
export function QuickActions(props: { slots: Slot[]; onPress: (id: SlotId) => void }) {
  return (
    <View style={styles.row} testID="quick-actions" accessibilityRole="toolbar">
      {props.slots.map((s) =>
        s.available ? (
          <Pressable key={s.id} testID={`quick-${s.id}`} accessibilityRole="button" accessibilityLabel={s.label} onPress={() => props.onPress(s.id)} style={({ pressed }) => [styles.slot, pressed && styles.dim]}>
            <Icon name={GLYPH[s.id]} size={22} color={theme.ink} />
            <Text style={styles.caption} numberOfLines={1}>{s.caption}</Text>
          </Pressable>
        ) : (
          <View key={s.id} style={styles.slot} />
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  // A slot is 44 pt at the least; five captions fit in 320 px (SW18).
  slot: { flex: 1, minWidth: 44, height: 52, alignItems: 'center', justifyContent: 'center', gap: 2 },
  caption: { color: theme.ink, fontSize: 11, lineHeight: 14 },
  dim: { opacity: 0.5 },
});
