import { StyleSheet, Text, View } from 'react-native';
import { LEANING_WORDS, LEANINGS, type Leaning } from '../lib/nav/scenic';
import { routeLeanings } from '../lib/routeLeanings';
import { useStore } from '../lib/useStore';
import type { IconName } from './icons';
import { SwitchRow } from './SwitchRow';
import { theme } from './ui';

/** Each leaning's icon; its words are `LEANING_WORDS` (SF8). */
const ICONS: Record<Leaning, IconName> = { green: 'leaf-outline', sights: 'eye-outline', storefronts: 'storefront-outline' };

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
        <SwitchRow key={l} testID={`leaning-${l}`} label={LEANING_WORDS[l].label} note={LEANING_WORDS[l].note} icon={ICONS[l]} value={on.includes(l)} onChange={(v) => set(l, v)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 4 },
  section: { fontSize: 15, fontWeight: '700', color: theme.ink, marginTop: 6 },
  sub: { fontSize: 13, color: theme.muted },
});
