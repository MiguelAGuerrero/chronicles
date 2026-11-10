import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHidden } from '../../lib/deletion/useDeletions';
import type { MomentView } from '../../lib/resurface/types';
import { fromLine } from '../../lib/resurface/views';
import { contextLine } from '../../lib/threads/lines';
import { filterPicker } from '../../lib/threads/picker';
import type { MomentPool } from './useMomentPool';
import { Icon } from '../icons';
import { theme } from '../ui';

const KIND_WORD = { photo: 'Photo', video: 'Video', voice: 'Voice memo', text: 'Note' } as const;
const PAGE = 40;

/** A moment as the pickers list it (OT5, OT9): its place and date, its walk, and its own first words. Never bare. */
function rowOf(v: MomentView, pool: MomentPool, now: number) {
  return {
    context: contextLine({ place: v.place, t: v.t, walkLine: fromLine(v.walkId ? pool.walks.get(v.walkId) : undefined), now }),
    words: v.words ? v.words.trim().slice(0, 90) : KIND_WORD[v.kind],
  };
}

/**
 * A moment picker (moment references RF1, RF7): the one Add to a thread uses, by words, place or date, a page at a
 * time, never the moment itself and nothing waiting in Undo. `only` keeps it to some moments (the notes that mention
 * one). Drawn inside the editor's or the viewer's Modal, never as a second one.
 */
export function MomentPicker(props: { pool: MomentPool; self: string | null; title: string; only?: string[]; onPick: (v: MomentView) => void; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const hidden = useHidden();
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [now] = useState(() => Date.now());
  const found = useMemo(() => {
    const only = props.only ? new Set(props.only) : null;
    const items = props.pool.views
      .filter((v) => !only || only.has(v.id))
      .map((v) => ({ id: v.id, t: v.t, words: v.words, context: rowOf(v, props.pool, now).context }));
    return filterPicker(items, { hidden, self: props.self ?? '', query, limit });
  }, [props.pool, props.only, props.self, hidden, query, limit, now]);
  const shown = found.shown.map((i) => props.pool.byId.get(i.id)).filter((v): v is MomentView => !!v);
  return (
    <View style={[StyleSheet.absoluteFill, styles.back, { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.card} testID="moment-picker" accessibilityViewIsModal>
        <View style={styles.head}>
          <Text style={styles.title} accessibilityRole="header">{props.title}</Text>
          <Pressable testID="moment-picker-close" accessibilityRole="button" accessibilityLabel="Close" onPress={props.onClose} hitSlop={8} style={styles.x}>
            <Icon name="close" size={22} color={theme.ink} />
          </Pressable>
        </View>
        {!props.only && (
          <TextInput
            testID="moment-picker-search"
            value={query}
            onChangeText={(t) => {
              setQuery(t);
              setLimit(PAGE);
            }}
            placeholder="Search words, places or dates"
            placeholderTextColor={theme.muted}
            accessibilityLabel="Search words, places or dates"
            style={styles.input}
          />
        )}
        <ScrollView style={styles.list} contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
          {props.pool.ready && shown.length === 0 ? <Text style={styles.sub}>No other moment matches.</Text> : null}
          {shown.map((v) => {
            const r = rowOf(v, props.pool, now);
            return (
              <Pressable key={v.id} testID="moment-picker-row" accessibilityRole="button" accessibilityLabel={`${r.words}. ${r.context}`} onPress={() => props.onPick(v)} style={styles.row}>
                <Text style={styles.name} numberOfLines={2}>{r.words}</Text>
                <Text style={styles.sub} numberOfLines={1}>{r.context}</Text>
              </Pressable>
            );
          })}
          {found.more ? (
            <Pressable testID="moment-picker-more" accessibilityRole="button" onPress={() => setLimit((l) => l + PAGE)} style={styles.row}>
              <Text style={styles.name}>Show more</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { backgroundColor: 'rgba(20,24,32,0.7)', paddingHorizontal: 12, alignItems: 'center' },
  card: { width: '100%', maxWidth: 520, flex: 1, backgroundColor: theme.surface, borderRadius: 18, padding: 12, gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { color: theme.ink, fontSize: 17, fontWeight: '700', flex: 1 },
  x: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  list: { flex: 1 },
  pad: { gap: 6, paddingBottom: 8 },
  row: { minHeight: 56, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: theme.line, gap: 2 },
  name: { color: theme.ink, fontSize: 16, fontWeight: '600' },
  sub: { color: theme.muted, fontSize: 13 },
  input: { backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.edge, borderRadius: 12, paddingHorizontal: 12, minHeight: 48, color: theme.ink, fontSize: 16 },
});
