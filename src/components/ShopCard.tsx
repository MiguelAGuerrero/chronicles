// @layer view
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CLOSE_MIN_PX, cardLines, type Box } from '../lib/shopMarks/card';
import type { Shop } from '../lib/shopMarks/read';
import { Icon } from './icons';
import { theme } from './ui';

/**
 * The Shop marks layer's tap card (SM14-SM16): a shop's name, what it is in words and, only when the map data records it, a
 * chain line. In a fixed place at the map's top, clear of the capture stack, never at the mark; a close control of at least 44 px;
 * no action, no rating, hours, count or id. Inline over the map, never a Modal.
 */
export function ShopCard(props: { place: Shop; onClose: () => void; box?: Box }) {
  const l = cardLines(props.place);
  const b = props.box;
  return (
    <View
      testID="shop-card"
      accessibilityRole="summary"
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${l.name}, ${l.kind}${l.chain ? `, ${l.chain}` : ''}`}
      style={[styles.card, b ? { left: b.x, top: b.y, width: b.w, minHeight: b.h } : styles.free]}
    >
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={2}>{l.name}</Text>
        <Text style={styles.kind}>{l.kind}</Text>
        {l.chain ? <Text style={styles.kind}>{l.chain}</Text> : null}
      </View>
      <Pressable testID="shop-card-close" accessibilityRole="button" accessibilityLabel="Close" onPress={props.onClose} style={styles.close}>
        <Icon name="close" size={22} color={theme.ink} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute', zIndex: 4, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 16, paddingVertical: 8,
    borderRadius: theme.radius, backgroundColor: theme.glass, borderWidth: 1, borderColor: theme.line,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  /** Without a box (Explore's small map): across the top of its pane. */
  free: { left: 12, right: 12, top: 12 },
  text: { flex: 1, gap: 2 },
  name: { color: theme.ink, fontSize: 16, fontWeight: '600' },
  kind: { color: theme.muted, fontSize: 14 },
  close: { width: CLOSE_MIN_PX, height: CLOSE_MIN_PX, alignItems: 'center', justifyContent: 'center' },
});
