import { ActivityIndicator, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Icon } from './icons';
import { theme } from './ui';

/**
 * Locate me (QL9, QL11): a round edge button at the map's right edge, inside
 * the 640 column on wide screens (the walk screen's edgeBtn look). While a
 * fix is read it shows busy and takes no tap, and keeps the keyboard's focus:
 * react-native-web renders a disabled Pressable as a disabled `<button>`, and
 * the browser takes the focus off it (tend map 5), so it is never `disabled`;
 * a press while busy does nothing, and busy is said with `aria-busy`.
 */
export function LocateButton(props: { busy: boolean; onPress: () => void; bottom: number; right?: number }) {
  const { width } = useWindowDimensions();
  const right = props.right ?? Math.max(12, (width - 640) / 2 + 12);
  return (
    <Pressable
      testID="locate"
      accessibilityRole="button"
      accessibilityLabel="Center on your position"
      accessibilityState={{ busy: props.busy, disabled: props.busy }}
      aria-busy={props.busy}
      onPress={props.busy ? undefined : props.onPress}
      style={({ pressed }) => [styles.edgeBtn, { right, bottom: props.bottom }, pressed && styles.pressed]}
    >
      {props.busy ? <ActivityIndicator size="small" color={theme.ink} /> : <Icon name="locate-outline" size={22} color={theme.ink} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Small round controls at the map's edges, as on the walk screen.
  edgeBtn: {
    position: 'absolute', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.edge,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 3,
  },
  pressed: { opacity: 0.8 },
});
