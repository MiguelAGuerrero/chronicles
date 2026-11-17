import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { openInMapsName, OPEN_IN_MAPS, shareLabel } from '../lib/atlas/mapsButton';
import { feedback } from '../lib/motion';
import { HANDOFF_HINT, openInMaps } from '../lib/nav/openInMaps';
import type { LngLat } from '../lib/types';
import { Icon } from './icons';
import { theme } from './ui';

/** A place to open in the phone's maps app: where, what it is called on the device, and what it is (OM10: only an area's name rides in the link). */
export interface MapsTarget {
  at: LngLat;
  label: string;
  kind: 'area' | 'star' | 'spot';
}

/**
 * Open in Maps (specs/open-in-maps-here, decision 0191): `open(target)` hands the destination to the phone's maps app,
 * straight from the tap (a browser opens a window only from one), and does nothing else: no sheet, nothing saved, no walk.
 * A maps app that won't open is the host's `onFail`.
 */
export function useOpenInMaps(onFail: () => void): (t: MapsTarget) => void {
  return useCallback(
    (t: MapsTarget) => {
      feedback('tap');
      openInMaps(t.at, shareLabel(t.kind, t.label)).then((ok) => ok || onFail(), onFail);
    },
    [onFail],
  );
}

/**
 * "Open in Maps ↗", named for where you end up (OM1): outlined, in ink, never the accent (0172), with the external-link glyph.
 * `half` is a tile's right button, `button` an outlined pill under or beside a walk action, `link` a text link under a row's name.
 */
export function OpenInMapsButton(props: {
  target: MapsTarget;
  onOpen: (t: MapsTarget) => void;
  variant: 'half' | 'button' | 'link';
  testID: string;
  style?: StyleProp<ViewStyle>;
}) {
  const v = props.variant;
  return (
    <Pressable
      testID={props.testID}
      accessibilityRole="button"
      accessibilityLabel={openInMapsName(props.target.label)}
      accessibilityHint={HANDOFF_HINT}
      onPress={() => props.onOpen(props.target)}
      style={({ pressed }) => [styles.base, v === 'half' && styles.half, v === 'button' && styles.button, v === 'link' && styles.link, props.style, pressed && styles.pressed]}
    >
      <Text style={styles.text} numberOfLines={1}>{OPEN_IN_MAPS}</Text>
      <View testID="maps-glyph">
        <Icon name="open-outline" size={14} color={theme.ink} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, minHeight: 44 },
  // A tile's right button: half the strip, outlined.
  half: { flex: 1, minWidth: 0, borderWidth: 1, borderColor: theme.edge, borderRadius: 10, paddingHorizontal: 6 },
  // Under or beside a walk action: an outlined pill.
  button: { borderWidth: 1, borderColor: theme.edge, borderRadius: 22, paddingHorizontal: 16 },
  // Under a row's name: text, left-aligned with it.
  link: { alignSelf: 'flex-start', justifyContent: 'flex-start', paddingHorizontal: 0 },
  pressed: { opacity: 0.7 },
  text: { fontSize: 13, fontWeight: '600', color: theme.ink, lineHeight: 16 },
});
