import { StyleSheet, Text, View } from 'react-native';
import type { IconName } from './icons';
import { Icon } from './icons';

/** A scan's mark on the map: what the pin needs, nothing that tells a wildcard from a match (S4). */
export interface MarkPin {
  id: string;
  at: [number, number];
  /** Within 60 m once: the category icon and the name show (S7). */
  revealed: boolean;
  icon: IconName;
  name: string;
  /** Spoken with the name: "Food & drink". */
  category: string;
}

/** Ink, not a capture colour: a mark is something to find, not something kept. */
export const MARK_COLOR = '#1d2430';
const NAME_WIDTH = 140;

/**
 * A mark: a rounded square (captures are round, places walked are stars) with
 * a "?" until it is revealed, then the category's icon and the name below.
 * Anchored at its bottom, like a capture pin.
 */
export function MarkPinView({ pin }: { pin: MarkPin }) {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={styles.head}>
        {pin.revealed ? <Icon name={pin.icon} size={18} color="#ffffff" /> : <Text style={styles.q}>?</Text>}
      </View>
      <View style={styles.stem} />
      {pin.revealed && (
        <Text style={styles.name} numberOfLines={1}>
          {pin.name}
        </Text>
      )}
    </View>
  );
}

export function markLabel(pin: MarkPin): string {
  return pin.revealed ? `${pin.name}, ${pin.category}. Open` : 'A mark to find. Open';
}

const styles = StyleSheet.create({
  wrap: { width: 36, height: 44, alignItems: 'center', overflow: 'visible' },
  head: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: MARK_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  q: { color: '#ffffff', fontSize: 19, fontWeight: '800', lineHeight: 22 },
  stem: { width: 3, height: 8, backgroundColor: MARK_COLOR, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  // Hangs below the anchor, as a star's name does; an explicit width so web doesn't clip it to the pin.
  name: {
    position: 'absolute',
    top: 46,
    width: NAME_WIDTH,
    maxWidth: NAME_WIDTH,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: MARK_COLOR,
    textShadowColor: '#ffffff',
    textShadowRadius: 3,
  },
});
