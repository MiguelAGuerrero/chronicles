import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Section } from '../../lib/resurface/section';
import { theme } from '../ui';

const SECTIONS: { key: Section; label: string }[] = [
  { key: 'memories', label: 'Memories' },
  { key: 'walks', label: 'Walks' },
  { key: 'days', label: 'Days' },
  { key: 'map', label: 'Map' },
];

/** Chronicle's sections (RM1): Memories first, then the walks list, the days list and the map. */
export function SectionBar(props: { section: Section; onChange: (s: Section) => void }) {
  return (
    <View style={styles.bar} accessibilityRole="tablist" testID="chronicle-sections">
      {SECTIONS.map((s) => {
        const on = s.key === props.section;
        return (
          <Pressable
            key={s.key}
            testID={`section-${s.key}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            aria-selected={on}
            onPress={() => props.onChange(s.key)}
            style={[styles.tab, on && styles.on]}
          >
            <Text style={[styles.label, on && styles.labelOn]}>{s.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: theme.bg },
  tab: { minHeight: 44, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center', borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface },
  on: { backgroundColor: theme.ink, borderColor: theme.ink },
  label: { color: theme.ink, fontSize: 14, fontWeight: '600' },
  labelOn: { color: theme.bg },
});
