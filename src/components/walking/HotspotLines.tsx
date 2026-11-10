import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../icons';
import { HOTSPOT } from '../map/types';
import { LiftIn, theme } from '../ui';
import type { LngLat } from '../../lib/types';
import type { WalkNavigation } from './useWalkNavigation';

/** On a strip: a quiet chip, not a notification or a hint (L14). */
export function OnStripChip(props: { street: string }) {
  return (
    <LiftIn testID="on-strip" style={styles.chip}>
      <View style={[styles.statusDot, { backgroundColor: HOTSPOT }]} />
      <Text style={styles.chipText}>On {props.street}</Text>
    </LiftIn>
  );
}

/** The dead-zone nudge (L15): toward the nearest pocket, Go here or dismiss. */
export function DeadZoneNudge(props: { nudge: { text: string; at: LngLat; name: string } | null; nav: WalkNavigation; onDismiss: () => void }) {
  const { nudge } = props;
  if (!nudge) return null;
  return (
    <View testID="dead-zone" style={styles.undo}>
      <Text style={[styles.undoText, { flexShrink: 1 }]} numberOfLines={2}>{nudge.text}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Go to ${nudge.name}`}
        onPress={() => {
          const n = nudge;
          props.onDismiss();
          props.nav.goTo({ at: n.at, label: n.name, kind: 'place' });
        }}
        hitSlop={10}
        style={styles.undoBtn}
      >
        <Text style={styles.undoBtnText}>Go here</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={props.onDismiss} hitSlop={10}>
        <Icon name="close" size={18} color="#ffffff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.surface, borderRadius: 999,
    paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.line,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  chipText: { color: theme.ink, fontWeight: '600', fontSize: 14 },
  undo: {
    flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: theme.ink, borderRadius: 999, maxWidth: '100%',
    paddingVertical: 8, paddingLeft: 16, paddingRight: 8,
  },
  undoText: { color: '#ffffff', fontSize: 15, fontWeight: '600', flexShrink: 1 },
  undoBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)' },
  undoBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
});
