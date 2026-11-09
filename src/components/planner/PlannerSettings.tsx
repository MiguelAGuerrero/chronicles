import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDistance } from '../../lib/format';
import { kindWalkPrefs } from '../../lib/kindWalk/app';
import { nearestStep, stepBudget, type WalkabilityPref } from '../../lib/kindWalk/settings';
import type { KindWalkPrefs } from '../../lib/kindWalk/prefs';
import { prefLabel } from '../../lib/kindWalk/words';
import { DENSITIES } from '../../lib/walkPlanner/settings';
import type { Units } from '../../lib/units';
import type { CategoryId } from '../../lib/discovery/types';
import { CEILING_HEADING, CEILING_NOTE, DENSITY_LABEL, MODE_HEADING, MODE_LABEL, densityHeading, settingsHeading } from '../../lib/walkPlanner/words';
import { Icon } from '../icons';
import { theme } from '../ui';

/** The settings on the planner (WP8, WP10-WP12, WP27): loop or one-way, the distance, density, and what to do about cars. */
export function PlannerSettings(props: { prefs: KindWalkPrefs; units: Units; kind: CategoryId }) {
  const { prefs, units } = props;
  return (
    <View style={styles.box} testID="plan-settings">
      <Text style={styles.head} accessibilityRole="header">{settingsHeading}</Text>
      <Text style={styles.sub}>{MODE_HEADING}</Text>
      <Segment
        items={(['loop', 'oneway'] as const).map((m) => ({ id: m, label: MODE_LABEL[m], on: prefs.mode === m, onPress: () => void kindWalkPrefs.setMode(m) }))}
        id="plan-mode"
      />
      <Text style={styles.sub}>{CEILING_HEADING}</Text>
      <View style={styles.step}>
        <Pressable testID="plan-ceiling-down" accessibilityRole="button" accessibilityLabel="Lower the distance" onPress={() => void kindWalkPrefs.setBudget(stepBudget(prefs.budgetM, -1, units))} style={styles.stepBtn}>
          <Icon name="remove" size={20} color={theme.ink} />
        </Pressable>
        <Text style={styles.value} testID="plan-ceiling">{formatDistance(nearestStep(prefs.budgetM, units), units)}</Text>
        <Pressable testID="plan-ceiling-up" accessibilityRole="button" accessibilityLabel="Raise the distance" onPress={() => void kindWalkPrefs.setBudget(stepBudget(prefs.budgetM, 1, units))} style={styles.stepBtn}>
          <Icon name="add" size={20} color={theme.ink} />
        </Pressable>
      </View>
      <Text style={styles.note}>{CEILING_NOTE}</Text>
      <Text style={styles.sub}>{densityHeading(props.kind)}</Text>
      <Segment items={DENSITIES.map((d) => ({ id: d, label: DENSITY_LABEL[d], on: prefs.density === d, onPress: () => void kindWalkPrefs.setDensity(d) }))} id="plan-density" />
      <Text style={styles.sub}>A stretch built around cars</Text>
      <Segment
        items={(['warn', 'skip'] as WalkabilityPref[]).map((p) => ({ id: p, label: prefLabel(p), on: prefs.pref === p, onPress: () => void kindWalkPrefs.setPref(p) }))}
        id="plan-pref"
      />
    </View>
  );
}

function Segment(props: { id: string; items: { id: string; label: string; on: boolean; onPress: () => void }[] }) {
  return (
    <View style={styles.segment} accessibilityRole="radiogroup">
      {props.items.map((it) => (
        <Pressable
          key={it.id}
          testID={`${props.id}-${it.id}`}
          accessibilityRole="radio"
          accessibilityState={{ checked: it.on }}
          aria-checked={it.on}
          onPress={it.onPress}
          style={[styles.segBtn, it.on && styles.segOn]}
        >
          <Text style={[styles.segText, it.on && styles.segTextOn]}>{it.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 8 },
  head: { fontSize: 16, fontWeight: '700', color: theme.ink },
  sub: { fontSize: 13, color: theme.muted, marginTop: 4 },
  note: { fontSize: 13, color: theme.muted },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: theme.edge, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surface },
  value: { fontSize: 16, fontWeight: '600', color: theme.ink, minWidth: 70, textAlign: 'center' },
  segment: { flexDirection: 'row', flexWrap: 'wrap', borderRadius: 22, borderWidth: 1, borderColor: theme.edge, overflow: 'hidden', alignSelf: 'flex-start' },
  segBtn: { minHeight: 44, paddingHorizontal: 14, justifyContent: 'center', backgroundColor: theme.surface },
  segOn: { backgroundColor: theme.ink },
  segText: { fontSize: 14, fontWeight: '600', color: theme.ink },
  segTextOn: { color: '#ffffff' },
});
