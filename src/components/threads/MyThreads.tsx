import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../ui';

export interface MyThreadRow {
  id: string;
  title: string;
  /** The oldest moment's own first words, a second line under an unnamed thread's place and date (OT13). */
  sub: string | null;
  /** "a few moments, since March" (OT10). */
  line: string;
}

/**
 * The threads the owner made (OT12), apart from the Chronicle's own rail above it: their own heading, the latest
 * first, no rank, count or progress. Absent of rows, a hint says how one is made.
 */
export function MyThreads(props: { rows: MyThreadRow[]; onOpen: (id: string) => void }) {
  return (
    <View style={styles.sec} testID="my-threads">
      <View>
        <Text style={styles.h} accessibilityRole="header">Your threads</Text>
        <Text style={styles.sub}>Moments you connected</Text>
      </View>
      {props.rows.length === 0 ? (
        <Text style={styles.hint} testID="my-threads-hint">Connect moments from a moment’s menu: Add to a thread.</Text>
      ) : (
        <View style={styles.list}>
          {props.rows.map((r) => (
            <Pressable key={r.id} testID="my-thread-row" accessibilityRole="button" accessibilityLabel={`${r.title}. ${r.line}`} onPress={() => props.onOpen(r.id)} style={styles.row}>
              <Text style={styles.name} numberOfLines={1}>{r.title}</Text>
              {r.sub ? <Text style={styles.words} numberOfLines={1}>{r.sub}</Text> : null}
              <Text style={styles.line}>{r.line}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sec: { gap: 10 },
  h: { color: theme.ink, fontSize: 16, fontWeight: '700' },
  sub: { color: theme.muted, fontSize: 13 },
  hint: { color: theme.muted, fontSize: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.line, borderRadius: 14, padding: 12 },
  list: { gap: 8 },
  row: { backgroundColor: theme.surface, borderRadius: 18, borderWidth: 1, borderColor: theme.line, padding: 12, gap: 2, minHeight: 56 },
  name: { color: theme.ink, fontSize: 16, fontWeight: '700' },
  words: { color: theme.ink, fontSize: 14 },
  line: { color: theme.muted, fontSize: 12.5 },
});
