import { Pressable, StyleSheet } from 'react-native';
import { CompassButton } from '../CompassButton';
import { Icon } from '../icons';
import { theme } from '../ui';
import type { useStackLayout } from '../walk/layout';

/** The compass (CP2): the column's top, so no other button moves; it takes Walk me back's place while that is away. */
export function WalkCompass(props: { bearing: number; onNorth: () => void; slot: Parameters<ReturnType<typeof useStackLayout>['edgeBottom']>[0]; at: ReturnType<typeof useStackLayout> }) {
  return <CompassButton bearing={props.bearing} onPress={props.onNorth} bottom={props.at.edgeBottom(props.slot)} right={props.at.edgeRight} />;
}

/** Recenter, where Locate sits on the ready screen (NR9): back to following the walker after looking around the map. */
export function RecenterButton(props: { show: boolean; onRecenter: () => void; at: ReturnType<typeof useStackLayout> }) {
  const { at } = props;
  if (!props.show) return null;
  return (
    <Pressable
      testID="recenter"
      accessibilityRole="button"
      accessibilityLabel="Recenter on your position"
      onPress={props.onRecenter}
      style={({ pressed }) => [styles.edgeBtn, { right: at.edgeRight, bottom: at.edgeBottom('locate') }, pressed && styles.pressed]}
    >
      <Icon name="locate" size={22} color={theme.ink} />
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
});
