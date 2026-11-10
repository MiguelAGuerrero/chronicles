import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon } from '../icons';
import { Button, theme } from '../ui';
import { GUTTER } from '../walk/layout';
import { kindOf } from '../../lib/explore/explore';
import { distanceM } from '../../lib/geo';
import { formatDistance } from '../../lib/summary';
import type { LngLat } from '../../lib/types';
import type { Cards } from './useCards';
import type { WalkExplore } from './useWalkExplore';
import type { WalkNavigation } from './useWalkNavigation';

/** A place's card, in the spot card's place (E7, E8, E12): "A place to find" until revealed, then its name. */
export function MarkCard(props: { ex: WalkExplore; nav: WalkNavigation; cards: Cards; here: LngLat | null; covered: boolean; cardAt: StyleProp<ViewStyle> }) {
  const { openMark, openMarkNamed, openMarkReach, explore } = props.ex;
  const { setMarkOpen } = props.cards;
  if (!openMark || props.covered) return null;
  const { here } = props;
  return (
    <View style={[styles.spotRow, props.cardAt]} pointerEvents="box-none">
      <View testID="mark-card" style={styles.spot} accessibilityViewIsModal>
        <Text style={styles.spotTitle} accessibilityRole="header">
          {openMarkNamed ? `${openMark.name} · ${kindOf(openMark.kind).label}` : 'A place to find'}
        </Text>
        <Text style={styles.markSub}>
          {here ? `${formatDistance(distanceM(here, openMark.at))} away. ` : ''}
          {explore.found.has(openMark.key)
            ? 'Found.'
            : openMarkNamed
              ? 'Take a photo, a memo or a note here to find it.'
              : 'Walk within 60 m to see what it is.'}
        </Text>
        {openMarkReach && (
          <Text testID="mark-reach" style={styles.markSub}>
            {openMarkReach}
          </Text>
        )}
        <View style={styles.spotActions}>
          <Button testID="mark-go" label="Go here" onPress={() => {
              const m = openMark;
              setMarkOpen(null);
              props.nav.goTo({ at: m.at, label: openMarkNamed ? m.name : 'A place to find', kind: 'find', placeKey: m.key });
            }}
            disabled={props.nav.navigation.finding}
          />
          <Pressable testID="mark-close" accessibilityRole="button" accessibilityLabel="Close" onPress={() => setMarkOpen(null)} style={styles.spotClose} hitSlop={8}>
            <Icon name="close" size={22} color={theme.ink} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  spotRow: { position: 'absolute', left: GUTTER, right: GUTTER, alignItems: 'center' },
  spot: {
    backgroundColor: theme.surface, borderRadius: theme.radius, padding: 16, gap: 12, width: '100%', maxWidth: 520,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6,
  },
  spotTitle: { fontSize: 16, fontWeight: '700', color: theme.ink },
  markSub: { fontSize: 14, color: theme.muted },
  spotActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  spotClose: { marginLeft: 'auto', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
