import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../icons';
import { COLORS } from '../map/types';
import { LiftIn, theme } from '../ui';
import { aboutTimeLeft, formatTimeLeft, timeLeftMs } from '../../lib/nav/eta';
import { HANDOFF_HINT } from '../../lib/nav/openInMaps';
import { pausedMs } from '../../lib/geo';
import { formatDistance } from '../../lib/summary';
import type { Pause, Walk } from '../../lib/types';
import type { WalkNavigation } from './useWalkNavigation';

/**
 * The navigation bar: what is left (time left at this walk's pace, QL17), where to, Open in Maps and
 * End. It shares the top row with Minimize (the owner, Nov 6). Not a live region: it changes with every
 * fix; the distance is announced in steps instead.
 */
export function NavBar(props: { nav: WalkNavigation; walk: Walk | null; pauses: Pause[]; distanceM: number; now: number }) {
  const { navigation, handOff } = props.nav;
  const nav = navigation.nav;
  if (!nav) return null;
  const { walk, pauses, now } = props;
  // Time left while navigating (QL17): this walk's pace over its moving time, refreshed by the 5 s clock.
  const navTimeLeft = timeLeftMs(nav.leftM, props.distanceM, walk ? now - walk.started_at - pausedMs(pauses, walk.started_at, now) : 0);
  return (
    <View testID="nav-bar" style={styles.navBar}>
      <Icon name="navigate" size={20} color="#ffffff" />
      <Text
        testID="nav-left"
        style={styles.navText}
        numberOfLines={2}
        accessibilityLabel={`${formatDistance(nav.leftM)}${nav.dest.suggested ? '' : `, ${aboutTimeLeft(navTimeLeft)}`} left to ${nav.dest.label}`}
      >
        {formatDistance(nav.leftM)} · {nav.dest.suggested ? '' : `${formatTimeLeft(navTimeLeft)} · `}{nav.dest.label}
      </Text>
      <Pressable
        testID="nav-handoff"
        accessibilityRole="button"
        accessibilityLabel="Open in Maps"
        accessibilityHint={HANDOFF_HINT}
        onPress={() => {
          const d = navigation.nav?.dest;
          if (d) handOff(d.at, d.label);
        }}
        style={({ pressed }) => [styles.navHandoff, pressed && styles.pressed]}
      >
        <Icon name="open-outline" size={22} color="#ffffff" />
      </Pressable>
      <Pressable testID="nav-end" accessibilityRole="button" accessibilityLabel="End navigation" onPress={navigation.end} style={styles.navEnd} hitSlop={8}>
        <Text style={styles.navEndText}>End</Text>
      </Pressable>
    </View>
  );
}

/** Off your route, Finding a route with Cancel, and "You're here" (or a find): under the top row. */
export function NavLines(props: { nav: WalkNavigation }) {
  const { navigation, arrived } = props.nav;
  return (
    <>
      {navigation.nav?.offRoute && (
        <LiftIn style={styles.chip} accessibilityLiveRegion="polite">
          <View style={[styles.statusDot, { backgroundColor: theme.warn }]} />
          <Text style={styles.chipText}>Off your route</Text>
        </LiftIn>
      )}
      {navigation.finding && (
        <View style={styles.finding} accessibilityLiveRegion="polite">
          <ActivityIndicator color={theme.ink} />
          <Text style={styles.findingText}>Finding a route</Text>
          <Pressable testID="nav-cancel" accessibilityRole="button" accessibilityLabel="Cancel finding a route" onPress={navigation.cancel} style={styles.findingCancel} hitSlop={8}>
            <Text style={styles.findingCancelText}>Cancel</Text>
          </Pressable>
        </View>
      )}
      {arrived && (
        <LiftIn style={styles.toast}>
          <Text style={[styles.toastText, styles.flashText]}>{arrived}</Text>
        </LiftIn>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.surface, borderRadius: 999,
    paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.line,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  chipText: { color: theme.ink, fontWeight: '600', fontSize: 14 },
  // Navigating: what is left and where to, as on a maps app's top bar, with End.
  navBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, backgroundColor: COLORS.route, borderRadius: 16,
    paddingLeft: 16, paddingRight: 8, minHeight: 56,
  },
  navText: { flex: 1, color: '#ffffff', fontSize: 16, fontWeight: '700' },
  // A white pill: 5.2:1 for its blue text.
  navEnd: { minHeight: 44, minWidth: 64, paddingHorizontal: 16, borderRadius: 22, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  navEndText: { color: COLORS.route, fontSize: 16, fontWeight: '700' },
  navHandoff: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  finding: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.surface, borderRadius: 999, paddingLeft: 16, paddingRight: 4,
    minHeight: 52, borderWidth: 1, borderColor: theme.line,
  },
  findingText: { color: theme.ink, fontSize: 16, fontWeight: '600' },
  findingCancel: { minHeight: 44, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 22 },
  findingCancelText: { color: theme.ink, fontSize: 16, fontWeight: '700', textDecorationLine: 'underline' },
  flashText: { fontSize: 16 },
  toast: { backgroundColor: theme.ink, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 16, alignSelf: 'center' },
  toastText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  pressed: { opacity: 0.8 },
});
