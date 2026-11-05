// @layer view
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LAYERS, type LegendRow, type SwatchKey } from '../lib/layers/registry';
import type { useLayers } from '../lib/layers/useLayers';
import type { WalkStatus } from '../lib/walk/layer';
import { Icon, type IconName } from './icons';
import { BORDER, HOTSPOT, WALK_STYLE } from './map/types';
import { SwitchRow } from './SwitchRow';
import { Tooltip } from './Tooltip';
import { theme } from './ui';
import { WalkBandIcon } from './WalkBandIcon';

/** The legend swatch of each row: the colour the map draws it in (specs/map-layers ML1). */
const SWATCH: Record<SwatchKey, { color: string; opacity: number; outline?: boolean }> = {
  // The swatches are the tints at a legible strength: the map draws them very softly over the streets.
  foot: { color: WALK_STYLE.foot.color, opacity: 0.6 },
  mixed: { color: '#d97706', opacity: 0.7 },
  car: { color: WALK_STYLE.car.color, opacity: 0.75 },
  hotspot: { color: HOTSPOT, opacity: 0.85 },
  'border-tint': { color: BORDER.color, opacity: 0.35, outline: true },
  'border-line': { color: BORDER.lined, opacity: 0.9, outline: true },
};

function Legend(props: { row: LegendRow; below: boolean }) {
  const { row } = props;
  const sw = SWATCH[row.swatch];
  const swatch = <View testID={`layer-swatch-${row.key}`} style={[styles.swatch, { backgroundColor: sw.color, opacity: sw.opacity }, sw.outline && { borderWidth: 1.5, borderColor: sw.color }]} />;
  return (
    <View style={styles.legendRow} testID={`layer-legend-${row.key}`}>
      {swatch}
      {row.band ? (
        <Tooltip text={row.tip ?? row.text} testID={`walk-tip-${row.key}`} side={props.below ? 'below' : 'above'}>
          <WalkBandIcon band={row.band} size={22} />
        </Tooltip>
      ) : row.tip ? (
        <Tooltip text={row.tip} testID={`layer-tip-${row.key}`} side={props.below ? 'below' : 'above'}>
          <Icon name="information-circle-outline" size={18} color={theme.muted} />
        </Tooltip>
      ) : null}
      <Text style={styles.label}>{row.text}</Text>
    </View>
  );
}

/** The quiet lines under a layer while it works or can't (walkability's tiles, busy streets' one read). */
export function layerNotes(walk: WalkStatus, busyReading: boolean): Record<string, string | null> {
  return { walkability: walk === 'reading' ? 'Reading…' : walk === 'unavailable' ? 'Not available now' : null, busy: busyReading ? 'Reading…' : null };
}

/**
 * The Layers button and its panel (specs/map-layers ML3-ML6): one round button in the map's edge column, where the
 * walkability button was, opening a small card with a switch per layer and, under a layer that is on, its legend.
 * Anchored from the bottom (the walk, where the column is tall) the card opens upward; anchored from the top (Explore,
 * whose map is about 200 px tall on a phone) it opens below the button and left of the buttons beneath. Inline, never a
 * `Modal`. `notes` are quiet lines per layer ("Reading…"); no count is shown anywhere.
 */
export function LayersControl(props: { layers: ReturnType<typeof useLayers>; notes?: Record<string, string | null | undefined>; bottom?: number; top?: number; right?: number }) {
  const { width } = useWindowDimensions();
  const right = props.right ?? Math.max(12, (width - 640) / 2 + 12);
  const { layers } = props;
  const fromTop = props.top !== undefined;
  // Filled while a layer that starts off is on: with the borders on from the start, "any layer on" would always be true.
  const anyOn = LAYERS.some((l) => !l.defaultOn && layers.on[l.id]);
  useEffect(() => {
    if (!layers.open || Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && layers.closePanel();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [layers.open, layers]);
  const panel = layers.open ? (
    <View testID="layers-panel" style={[styles.card, fromTop && styles.cardBeside]}>
      {LAYERS.map((l) => {
        const on = !!layers.on[l.id];
        return (
          <View key={l.id} style={styles.layer}>
            <SwitchRow testID={`layer-${l.id}`} label={l.name} icon={l.icon as IconName} value={on} onChange={() => layers.toggle(l.id)} />
            {on ? (
              <View style={styles.legend} testID={`layer-legend-${l.id}`}>
                {l.legend.map((r) => <Legend key={r.key} row={r} below={fromTop} />)}
                {props.notes?.[l.id] ? <Text testID={`layer-status-${l.id}`} style={styles.note}>{props.notes[l.id]}</Text> : null}
                {l.note ? <Text testID={`layer-note-${l.id}`} style={styles.note}>{l.note}</Text> : null}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  ) : null;
  const button = (
    <Pressable
      testID="layers"
      accessibilityRole="button"
      accessibilityLabel="Layers"
      accessibilityState={{ expanded: layers.open }}
      aria-expanded={layers.open}
      onPress={layers.togglePanel}
      style={({ pressed }) => [styles.btn, anyOn && styles.btnOn, pressed && styles.pressed]}
    >
      <Icon name={anyOn ? 'layers' : 'layers-outline'} size={24} color={anyOn ? theme.accentInk : theme.ink} />
    </Pressable>
  );
  return (
    <View pointerEvents="box-none" style={[styles.col, { right }, fromTop ? { top: props.top } : { bottom: props.bottom ?? 0 }]}>
      {fromTop ? button : panel}
      {fromTop ? panel : button}
    </View>
  );
}

const styles = StyleSheet.create({
  col: { position: 'absolute', alignItems: 'flex-end', gap: 8, zIndex: 3 },
  btn: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.edge,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 3,
  },
  btnOn: { backgroundColor: theme.accent, borderColor: theme.accent },
  pressed: { opacity: 0.8 },
  card: { width: 312, maxWidth: '100%', paddingVertical: 2, borderRadius: theme.radius, backgroundColor: theme.glass, borderWidth: 1, borderColor: theme.line },
  /** Beside the button column, not under it: left of the Locate and compass buttons below. */
  cardBeside: { marginRight: 52 },
  layer: { gap: 2 },
  /** A layer's rows side by side where they fit, so the panel stays short enough for a phone (specs/map-layers ML4). */
  legend: { paddingHorizontal: 16, paddingBottom: 6, flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4, alignItems: 'center' },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  swatch: { width: 16, height: 16, borderRadius: 4 },
  label: { color: theme.ink, fontSize: 14, flexShrink: 1 },
  note: { color: theme.muted, fontSize: 12, lineHeight: 16, width: '100%' },
});
