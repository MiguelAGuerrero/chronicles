import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Section } from '../../lib/resurface/section';
import { theme } from '../ui';

const SECTIONS: { key: Section; label: string }[] = [
  { key: 'memories', label: 'Memories' },
  { key: 'walks', label: 'Walks' },
  { key: 'days', label: 'Days' },
  { key: 'map', label: 'Map' },
  { key: 'media', label: 'Media' },
];

/**
 * Chronicle's sections (RM1): Memories first, then the walks list, the days list, the map and the media gallery (MG1).
 * The five pills share the row, so all fit on a 320 px phone on one line (MG2).
 */
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
            <Text style={[styles.label, on && styles.labelOn]} numberOfLines={1}>{s.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', gap: 4, paddingHorizontal: 8, paddingVertical: 8, backgroundColor: theme.bg, width: '100%', maxWidth: 640, alignSelf: 'center' },
  tab: { flexGrow: 1, flexShrink: 1, flexBasis: 'auto', minHeight: 44, paddingHorizontal: 6, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface },
  on: { backgroundColor: theme.ink, borderColor: theme.ink },
  label: { color: theme.ink, fontSize: 14, fontWeight: '600' },
  labelOn: { color: theme.bg },
});
