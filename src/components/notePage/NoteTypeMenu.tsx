import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NOTE_TYPES, type NoteType } from '../../lib/noteType';
import { Icon, type IconName } from '../icons';
import { theme } from '../ui';

/** "No type" first, then the eight in their fixed order: five down the left column, four down the right (note-types audit 8). */
const ENTRIES: { id: NoteType | null; glyph: string | null; name: string }[] = [{ id: null, glyph: null, name: 'No type' }, ...NOTE_TYPES];

/**
 * A note's type, chosen on its page (NY6, decision 0161): nine entries in two columns, all in view at once, each with its
 * ink glyph and spoken name, the chosen one marked by a tint, a heavier label and a check (never colour alone). Drawn in
 * the page, above its bar, as the format panel is; never a Modal of its own.
 */
export function NoteTypeMenu(props: { chosen: NoteType | null; onChoose: (t: NoteType | null) => void }) {
  return (
    <View testID="note-type-menu" style={styles.menu} accessibilityRole="radiogroup" accessibilityLabel="Type">
      {[ENTRIES.slice(0, 5), ENTRIES.slice(5)].map((col, ci) => (
        <View key={ci} style={styles.col}>
          {col.map((t) => (
            <Pressable
              key={t.id ?? 'none'}
              testID={`note-type-item-${t.id ?? 'none'}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: props.chosen === t.id }}
              accessibilityLabel={t.name}
              onPress={() => props.onChoose(t.id)}
              style={[styles.item, props.chosen === t.id && styles.itemOn]}
            >
              <View style={styles.glyph}>
                {t.glyph ? <Icon name={t.glyph as IconName} size={22} color={theme.ink} testID={`note-type-glyph-${t.id}`} /> : null}
              </View>
              <Text style={[styles.name, props.chosen === t.id && styles.nameOn]}>{t.name}</Text>
              {props.chosen === t.id && <Icon name="checkmark" size={18} color={theme.ink} testID="note-type-check" />}
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  menu: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.line, backgroundColor: theme.surface, paddingHorizontal: 8, paddingVertical: 4 },
  col: { width: '50%' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 10, borderRadius: 8 },
  itemOn: { backgroundColor: '#ebe7df' },
  glyph: { width: 24, alignItems: 'center' },
  name: { fontSize: 16, color: theme.ink, flexGrow: 1, flexShrink: 1 },
  nameOn: { fontWeight: '600' },
});
