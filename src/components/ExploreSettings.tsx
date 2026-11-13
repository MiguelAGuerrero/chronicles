import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent, type StyleProp, type TextStyle } from 'react-native';
import { COMPLEX_NOTE, switchLabel } from '../lib/complexes/kinds';
import { useHiddenKinds } from '../lib/complexes/useComplexes';
import { COMPLEX_KINDS } from '../lib/complexes/types';
import { kindRows, kindSwitch } from '../lib/discovery/refinements';
import { EXPLORE_RULES, KINDS, type Kind } from '../lib/explore/explore';
import { formatRange } from '../lib/format';
import { useUnits } from '../lib/useUnits';
import { Icon, type IconName } from './icons';
import { SwitchRow } from './SwitchRow';
import { theme } from './ui';

/** About how long the range takes to walk, at 1.3 m/s. */
export const walkNote = (m: number) => {
  const min = Math.max(1, Math.round(m / 1.3 / 60));
  return `about ${min} min walk`;
};

/** What passing means (TC7): in words, with no count of places. */
export const passNote = (m: number) => `A place is passed when you come within ${formatRange(m)} of it. It is said in words, never counted.`;

/** What I'm into (E16): a switch per kind, on unless hidden. Shared with Navigate's drawer (NV21). */
export function KindSwitches({ hidden, onToggle }: { hidden: Set<Kind>; onToggle: (k: Kind, on: boolean) => void }) {
  return (
    <>
      {kindRows(KINDS, hidden).map(({ kind: k, depth }) => {
        // PC23: a subset shows, indented under its parent, only while the parent is on.
        const sw = kindSwitch(hidden, k.id);
        return <SwitchRow key={k.id} testID={`kind-${k.id}`} icon={k.icon as IconName} label={k.label} value={sw.on} disabled={sw.locked} indent={depth} onChange={(v) => onToggle(k.id, v)} />;
      })}
    </>
  );
}

/** Complexes (CX10): a switch per kind beside What I'm into, on unless hidden, saved as it changes. A kind off leaves the card and the map, never the data. */
export function ComplexKindSwitches({ sectionStyle }: { sectionStyle: StyleProp<TextStyle> }) {
  const { hidden, set } = useHiddenKinds();
  return (
    <>
      <Text style={sectionStyle} accessibilityRole="header">Complexes</Text>
      <Text style={styles.complexNote}>{COMPLEX_NOTE}</Text>
      {COMPLEX_KINDS.map((k) => (
        <SwitchRow key={k} testID={`complex-kind-${k}`} label={switchLabel(k)} value={!hidden.includes(k)} onChange={(on) => set(on ? hidden.filter((x) => x !== k) : [...hidden, k])} />
      ))}
    </>
  );
}

export interface SliderScale {
  min: number;
  max: number;
  step: number;
  /** The test ids' prefix and the screen reader's name. */
  id: string;
  name: string;
}
const RANGE_SCALE: SliderScale = { min: EXPLORE_RULES.rangeMin, max: EXPLORE_RULES.rangeMax, step: EXPLORE_RULES.rangeStep, id: 'range', name: 'Question mark range' };
/** The pass-by distance (TC7): how close counts as passing a place. */
export const PASS_SCALE: SliderScale = { min: EXPLORE_RULES.passMin, max: EXPLORE_RULES.passMax, step: EXPLORE_RULES.passStep, id: 'pass', name: 'Pass-by distance' };

/** A stepped slider for the range (E20): drag, tap the track, or use − and +; adjustable for screen readers. */
export function RangeSlider({ value, onChange, scale = RANGE_SCALE }: { value: number; onChange: (m: number) => void; scale?: SliderScale }) {
  const STEPS = (scale.max - scale.min) / scale.step;
  // The range in the units setting's terms (QL14); redrawn when it changes.
  useUnits();
  const [width, setWidth] = useState(0);
  const latest = useRef({ width, onChange });
  useEffect(() => {
    latest.current = { width, onChange };
  });
  const at = (x: number) => {
    const w = latest.current.width;
    if (!w) return;
    const f = Math.max(0, Math.min(1, x / w));
    latest.current.onChange(scale.min + Math.round(f * STEPS) * scale.step);
  };
  const f = (value - scale.min) / (scale.max - scale.min);
  const step = scale.step;
  return (
    <View style={styles.sliderRow}>
      <Pressable testID={`${scale.id}-minus`} accessibilityRole="button" accessibilityLabel={`Smaller ${scale.name.toLowerCase()}`} onPress={() => onChange(value - step)} style={styles.stepBtn} hitSlop={6}>
        <Icon name="remove" size={20} color={theme.ink} />
      </Pressable>
      <View
        testID={`${scale.id}-slider`}
        style={styles.track}
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => at(e.nativeEvent.locationX)}
        onResponderMove={(e) => at(e.nativeEvent.locationX)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={scale.name}
        accessibilityValue={{ min: scale.min, max: scale.max, now: value, text: formatRange(value) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => onChange(value + (e.nativeEvent.actionName === 'increment' ? step : -step))}
      >
        <View style={styles.rail} pointerEvents="none" />
        <View style={[styles.fill, { width: `${f * 100}%` }]} pointerEvents="none" />
        <View style={[styles.thumb, { left: `${f * 100}%` }]} pointerEvents="none" />
      </View>
      <Pressable testID={`${scale.id}-plus`} accessibilityRole="button" accessibilityLabel={`Larger ${scale.name.toLowerCase()}`} onPress={() => onChange(value + step)} style={styles.stepBtn} hitSlop={6}>
        <Icon name="add" size={20} color={theme.ink} />
      </Pressable>
      <Text testID={`${scale.id}-value`} style={styles.value}>{formatRange(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  complexNote: { fontSize: 13, color: theme.muted, marginBottom: 4 },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // 44 pt, not hit slop: react-native-web has none (U4).
  stepBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: theme.edge, alignItems: 'center', justifyContent: 'center' },
  track: { flex: 1, height: 44, justifyContent: 'center' },
  rail: { height: 4, borderRadius: 2, backgroundColor: theme.edge },
  fill: { position: 'absolute', left: 0, height: 4, borderRadius: 2, backgroundColor: '#1a73e8' },
  thumb: {
    position: 'absolute', width: 24, height: 24, marginLeft: -12, borderRadius: 12, backgroundColor: '#ffffff',
    borderWidth: 2, borderColor: '#1a73e8',
  },
  value: { width: 56, textAlign: 'right', fontSize: 15, fontWeight: '700', color: theme.ink },
});
