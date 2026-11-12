import { StyleSheet, Text, View } from 'react-native';
import { markOf } from '../lib/noteType';
import type { CaptureKind } from '../lib/types';
import { Icon, type IconName } from './icons';
import { theme } from './ui';

/**
 * A note's type, as the owner chose it (NY9, NY17, decision 0149): an ink glyph and its spoken name, one line above
 * the note's words. Drawn for a note with a type and nothing for one without. Plain ink, never a colour, a count or a
 * reaction anyone else made.
 */
export function NoteMark({ capture }: { capture: { kind: CaptureKind; note_type?: string | null } }) {
  const m = markOf(capture);
  if (!m) return null;
  return (
    <View style={styles.row} testID="note-type-mark" accessible accessibilityLabel={m.name}>
      <Icon name={m.glyph as IconName} size={16} color={theme.ink} testID={`note-type-glyph-${m.id}`} />
      <Text style={styles.name}>{m.name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  name: { fontSize: 13, color: theme.muted },
});
