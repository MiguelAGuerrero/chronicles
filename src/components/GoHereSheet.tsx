import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { goHereChoices, goHereWords, sheetEdge, type GoHereChoice } from '../lib/atlas/goHere';
import { Icon } from './icons';
import { theme } from './ui';

/**
 * Go here's two choices (GH2): Chronicles first, then the phone's maps app. A plain card over the row, never a Modal (iOS
 * can't present one over another), with no scrim, so the capture stack stays where it is and answers (GH12). Back and
 * Escape close it (the screen listens); the close button too. No minutes, no ranking: two ways of being taken.
 */
export function GoHereSheet(props: {
  name: string;
  mapsApp: string;
  mapsHint?: string;
  /** The street Go here starts you on, when it starts you on one (audit 9). */
  via?: string | null;
  /** A destination is already saved: said once, that this replaces it. */
  replaces: boolean;
  /** A walk is open: the Chronicles row routes it (GE4). */
  walkOpen?: boolean;
  /** Where the sheet sits: Explore's at the foot, Chronicle's at the top, clear of the capture band (GE9). */
  anchor?: 'top' | 'bottom';
  onChoose: (id: GoHereChoice['id']) => void;
  onClose: () => void;
}) {
  const [title, ...notes] = goHereWords(props.name, props.replaces, props.via);
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, sheetEdge(props.anchor ?? 'bottom', insets)]} pointerEvents="box-none">
      <View style={styles.sheet} testID="go-here-sheet" accessibilityViewIsModal>
        <View style={styles.head}>
          <View style={styles.headText}>
            <Text style={styles.title} numberOfLines={2} accessibilityRole="header">{title}</Text>
            {notes.map((n) => <Text key={n} style={styles.note}>{n}</Text>)}
          </View>
          <Pressable testID="go-here-close" accessibilityRole="button" accessibilityLabel="Close" onPress={props.onClose} style={styles.close} hitSlop={8}>
            <Icon name="close" size={20} color={theme.ink} />
          </Pressable>
        </View>
        {goHereChoices(props.mapsApp, props.mapsHint, props.walkOpen).map((c) => (
          <Pressable
            key={c.id}
            testID={`go-here-${c.id}`}
            accessibilityRole="button"
            accessibilityLabel={`${c.label}. ${c.hint}`}
            onPress={() => props.onChoose(c.id)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={styles.rowText}>
              <Text style={styles.label} testID={`go-here-${c.id}-label`}>{c.label}</Text>
              <Text style={styles.hint} testID={`go-here-${c.id}-hint`}>{c.hint}</Text>
            </View>
            {/* The maps row leaves the app: its glyph says so; Chronicles' stays a way further in (explore-go-here ui 1). */}
            {c.id === 'maps' ? <View testID="go-here-maps-external"><Icon name="open-outline" size={16} color={theme.ink} /></View> : <Icon name="chevron-forward" size={16} color={theme.ink} />}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, padding: 8, zIndex: 15 },
  sheet: { backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.line, padding: 12, gap: 8, maxWidth: 520, width: '100%', alignSelf: 'center' },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingBottom: 4 },
  headText: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, fontWeight: '700', color: theme.ink, lineHeight: 20 },
  note: { fontSize: 12, color: theme.muted, lineHeight: 16 },
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: -10, marginRight: -10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 52, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: theme.line },
  rowText: { flex: 1, minWidth: 0 },
  label: { fontSize: 15, fontWeight: '600', color: theme.ink },
  hint: { fontSize: 12, color: theme.muted, lineHeight: 16 },
  pressed: { opacity: 0.7 },
});
