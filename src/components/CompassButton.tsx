// @layer view
import type { RefObject } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { compassRotation, showsCompass } from '../lib/compass';
import { focusOn } from '../lib/focus';
import { theme } from './ui';

/**
 * The compass (CP2-CP5): a round edge button in Locate's column, drawn only while the map is turned.
 * Its needle turns against the map so the red end keeps pointing north; a tap turns the map back.
 * The tap takes the compass away (CP4), so the focus goes on to `focusAfter`, the button below it in
 * the column, rather than to the page (tend map 6).
 */
export function CompassButton(props: { bearing: number; onPress: () => void; bottom: number; right?: number; focusAfter?: RefObject<unknown> }) {
  const { width } = useWindowDimensions();
  if (!showsCompass(props.bearing)) return null;
  const right = props.right ?? Math.max(12, (width - 640) / 2 + 12);
  return (
    <Pressable
      testID="compass"
      accessibilityRole="button"
      accessibilityLabel="Point the map north"
      onPress={() => {
        props.onPress();
        if (props.focusAfter) focusOn(props.focusAfter);
      }}
      style={({ pressed }) => [styles.edgeBtn, { right, bottom: props.bottom }, pressed && styles.pressed]}
    >
      <View testID="compass-needle" style={[styles.needle, { transform: [{ rotate: `${compassRotation(props.bearing)}deg` }] }]}>
        <View style={styles.north} />
        <View style={styles.south} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  edgeBtn: {
    position: 'absolute', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.edge,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 3,
  },
  pressed: { opacity: 0.8 },
  needle: { width: 14, height: 26, alignItems: 'center' },
  north: {
    width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderBottomWidth: 13,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#c62828',
  },
  south: {
    width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 13,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: theme.ink,
  },
});
