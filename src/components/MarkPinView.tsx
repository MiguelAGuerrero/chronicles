import { StyleSheet, Text, View } from 'react-native';
import type { IconName } from './icons';
import { Icon } from './icons';

/** An explore mark on the map (E6-E8, E22): what the pin needs. */
export interface MarkPin {
  id: string;
  at: [number, number];
  /** Within 60 m once: the category icon and the name show (E7). */
  revealed: boolean;
  /** Found by a capture (E8): the icon with a check, at any distance. */
  found?: boolean;
  /** On the way, beyond your range (E22): a faint "?". */
  faint?: boolean;
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
  const shown = pin.revealed || pin.found;
  return (
    <View style={[styles.wrap, pin.faint && styles.faint, pin.found && styles.wrapFound]} pointerEvents="none">
      <View style={[styles.head, pin.found && styles.headFound]}>
        {shown ? <Icon name={pin.icon} size={pin.found ? 13 : 18} color="#ffffff" /> : <Text style={styles.q}>?</Text>}
        {pin.found && (
          <View style={styles.check}>
            <Icon name="checkmark" size={11} color={FOUND_COLOR} />
          </View>
        )}
      </View>
      <View style={[styles.stem, pin.found && styles.stemFound]} />
      {shown && !pin.faint && !pin.found && (
        <Text style={styles.name} numberOfLines={1}>
          {pin.name}
        </Text>
      )}
    </View>
  );
}

export function markLabel(pin: MarkPin): string {
  if (pin.found) return `Found: ${pin.name}, ${pin.category}`;
  if (pin.faint) return 'A place on the way. Open';
  return pin.revealed ? `${pin.name}, ${pin.category}. Open` : 'A place to find. Open';
}

/** What changes a pin's look, for re-rendering a marker only when it changes. */
export const markKey = (pin: MarkPin) => `${pin.revealed ? 'r' : ''}${pin.found ? 'f' : ''}${pin.faint ? 'w' : ''}`;

/** Found places: the trace's green family, so a find reads as walked, not as a capture. */
export const FOUND_COLOR = '#1f7a4d';

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
  faint: { opacity: 0.45 },
  // Smaller than a "?", and without a name: a find is a quiet note on the map, not a target (audit, UI).
  wrapFound: { width: 26, height: 32 },
  headFound: { backgroundColor: FOUND_COLOR, width: 24, height: 24, borderRadius: 7 },
  stemFound: { backgroundColor: FOUND_COLOR },
  check: {
    position: 'absolute', right: -6, top: -6, width: 16, height: 16, borderRadius: 8, backgroundColor: '#ffffff',
    alignItems: 'center', justifyContent: 'center',
  },
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
