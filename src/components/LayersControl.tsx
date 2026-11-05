// @layer view
import { useEffect } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { panelBox } from '../lib/layers/layout';
import { LAYERS, type LegendRow, type SwatchKey } from '../lib/layers/registry';
import type { useLayers } from '../lib/layers/useLayers';
import { Icon, type IconName } from './icons';
import { BORDER, HOTSPOT, WALK_STYLE } from './map/types';
import { SwitchRow } from './SwitchRow';
import { Tooltip } from './Tooltip';
import { theme } from './ui';
import { WalkBandIcon } from './WalkBandIcon';

/** The legend swatch of each row: the colour the map draws it in, at the map's own strength over the map's own ground (layers audit 11). */
const SWATCH: Record<SwatchKey, { color: string; opacity: number; outline?: boolean }> = {
  foot: { color: WALK_STYLE.foot.color, opacity: WALK_STYLE.foot.opacity },
  car: { color: WALK_STYLE.car.color, opacity: WALK_STYLE.car.opacity },
  hotspot: { color: HOTSPOT, opacity: 0.85 },
  'border-tint': { color: BORDER.color, opacity: BORDER.fillOpacity, outline: true },
  'border-line': { color: BORDER.lined, opacity: BORDER.linedOpacity, outline: true },
};

const BUTTON = 44;
/** The button's width and the gap to the panel beside it. */
const BESIDE = BUTTON + 8;

function Swatch(props: { swatch: SwatchKey; testID: string }) {
  const sw = SWATCH[props.swatch];
  return (
    <View testID={props.testID} style={[styles.swatch, sw.outline && { borderColor: sw.color }]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: sw.color, opacity: sw.opacity }]} />
    </View>
  );
}

function Legend(props: { row: LegendRow }) {
  const { row } = props;
  const content = (
    <>
      <Swatch swatch={row.swatch} testID={`layer-swatch-${row.key}`} />
      {row.band ? <WalkBandIcon band={row.band} size={22} /> : null}
      <Text style={styles.label}>{row.text}</Text>
    </>
  );
  return (
    <View testID={`layer-legend-${row.key}`}>
      {row.tip ? (
        <Tooltip text={row.tip} label={row.text} testID={row.band ? `walk-tip-${row.key}` : `layer-tip-${row.key}`}>{content}</Tooltip>
      ) : (
        <View style={styles.plainRow}>{content}</View>
      )}
    </View>
  );
}

/**
 * The Layers button and its panel (specs/map-layers ML3-ML6): one round outlined button in the map's edge column, opening a card
 * beside it with a switch per layer and, under a layer that is on, its legend. The card opens to the button's left, from its top
 * down, scrolling inside what room there is (layers audit 1, 3), so a short phone and a wide Explore both fit; a layer's
 * legend rows each say what they mean in a line beneath them when pressed. Inline, never a `Modal`. The button says a layer is on by
 * its glyph and a firmer edge, not by an accent fill (the vision review). `notes` are quiet lines per layer; no count is shown.
 */
export function LayersControl(props: {
  layers: ReturnType<typeof useLayers>;
  notes?: Record<string, string | null | undefined>;
  /** Anchored from the bottom (the walk) or from the top (Explore); the panel is placed from the button's top either way. */
  bottom?: number;
  top?: number;
  right?: number;
  /** The width of the map's own pane, where it is narrower than the window (a wide Explore, layers audit 3). */
  paneWidth?: number;
  /** How far above the screen's bottom the panel stops (the strip, the tab bar). */
  clearBottom?: number;
}) {
  const { width: winW, height: winH } = useWindowDimensions();
  const right = props.right ?? Math.max(12, (winW - 640) / 2 + 12);
  const { layers } = props;
  const { closePanel } = layers;
  const buttonTop = props.top !== undefined ? props.top : winH - (props.bottom ?? 0) - BUTTON;
  const box = panelBox({ windowW: winW, windowH: winH, buttonTop, right, paneWidth: props.paneWidth, clearBottom: props.clearBottom ?? 160 });
  const anyOn = LAYERS.some((l) => layers.on[l.id]);
  // A panel left open never follows the person to another screen: it closes when its button goes (layers audit 5).
  useEffect(() => closePanel, [closePanel]);
  useEffect(() => {
    if (!layers.open || Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closePanel();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [layers.open, closePanel]);
  return (
    <>
      <Pressable
        testID="layers"
        accessibilityRole="button"
        accessibilityLabel="Layers"
        accessibilityState={{ expanded: layers.open }}
        aria-expanded={layers.open}
        onPress={layers.togglePanel}
        style={({ pressed }) => [styles.btn, { right, top: buttonTop }, anyOn && styles.btnOn, pressed && styles.pressed]}
      >
        <Icon name={anyOn ? 'layers' : 'layers-outline'} size={24} color={theme.ink} />
      </Pressable>
      {layers.open ? (
        <View testID="layers-panel" accessibilityLabel="Layers" role="group" style={[styles.card, { right: right + BESIDE, top: buttonTop, width: box.width, maxHeight: box.maxHeight }]}>
          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {LAYERS.map((l) => {
              const on = !!layers.on[l.id];
              return (
                <View key={l.id}>
                  <SwitchRow testID={`layer-${l.id}`} label={l.name} icon={l.icon as IconName} value={on} onChange={() => layers.toggle(l.id)} />
                  {on ? (
                    <View style={styles.legend} testID={`layer-legend-${l.id}`}>
                      {l.legend.map((r) => <Legend key={r.key} row={r} />)}
                      {props.notes?.[l.id] ? <Text testID={`layer-status-${l.id}`} role="status" accessibilityLiveRegion="polite" style={styles.note}>{props.notes[l.id]}</Text> : null}
                      {l.note ? <Text testID={`layer-note-${l.id}`} style={styles.note}>{l.note}</Text> : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute', zIndex: 3, width: BUTTON, height: BUTTON, borderRadius: BUTTON / 2, alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.edge,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 3,
  },
  btnOn: { borderWidth: 2, borderColor: theme.ink },
  pressed: { opacity: 0.8 },
  card: {
    position: 'absolute', zIndex: 3, paddingVertical: 4, borderRadius: theme.radius, backgroundColor: theme.glass, borderWidth: 1, borderColor: theme.line,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  legend: { paddingHorizontal: 16, paddingBottom: 8, gap: 4 },
  plainRow: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 8 },
  swatch: { width: 20, height: 20, borderRadius: 4, overflow: 'hidden', backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.line },
  label: { color: theme.ink, fontSize: 14, flexShrink: 1 },
  note: { color: theme.muted, fontSize: 12, lineHeight: 16 },
});
