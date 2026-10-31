import { StyleSheet, Text, View } from 'react-native';
import { HOTSPOT_INK, HOTSPOT_PIN } from './map/types';
import { Icon } from './icons';

/** A strip's name, on the map beside it (L9). */
export function StripLabel({ name }: { name: string }) {
  return (
    <View style={styles.labelWrap} pointerEvents="none">
      <Text style={styles.label} numberOfLines={1}>{name}</Text>
    </View>
  );
}

/** Where to start (L9): a green flag on a short stem, anchored at its foot. */
export function StartHereView() {
  return (
    <View style={styles.pinWrap} pointerEvents="none">
      <View style={styles.pin}>
        <Icon name="flag" size={16} color="#ffffff" />
        <Text style={styles.pinText}>Start here</Text>
      </View>
      <View style={styles.stem} />
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
  pinWrap: { alignItems: 'center' },
  pin: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: HOTSPOT_PIN, borderRadius: 999,
    paddingVertical: 6, paddingHorizontal: 12, borderWidth: 2, borderColor: '#ffffff',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 3,
  },
  pinText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  stem: { width: 3, height: 8, backgroundColor: HOTSPOT_PIN },
});
