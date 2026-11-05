import { StyleSheet, Text, View } from 'react-native';
import { LEANINGS, type Leaning } from '../lib/nav/scenic';
import { routeLeanings } from '../lib/routeLeanings';
import { useStore } from '../lib/useStore';
import type { IconName } from './icons';
import { SwitchRow } from './SwitchRow';
import { theme } from './ui';

const ROWS: Record<Leaning, { label: string; note: string; icon: IconName }> = {
  green: { label: 'Green', note: 'Through parks, gardens and woods', icon: 'leaf-outline' },
  sights: { label: 'Sights', note: 'Past places worth seeing, of the kinds you’re into', icon: 'eye-outline' },
  busy: { label: 'Streets with life', note: 'Along the busy streets: shops, cafés, the high street', icon: 'storefront-outline' },
};

const all = (s: readonly Leaning[]) => s;

/**
 * Scenic routes (SR1): what a scenic route may lean toward, in the walk settings. Each switch
 * saves as it changes; with all three off, Go here takes the direct way with no preview.
 */
export function RouteLeaningSettings(props: { sectionStyle?: object }) {
  const on = useStore(routeLeanings.store, all);
  const set = (l: Leaning, value: boolean) => void routeLeanings.save(value ? [...on, l] : on.filter((x) => x !== l));
  return (
    <View testID="route-leanings" style={styles.box}>
      <Text style={[styles.section, props.sectionStyle]} accessibilityRole="header">Scenic routes</Text>
      <Text style={styles.sub}>When you pick a destination: the direct way, and up to three a little longer that lean toward these.</Text>
      {LEANINGS.map((l) => (
        <SwitchRow key={l} testID={`leaning-${l}`} label={ROWS[l].label} note={ROWS[l].note} icon={ROWS[l].icon} value={on.includes(l)} onChange={(v) => set(l, v)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 4 },
  section: { fontSize: 15, fontWeight: '700', color: theme.ink, marginTop: 6 },
  sub: { fontSize: 13, color: theme.muted },
});
