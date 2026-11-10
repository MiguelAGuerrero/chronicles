import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon } from '../icons';
import { Button, theme } from '../ui';
import { GUTTER } from '../walk/layout';
import { HANDOFF_HINT } from '../../lib/nav/openInMaps';
import { RoutePreview } from '../RoutePreview';
import type { Cards } from './useCards';
import type { WalkNavigation } from './useWalkNavigation';
import type { WayBack } from './useWayBack';

/**
 * This spot, from a long press on the map: Go here, Walk back here (DW7), Open in Maps (NH), and What
 * happened here when anything did. Above the capture row, in the pills' place, so the row never moves or hides.
 */
export function SpotCard(props: {
  cards: Cards;
  walkId: string | null;
  nav: WalkNavigation;
  way: WayBack;
  cardAt: StyleProp<ViewStyle>;
}) {
  const { spot, setSpot, openHere } = props.cards;
  if (!spot) return null;
  const { walkId, nav } = props;
  return (
    <View style={[styles.spotRow, props.cardAt]} pointerEvents="box-none">
      <View style={styles.spot} accessibilityViewIsModal>
        <Text style={styles.spotTitle} accessibilityRole="header">This spot</Text>
        <View style={styles.spotActions}>
          <Button
            testID="go-here"
            label="Go here"
            onPress={() => {
              const at = spot.at;
              setSpot(null);
              nav.goTo({ at, label: 'Your spot', kind: 'point' });
            }}
            disabled={nav.navigation.finding}
          />
          {walkId && (
            // Walk back here (DW7): Walk me back leads to this spot for the rest of this walk, said once.
            <Button
              testID="spot-way-back"
              variant="secondary"
              label="Walk back here"
              onPress={() => {
                const at = spot.at;
                setSpot(null);
                props.way.choose(walkId, at);
              }}
            />
          )}
          <Button
            testID="spot-handoff"
            variant="secondary"
            label="Open in Maps"
            accessibilityHint={HANDOFF_HINT}
            onPress={() => {
              const at = spot.at;
              setSpot(null);
              nav.handOff(at, 'Your spot');
            }}
          />
          {spot.here && (
            <Button
              testID="here-open"
              variant="secondary"
              label={`What happened here (${spot.here.captures.length})`}
              onPress={() => {
                const r = spot.here!;
                setSpot(null);
                openHere(r);
              }}
            />
          )}
          <Pressable testID="spot-close" accessibilityRole="button" accessibilityLabel="Close" onPress={() => setSpot(null)} style={styles.spotClose} hitSlop={8}>
            <Icon name="close" size={22} color={theme.ink} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/** A scenic preview's routes (SR2, SR8), in the cards' slot while no spot card is open. */
export function RouteCard(props: { nav: WalkNavigation; covered: boolean; cardAt: StyleProp<ViewStyle> }) {
  const { navigation } = props.nav;
  const routePreview = navigation.preview;
  if (!routePreview || props.covered) return null;
  return (
    <View style={[styles.spotRow, props.cardAt]} pointerEvents="box-none">
      <RoutePreview preview={routePreview} onSelect={navigation.select} onGo={navigation.choose} onCancel={navigation.dismiss} />
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
  spotActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  spotClose: { marginLeft: 'auto', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
