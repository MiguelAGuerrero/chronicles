import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent, type StyleProp, type TextStyle } from 'react-native';
import { COMPLEX_NOTE, switchLabel } from '../lib/complexes/kinds';
import { useHiddenKinds } from '../lib/complexes/useComplexes';
import { COMPLEX_KINDS } from '../lib/complexes/types';
import { kindSwitch } from '../lib/discovery/refinements';
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

/** What I'm into (E16): a switch per kind, on unless hidden. Shared with Navigate's drawer (NV21). */
export function KindSwitches({ hidden, onToggle }: { hidden: Set<Kind>; onToggle: (k: Kind, on: boolean) => void }) {
  return (
    <>
      {KINDS.map((k) => {
        // PC23: a subset reads off and cannot be switched on while its parent is off.
        const sw = kindSwitch(hidden, k.id);
        return <SwitchRow key={k.id} testID={`kind-${k.id}`} icon={k.icon as IconName} label={k.label} value={sw.on} disabled={sw.locked} onChange={(v) => onToggle(k.id, v)} />;
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

const STEPS = (EXPLORE_RULES.rangeMax - EXPLORE_RULES.rangeMin) / EXPLORE_RULES.rangeStep;

/** A stepped slider for the range (E20): drag, tap the track, or use − and +; adjustable for screen readers. */
export function RangeSlider({ value, onChange }: { value: number; onChange: (m: number) => void }) {
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
    latest.current.onChange(EXPLORE_RULES.rangeMin + Math.round(f * STEPS) * EXPLORE_RULES.rangeStep);
  };
  const f = (value - EXPLORE_RULES.rangeMin) / (EXPLORE_RULES.rangeMax - EXPLORE_RULES.rangeMin);
  const step = EXPLORE_RULES.rangeStep;
  return (
    <View style={styles.sliderRow}>
      <Pressable testID="range-minus" accessibilityRole="button" accessibilityLabel="Smaller range" onPress={() => onChange(value - step)} style={styles.stepBtn} hitSlop={6}>
        <Icon name="remove" size={20} color={theme.ink} />
      </Pressable>
      <View
        testID="range-slider"
        style={styles.track}
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => at(e.nativeEvent.locationX)}
        onResponderMove={(e) => at(e.nativeEvent.locationX)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Question mark range"
        accessibilityValue={{ min: EXPLORE_RULES.rangeMin, max: EXPLORE_RULES.rangeMax, now: value, text: formatRange(value) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => onChange(value + (e.nativeEvent.actionName === 'increment' ? step : -step))}
      >
        <View style={styles.rail} pointerEvents="none" />
        <View style={[styles.fill, { width: `${f * 100}%` }]} pointerEvents="none" />
        <View style={[styles.thumb, { left: `${f * 100}%` }]} pointerEvents="none" />
      </View>
      <Pressable testID="range-plus" accessibilityRole="button" accessibilityLabel="Larger range" onPress={() => onChange(value + step)} style={styles.stepBtn} hitSlop={6}>
        <Icon name="add" size={20} color={theme.ink} />
      </Pressable>
      <Text testID="range-value" style={styles.value}>{formatRange(value)}</Text>
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
