import { useState } from 'react';
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
 * The quick-action row under an entry (decision 0197, SW1): five fixed slots in ink from the entry's leading edge, 44 to 64 pt each, an icon with a one-word caption and a spoken name. A slot that does not apply is empty and moves no other. It decides nothing: `slots` comes from core.
 */
export function QuickActions(props: { slots: Slot[]; onPress: (id: SlotId) => void }) {
  // How far the first caption sits in from its slot's edge, measured (audit 2, 3): the row reaches left by that much, so
  // the caption starts at the entry's edge whatever the slot's width, the word or the text size.
  // Both are sizes: the web reports a layout only when a box's size changes, never when it only moves.
  const [slotW, setSlotW] = useState(SLOT);
  const [captionW, setCaptionW] = useState(SLOT - 2 * LEAD);
  const lead = Math.max(0, Math.round((slotW - captionW) / 2));
  const first = props.slots.find((s) => s.available)?.id;
  const keep = (set: (f: (was: number) => number) => void) => (e: { nativeEvent: { layout: { width: number } } }) => {
    const w = Math.round(e.nativeEvent.layout.width);
    set((was) => (was === w ? was : w));
  };
  return (
    <View style={[styles.row, { marginLeft: -lead }]} testID="quick-actions" accessibilityRole="toolbar">
      {props.slots.map((s) =>
        s.available ? (
          <Pressable key={s.id} testID={`quick-${s.id}`} accessibilityRole="button" accessibilityLabel={s.label} onPress={() => props.onPress(s.id)} onLayout={s.id === first ? keep(setSlotW) : undefined} style={({ pressed }) => [styles.slot, pressed && styles.dim]}>
            <Icon name={GLYPH[s.id]} size={22} color={theme.ink} />
            {/* A caption grows with the text size only so far (audit 1), as a tab bar's labels do: the slot keeps its
                width and the word stays whole; the button's spoken name carries it at any size. */}
            <Text
              style={styles.caption}
              numberOfLines={1}
              maxFontSizeMultiplier={CAPTION_MAX_SCALE}
              onLayout={s.id === first ? keep(setCaptionW) : undefined}
            >
              {s.caption}
            </Text>
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
/** How far the row reaches left before its first caption is measured: a 64 pt slot centres a caption about 44 px wide. */
const LEAD = (SLOT - 44) / 2;
/** The largest text scale a caption takes (audit 1): "Reaction" at 11 pt times this still fits a 64 pt slot. */
const CAPTION_MAX_SCALE = 1.3;

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  // A slot is 44 pt at the least, the target (SW18; audit 4).
  slot: { width: SLOT, flexShrink: 1, minWidth: 44, height: 52, alignItems: 'center', justifyContent: 'center', gap: 2 },
  caption: { color: theme.ink, fontSize: 11, lineHeight: 14 },
  dim: { opacity: 0.5 },
});
