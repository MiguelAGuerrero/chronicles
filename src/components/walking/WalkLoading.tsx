import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '../icons';
import { theme } from '../ui';
import { useStackLayout } from '../walk/layout';

/** Storage not read yet (or never, if it keeps failing): still a way back to the tabs (audit 8). */
export function WalkLoading(props: { onClose: () => void }) {
  const at = useStackLayout();
  return (
    <View style={styles.screen}>
      <View style={[styles.top, { top: at.insets.top + 4, left: at.sideInset, right: at.sideInset }]} pointerEvents="box-none">
        <View style={styles.minRow} pointerEvents="box-none">
          <Pressable
            testID="ready-close"
            accessibilityRole="button"
            accessibilityLabel="Close Navigate"
            onPress={props.onClose}
            style={({ pressed }) => [styles.edgeBtn, styles.minBtn, pressed && styles.pressed]}
          >
            <Icon name="chevron-down" size={24} color={theme.ink} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  top: { position: 'absolute', gap: 8, alignItems: 'center', maxWidth: 640, alignSelf: 'center' },
  minRow: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  minBtn: { position: 'relative' },
  pressed: { opacity: 0.8 },
  edgeBtn: {
    position: 'absolute', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.edge,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 3,
  },
});
