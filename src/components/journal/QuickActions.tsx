import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Slot, SlotId } from '../../lib/journal/actions';
import { Icon, type IconName } from '../icons';
import { theme } from '../ui';

/** Each slot's glyph: a symbol people already know, never the two-card stack mark (decision 0197, SW1). */
const GLYPH: Record<SlotId, IconName> = {
  react: 'happy-outline',
  respond: 'arrow-undo-outline',
  thread: 'link-outline',
  edit: 'create-outline',
  stack: 'arrow-up-circle-outline',
};

/**
 * The quick-action row under an entry (decision 0197, SW1): five fixed slots in ink from the entry's leading edge, 48 to 64 pt each, an icon with a one-word caption and a spoken name. A slot that does not apply is empty and moves no other. It decides nothing: `slots` comes from core.
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

/**
 * Each slot's width (fix quick-actions-leading, the owner's call, Nov 18): the row sits at the entry's leading edge in
 * slots of one width, so an empty slot is room at the end, not a fifth of the row. Five shrink to fit 320 px (SW18).
 */
const SLOT = 64;
/** How far the row reaches left: a slot centres a caption about 44 px wide, so the first caption starts at the entry's edge. */
const LEAD = (SLOT - 44) / 2;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginLeft: -LEAD },
  // A slot is 48 pt at the least, over the 44 pt target (SW18).
  slot: { width: SLOT, flexShrink: 1, minWidth: 48, height: 52, alignItems: 'center', justifyContent: 'center', gap: 2 },
  caption: { color: theme.ink, fontSize: 11, lineHeight: 14 },
  dim: { opacity: 0.5 },
});
