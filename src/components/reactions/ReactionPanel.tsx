import { Pressable, StyleSheet, Text, View } from 'react-native';
import { familyRows, type ReactionId, type ReactionSet } from '../../lib/reactions/core';
import { Icon, type IconName } from '../icons';
import { theme } from '../ui';

const ROWS = familyRows();

/**
 * The reactions (RX6, RX10-RX12, RX34, RX36; decision 0172): three rows under the words Feeling, Taste and Thought,
 * each reaction a glyph over its name. A tap chooses it, replacing its family's, or clears it if it was the one; the
 * panel stays, so a second family is one more tap. In ink only: a chosen one is shown by weight, an ink rule under it
 * and its spoken state, never a fill or a second colour. Drawn where it is asked for (above the journal's bar, in a sheet,
 * above a page's bar); never a Modal of its own.
 */
export function ReactionPanel(props: { set: ReactionSet; onPick: (id: ReactionId) => void; testID?: string }) {
  return (
    <View testID={props.testID ?? 'reaction-panel'} style={styles.panel} accessibilityLabel="Reactions">
      {ROWS.map((f) => (
        <View key={f.id} style={styles.family} testID={`reaction-family-${f.id}`} accessibilityRole="radiogroup" accessibilityLabel={f.name}>
          <Text style={styles.familyName} testID="reaction-family-name">{f.name}</Text>
          <View style={styles.row}>
            {f.reactions.map((r) => {
              const on = props.set[f.id] === r.id;
              return (
                <Pressable
                  key={r.id}
                  testID={`reaction-pick-${r.id}`}
                  accessibilityRole="radio"
                  accessibilityLabel={`${r.name}, ${f.name}`}
                  accessibilityState={{ checked: on }}
                  aria-checked={on}
                  onPress={() => props.onPick(r.id)}
                  style={({ pressed }) => [styles.pick, on && styles.pickOn, pressed && styles.pressed]}
                >
                  <Icon name={r.glyph as IconName} size={22} color={theme.ink} testID={`reaction-glyph-${r.id}`} />
                  <Text style={[styles.name, on && styles.nameOn]} numberOfLines={1} testID="reaction-name">{r.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { width: '100%', maxWidth: 624, alignSelf: 'center', paddingHorizontal: 8, paddingBottom: 4, gap: 2 },
  family: { gap: 0 },
  familyName: { fontSize: 12, color: theme.muted, paddingHorizontal: 6, paddingTop: 4 },
  row: { flexDirection: 'row' },
  pick: { flex: 1, minHeight: 52, minWidth: 44, alignItems: 'center', justifyContent: 'center', gap: 2, borderBottomWidth: 2, borderBottomColor: 'transparent', paddingHorizontal: 2 },
  pickOn: { borderBottomColor: theme.ink },
  pressed: { opacity: 0.6 },
  name: { color: theme.ink, fontSize: 12 },
  nameOn: { fontWeight: '700' },
});
