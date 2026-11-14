import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ReactionId } from '../../lib/reactions/core';
import { LENS_EMPTY, type LensGroup } from '../../lib/reactions/lens';
import { Icon, type IconName } from '../icons';
import { theme } from '../ui';

/**
 * Reactions in the journal's contents (RX22, RX23): under each family's word, one row per reaction a kept moment has,
 * its glyph and its lens's name in words ("Ideas"), with a disclosure. Never a count, a share or a bar; a reaction no
 * moment has is not listed; with none at all, one line.
 */
export function ReactionsScreen(props: { groups: LensGroup[] | null; onBack: () => void; onOpen: (id: ReactionId) => void }) {
  return (
    <View style={styles.wrap} testID="reactions-screen">
      <Pressable testID="reactions-back" accessibilityRole="button" accessibilityLabel="Back to the journal" onPress={props.onBack} style={styles.back}>
        <Icon name="chevron-back" size={20} color={theme.ink} />
        <Text style={styles.backText}>Journal</Text>
      </Pressable>
      <Text style={styles.title} accessibilityRole="header">Reactions</Text>
      {props.groups && props.groups.length === 0 ? <Text style={styles.hint} testID="reactions-empty">{LENS_EMPTY}</Text> : null}
      {(props.groups ?? []).map((g) => (
        <View key={g.family} style={styles.group}>
          <Text style={styles.family} accessibilityRole="header">{g.name}</Text>
          {g.rows.map((r) => (
            <Pressable
              key={r.id}
              testID={`lens-row-${r.id}`}
              accessibilityRole="button"
              accessibilityLabel={r.lens}
              onPress={() => props.onOpen(r.id)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <Icon name={r.glyph as IconName} size={22} color={theme.ink} />
              <Text style={styles.name}>{r.lens}</Text>
              <Icon name="chevron-forward" size={18} color={theme.muted} />
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' },
  backText: { color: theme.ink, fontSize: 16 },
  title: { color: theme.ink, fontSize: 28, fontWeight: '700' },
  hint: { color: theme.muted, fontSize: 15 },
  group: { gap: 2 },
  family: { color: theme.muted, fontSize: 13, fontWeight: '600', paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.line },
  pressed: { opacity: 0.6 },
  name: { flex: 1, color: theme.ink, fontSize: 17 },
});
