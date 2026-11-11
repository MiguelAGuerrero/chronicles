import { StyleSheet, Text, View } from 'react-native';
import { COMPLEX_STYLE } from '../lib/complexes/mapLayer';

/** A complex's name and kind on the map, at close zoom only (CX9): quiet text in the outline's own hue on a white halo. */
export function ComplexLabelView({ text }: { text: string }) {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Text style={styles.label}>{text}</Text>
    </View>
  );
}

const W = 170;
const styles = StyleSheet.create({
  wrap: { width: W, alignItems: 'center' },
  label: { maxWidth: W, textAlign: 'center', fontSize: 12, fontWeight: '700', color: COMPLEX_STYLE.color, textShadowColor: '#ffffff', textShadowRadius: 3 },
});
