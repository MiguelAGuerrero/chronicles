import { StyleSheet, Text, View } from 'react-native';
import { theme } from './ui';

/** An area on Explore's small map: a quiet dot, named only when selected (round 3, fix pins-selected-only). */
export interface AreaPointPin {
  id: string;
  at: [number, number];
  /** Null draws the dot alone. */
  name: string | null;
  selected?: boolean;
}

export function AreaPointView({ pin }: { pin: AreaPointPin }) {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={[styles.dot, pin.selected && styles.dotOn]} />
      {pin.name ? <Text style={[styles.label, pin.selected && styles.labelOn]}>{pin.name}</Text> : null}
    </View>
  );
}

const W = 140;
const styles = StyleSheet.create({
  // The dot sits at the middle of a fixed-width box, so the marker's centre anchor lands on the area's point.
  wrap: { width: W, alignItems: 'center', paddingTop: 0 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ffffff', borderWidth: 2, borderColor: theme.edge },
  dotOn: { width: 14, height: 14, borderRadius: 7, borderColor: theme.accent, borderWidth: 3 },
  label: {
    maxWidth: W, textAlign: 'center', marginTop: 2, fontSize: 11, fontWeight: '700', color: theme.ink,
    textShadowColor: '#ffffff', textShadowRadius: 3,
  },
  labelOn: { color: theme.accent },
});
