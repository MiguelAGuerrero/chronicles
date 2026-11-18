// @layer view
import { forwardRef, type ComponentRef } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { moveMapLabel, showHereLabel } from '../../lib/atlas/freeLook';
import { Icon } from '../icons';
import { theme } from '../ui';

/**
 * Free look (FL2, FL5): the Move map toggle in Locate's column, a pill that loads the areas around the map's middle, and a small
 * mark at that middle. The toggle is a button that behaves like a toggle (matrix 14, outside a list); its state is a fill and a
 * pressed state for a screen reader, never colour alone. The pill and the mark are there only while Move map is on.
 */
export const MoveMapToggle = forwardRef<ComponentRef<typeof Pressable>, { on: boolean; onPress: () => void; bottom: number; right?: number }>(function MoveMapToggle(props, ref) {
  const { width } = useWindowDimensions();
  const right = props.right ?? Math.max(12, (width - 640) / 2 + 12);
  const words = moveMapLabel(props.on);
  return (
    <Pressable
      ref={ref}
      testID="atlas-move-map"
      accessibilityRole="button"
      accessibilityLabel={words.label}
      accessibilityHint={words.hint}
      accessibilityState={{ selected: words.pressed }}
      {...({ 'aria-pressed': words.pressed } as object)}
      onPress={props.onPress}
      style={({ pressed }) => [styles.edgeBtn, { right, bottom: props.bottom }, props.on && styles.on, pressed && styles.pressed]}
    >
      <Icon name={props.on ? 'move' : 'move-outline'} size={22} color={props.on ? theme.surface : theme.ink} />
    </Pressable>
  );
});

/** "Show areas here": low on the map, in the bottom-left stack above the Towns pill (`exploreSlots`). */
export function ShowAreasPill(props: { onPress: () => void; bottom: number }) {
  return (
    <Pressable
      testID="atlas-show-here"
      accessibilityRole="button"
      accessibilityLabel={showHereLabel()}
      onPress={props.onPress}
      style={({ pressed }) => [styles.pill, { bottom: props.bottom }, pressed && styles.pressed]}
    >
      <Text style={styles.pillText} numberOfLines={1}>{showHereLabel()}</Text>
    </Pressable>
  );
}

/** A small cross at the map's own middle, which is where Show areas here reads (FL5). It takes no touch. */
export function CentreMark() {
  return (
    <View testID="atlas-centre-mark" pointerEvents="none" style={styles.markWrap}>
      <View style={styles.markH} />
      <View style={styles.markV} />
    </View>
  );
}

const styles = StyleSheet.create({
  edgeBtn: {
    position: 'absolute', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.edge,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 3,
  },
  on: { backgroundColor: theme.ink, borderColor: theme.ink },
  pressed: { opacity: 0.8 },
  pill: {
    position: 'absolute', left: 12, flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, maxWidth: 240,
    paddingLeft: 12, paddingRight: 16, borderRadius: 999, backgroundColor: theme.surface,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 5,
  },
  pillText: { fontSize: 15, fontWeight: '600', color: theme.ink, flexShrink: 1 },
  markWrap: { position: 'absolute', top: '50%', left: '50%', width: 0, height: 0, alignItems: 'center', justifyContent: 'center' },
  // A light edge round the ink keeps 3:1 on dark ground too (free-look ui 6).
  markH: { position: 'absolute', width: 24, height: 4, borderRadius: 2, backgroundColor: theme.ink, borderWidth: 1, borderColor: '#ffffff' },
  markV: { position: 'absolute', width: 4, height: 24, borderRadius: 2, backgroundColor: theme.ink, borderWidth: 1, borderColor: '#ffffff' },
});
