import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { EXPLORE_RULES, KINDS, type Kind } from '../lib/explore/explore';
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
      {KINDS.map((k) => (
        <SwitchRow key={k.id} testID={`kind-${k.id}`} icon={k.icon as IconName} label={k.label} value={!hidden.has(k.id)} onChange={(v) => onToggle(k.id, v)} />
      ))}
    </>
  );
}

const STEPS = (EXPLORE_RULES.rangeMax - EXPLORE_RULES.rangeMin) / EXPLORE_RULES.rangeStep;

/** A stepped slider for the range (E20): drag, tap the track, or use − and +; adjustable for screen readers. */
export function RangeSlider({ value, onChange }: { value: number; onChange: (m: number) => void }) {
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
        accessibilityValue={{ min: EXPLORE_RULES.rangeMin, max: EXPLORE_RULES.rangeMax, now: value, text: `${value} metres` }}
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
      <Text testID="range-value" style={styles.value}>{value} m</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
