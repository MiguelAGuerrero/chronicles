import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { OpenInMapsButton, type MapsTarget } from '../OpenInMapsButton';
import { Icon } from '../icons';
import { Button, theme } from '../ui';
import type { LngLat } from '../../lib/types';

/** A moment taken at a found place, in words (CA11): its line, and what opens it. */
export interface PlaceMomentLine {
  id: string;
  line: string;
}

/**
 * A place's card on Navigate's map before Start (ready-map-places RQ6, RQ7, RQ13, RQ16): the place in words, how far,
 * whether it may not be reachable, the moments taken at a found one, "Set as destination" and Open in Maps. No capture
 * row: a find belongs to a walk (the owner, Nov 21). It stands where the walk's cards stand (RQ15), never over the stack.
 */
export function ReadyPlaceCard(props: {
  title: string;
  /** "120 m away.", or nothing with no fix. */
  away: string;
  /** RP20's line when the place may not be reachable from public ground, else null (RQ16). */
  reach: string | null;
  /** A found place's moments (RQ13); null for a place not found. */
  moments: PlaceMomentLine[] | null;
  /** Where Open in Maps goes; null for a "?" not yet named, which is handed to no maps app (the owner, Nov 21, audit 11). */
  maps: { at: LngLat; label: string } | null;
  onDest: () => void;
  onMaps: (t: MapsTarget) => void;
  onMoment: (id: string) => void;
  onClose: () => void;
  style: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.row, props.style]} pointerEvents="box-none">
      <View testID="ready-place-card" style={styles.card} role="dialog" aria-label={props.title}>
        {/* ready-map-places ui 1: the close X in the title's row, at the top right, so the actions below never wrap. */}
        <View style={styles.head}>
          <Text style={styles.title} accessibilityRole="header">
            {props.title}
          </Text>
          <Pressable testID="ready-place-close" accessibilityRole="button" accessibilityLabel="Close" onPress={props.onClose} style={styles.close} hitSlop={8}>
            <Icon name="close" size={22} color={theme.ink} />
          </Pressable>
        </View>
        {props.away ? <Text style={styles.sub}>{props.away}</Text> : null}
        {props.reach && (
          <Text testID="mark-reach" style={styles.sub}>
            {props.reach}
          </Text>
        )}
        {props.moments && (
          // The moments taken here, in words, newest first, each opening it (CA11); never counted.
          <View testID="mark-moments">
            <Text style={styles.momentsHead}>Moments here</Text>
            {props.moments.map((x) => (
              <Pressable
                key={x.id}
                testID="mark-moment"
                accessibilityRole="button"
                accessibilityHint="Opens this moment"
                onPress={() => props.onMoment(x.id)}
                style={({ pressed }) => [styles.moment, pressed && styles.pressed]}
              >
                <Text style={styles.momentText} numberOfLines={1}>
                  {x.line}
                </Text>
                <Icon name="chevron-forward" size={18} color={theme.ink} />
              </Pressable>
            ))}
          </View>
        )}
        {/* One primary, then the outlined one under it, each the card's width: never side by side on a narrow card. */}
        <View style={styles.actions}>
          {/* Audit 6: never the accent, as on Explore's card (OM8): Start is the screen's one. */}
          <Button testID="ready-place-dest" label="Set as destination" variant="secondary" onPress={props.onDest} />
          {props.maps && <OpenInMapsButton testID="ready-place-maps" variant="button" target={{ at: props.maps.at, label: props.maps.label, kind: 'spot' }} onOpen={props.onMaps} />}
        </View>
      </View>
    </View>
  );
}

const GUTTER = 16;
const styles = StyleSheet.create({
  row: { position: 'absolute', left: GUTTER, alignItems: 'center' },
  card: {
    backgroundColor: theme.surface, borderRadius: theme.radius, padding: 16, gap: 12, width: '100%', maxWidth: 520,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  title: { flex: 1, fontSize: 16, fontWeight: '700', color: theme.ink, paddingTop: 11 },
  sub: { fontSize: 14, color: theme.muted },
  momentsHead: { fontSize: 14, fontWeight: '700', color: theme.ink },
  moment: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  momentText: { flex: 1, fontSize: 15, color: theme.ink },
  actions: { gap: 8 },
  close: { width: 44, height: 44, marginTop: -4, marginRight: -8, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.8 },
});
