import { StyleSheet, Text, View } from 'react-native';
import { markOf } from '../lib/noteType';
import type { CaptureKind } from '../lib/types';
import { Icon, type IconName } from './icons';
import { theme } from './ui';

/**
 * A note's type, as the owner chose it (NY9, NY17, decision 0161): an ink glyph and its spoken name, one line above
 * the note's words. Drawn for a note with a type and nothing for one without. Plain ink, never a colour, a count or a
 * reaction anyone else made. `quiet`: a parent already says the type, so it is hidden from a screen reader (audit 3).
 */
export function NoteMark({ capture, quiet = false }: { capture: { kind: CaptureKind; note_type?: string | null }; quiet?: boolean }) {
  const m = markOf(capture);
  if (!m) return null;
  return (
    <View style={styles.row} testID="note-type-mark" accessible={!quiet} accessibilityLabel={m.name} aria-hidden={quiet || undefined}>
      <Icon name={m.glyph as IconName} size={16} color={theme.ink} testID={`note-type-glyph-${m.id}`} />
      <Text style={styles.name}>{m.name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  name: { fontSize: 14, color: theme.ink },
});
