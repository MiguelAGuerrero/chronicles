import { StyleSheet, Text, View } from 'react-native';
import { ordered, type ReactionSet } from '../../lib/reactions/core';
import { Icon, type IconName } from '../icons';
import { theme } from '../ui';

/**
 * A moment's reactions as the owner chose them (RX14-RX16, RX36): each its ink glyph and its name, in the families'
 * order, on one line that wraps. Nothing for a moment with none. Never a count, a colour or anyone else's reaction.
 * `quiet`: a parent already says them, so they are hidden from a screen reader.
 */
export function ReactionMarks({ set, quiet = false, inverse = false, style }: { set: ReactionSet; quiet?: boolean; inverse?: boolean; style?: object }) {
  const rs = ordered(set);
  // On the viewer's dark strip the same marks are drawn in the page's white (`inverse`): one colour either way.
  const ink = inverse ? theme.bg : theme.ink;
  if (!rs.length) return null;
  return (
    <View
      style={[styles.row, style]}
      testID="reaction-marks"
      accessible={!quiet}
      accessibilityLabel={rs.map((r) => r.name).join(', ')}
      aria-hidden={quiet || undefined}
    >
      {rs.map((r) => (
        <View key={r.id} style={styles.mark} testID={`reaction-mark-${r.id}`} aria-label={r.name}>
          <Icon name={r.glyph as IconName} size={16} color={ink} testID={`reaction-glyph-${r.id}`} />
          <Text style={[styles.name, { color: ink }]} testID="reaction-name">{r.name}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 12, rowGap: 4 },
  mark: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { fontSize: 14, color: theme.ink },
});
