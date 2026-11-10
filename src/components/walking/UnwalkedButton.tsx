import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../icons';
import { theme } from '../ui';
import { EDGE, type useStackLayout } from '../walk/layout';

/** Show unwalked streets near me: an edge button in the stack's column, and the count beside it. */
export function UnwalkedButton(props: { on: boolean; onToggle: () => void; count: number; at: ReturnType<typeof useStackLayout> }) {
  const { on, at } = props;
  return (
    <>
      <Pressable
        testID="unwalked"
        accessibilityRole="switch"
        accessibilityState={{ checked: on }}
        aria-checked={on}
        accessibilityLabel="Show unwalked streets near me"
        onPress={props.onToggle}
        style={({ pressed }) => [styles.edgeBtn, { right: at.edgeRight, bottom: at.edgeBottom('unwalked') }, on && styles.edgeBtnOn, pressed && styles.pressed]}
      >
        <Icon name="footsteps-outline" size={22} color={on ? '#ffffff' : theme.ink} />
      </Pressable>
      {on && (
        <View
          style={[styles.unwalked, { right: at.edgeRight + EDGE + 8, bottom: at.edgeBottom('unwalked') + 7 }]}
          accessibilityLiveRegion="polite"
          pointerEvents="none"
        >
          <Text style={styles.unwalkedText}>{props.count} unwalked nearby</Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  // Small round controls at the map's edges, as in AllTrails.
  edgeBtn: {
    position: 'absolute', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.edge,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 3,
  },
  edgeBtnOn: { backgroundColor: theme.ink, borderColor: theme.ink },
  pressed: { opacity: 0.8 },
  unwalked: { position: 'absolute', backgroundColor: theme.ink, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12 },
  unwalkedText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
});
