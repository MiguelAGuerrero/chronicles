import { StyleSheet, Text, View } from 'react-native';
import { HOTSPOT_INK } from './map/types';

/** A strip's name, on the map beside it (L9). */
export function StripLabel({ name }: { name: string }) {
  return (
    <View style={styles.labelWrap} pointerEvents="none">
      <Text style={styles.label} numberOfLines={1}>{name}</Text>
    </View>
  );
}

const LABEL_W = 160;
const styles = StyleSheet.create({
  labelWrap: { width: LABEL_W, alignItems: 'center' },
  label: {
    maxWidth: LABEL_W, fontSize: 13, fontWeight: '800', color: HOTSPOT_INK,
    textShadowColor: '#ffffff', textShadowRadius: 3,
  },
});
