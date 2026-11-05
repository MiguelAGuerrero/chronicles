// @layer view
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { bandTip } from '../lib/walk/bandWords';
import type { Walkability } from '../lib/walk/useWalkability';
import { Icon } from './icons';
import { Tooltip } from './Tooltip';
import { theme } from './ui';
import { WalkBandIcon } from './WalkBandIcon';

/** WK14: what the layer draws, from where, and an honest line about what an unmapped sidewalk looks like. */
export const WALK_CREDIT = 'From OpenStreetMap and Overture. Where sidewalks aren\'t mapped, streets can read worse than they are.';

/**
 * The walkability switch (WK13, WK14, WK21): a round button in the map's edge column, with the pedestrian
 * mark. On, a card below it names the two drawn bands as icons with tooltips and says where it is from;
 * while tiles load it says so quietly, and when none could be had it says "Not available now".
 * Anchored from the bottom, the card grows upward (Navigate, where the column is tall); anchored from the
 * top, it opens below the button and left of the other edge buttons (Explore, whose map is short: a card
 * growing upward ran off the top of a phone).
 */
export function WalkLayerControl(props: { wk: Walkability; bottom?: number; top?: number; right?: number }) {
  const { width } = useWindowDimensions();
  const right = props.right ?? Math.max(12, (width - 640) / 2 + 12);
  const { wk } = props;
  const fromTop = props.top !== undefined;
  const card = wk.on ? (
    <View testID="walk-legend" style={[styles.card, fromTop && styles.cardBeside]}>
      <View style={styles.bands}>
        <View style={styles.row}>
          <Tooltip text={bandTip('mixed')!} testID="walk-tip-mixed" side={fromTop ? 'below' : 'above'}>
            <WalkBandIcon band="mixed" size={22} />
          </Tooltip>
          <Text style={styles.label}>Mixed</Text>
        </View>
        <View style={styles.row}>
          <Tooltip text={bandTip('car')!} testID="walk-tip-car" side={fromTop ? 'below' : 'above'} align="right">
            <WalkBandIcon band="car" size={22} />
          </Tooltip>
          <Text style={styles.label}>Built around cars</Text>
        </View>
      </View>
      {wk.status === 'reading' ? <Text testID="walk-status" style={styles.note}>Reading…</Text> : null}
      {wk.status === 'unavailable' ? <Text testID="walk-status" style={styles.note}>Not available now</Text> : null}
      <Text testID="walk-credit" style={styles.note}>{WALK_CREDIT}</Text>
    </View>
  ) : null;
  const button = (
      <Pressable
        testID="walk-layer"
        accessibilityRole="switch"
        accessibilityState={{ checked: wk.on }}
        aria-checked={wk.on}
        accessibilityLabel="Walkability"
        onPress={wk.toggle}
        style={({ pressed }) => [styles.btn, wk.on && styles.btnOn, pressed && styles.pressed]}
      >
        <Icon name="walk" size={24} color={wk.on ? theme.accentInk : theme.ink} />
      </Pressable>
  );
  return (
    <View pointerEvents="box-none" style={[styles.col, { right }, fromTop ? { top: props.top } : { bottom: props.bottom ?? 0 }]}>
      {fromTop ? button : card}
      {fromTop ? card : button}
    </View>
  );
}

const styles = StyleSheet.create({
  col: { position: 'absolute', alignItems: 'flex-end', gap: 8 },
  btn: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.edge,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 3,
  },
  btnOn: { backgroundColor: theme.accent, borderColor: theme.accent },
  pressed: { opacity: 0.8 },
  card: { maxWidth: 270, padding: 10, gap: 8, borderRadius: theme.radius, backgroundColor: theme.glass, borderWidth: 1, borderColor: theme.line },
  /** Beside the button column, not under it: left of the Locate and compass buttons below. */
  cardBeside: { marginRight: 52 },
  bands: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { color: theme.ink, fontSize: 14 },
  note: { color: theme.muted, fontSize: 12, lineHeight: 16 },
});
