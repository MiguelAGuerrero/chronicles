import { Pressable, StyleSheet } from 'react-native';
import { Icon } from '../icons';
import { theme } from '../ui';
import type { useStackLayout } from '../walk/layout';
import type { WalkNavigation } from './useWalkNavigation';
import type { WayBack } from './useWayBack';

/** Walk me back: the way back to where this walk began, where the last ride ended, or the spot chosen (N1, N11, DW6-DW8). */
export function WalkBackButton(props: { wayBack: WayBack; nav: WalkNavigation; at: ReturnType<typeof useStackLayout> }) {
  const { navigation, goTo } = props.nav;
  const { wayBack, awayFromStart } = props.wayBack;
  const { at } = props;
  if (!awayFromStart || !wayBack || navigation.nav) return null;
  return (
    <Pressable
      testID="walk-back"
      accessibilityRole="button"
      accessibilityLabel={wayBack.said}
      disabled={navigation.finding}
      onPress={() => goTo({ at: wayBack.at, label: wayBack.label, kind: 'start' })}
      style={({ pressed }) => [styles.edgeBtn, { right: at.edgeRight, bottom: at.edgeBottom('back') }, pressed && styles.pressed]}
    >
      <Icon name="arrow-undo" size={22} color={theme.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Small round controls at the map's edges, as in AllTrails.
  edgeBtn: {
    position: 'absolute', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.edge,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 3,
  },
  pressed: { opacity: 0.8 },
});
