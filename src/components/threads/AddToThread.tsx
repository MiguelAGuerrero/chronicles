import type { Faced } from '../../lib/moment';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHidden } from '../../lib/deletion/useDeletions';
import { threads } from '../../lib/threads';
import { filterPicker } from '../../lib/threads/picker';
import { contextLine, headingOf, threadLine } from '../../lib/threads/lines';
import { useThreads } from '../../lib/threads/useThreads';
import type { MomentView } from '../../lib/resurface/types';
import { fromLine, toMomentViews } from '../../lib/resurface/views';
import type { Walk } from '../../lib/types';
import { Icon } from '../icons';
import { theme } from '../ui';

const KIND_WORD = { photo: 'Photo', video: 'Video', voice: 'Voice memo', text: 'Note' } as const;
const PAGE = 40;

/** A moment as the pickers list it (OT5, OT9): its place and date, its walk, and its own first words. Never bare. */
function rowOf(m: MomentView, walks: Map<string, Walk>, now: number) {
  const walk = m.walkId ? walks.get(m.walkId) : undefined;
  return {
    context: contextLine({ place: m.place, t: m.t, walkLine: fromLine(walk), now }),
    words: m.words ? m.words.trim().slice(0, 90) : KIND_WORD[m.kind],
  };
}

/**
 * Add to a thread (OT5): the owner's threads, and A new thread, which asks for a second kept moment to join this one
 * with. Drawn inside the viewer's Modal, never as a second one (iOS can't present a Modal over a Modal). Nothing is
 * made without two kept moments (OT6).
 */
export function AddToThread(props: { moment: Faced; onClose: () => void; onDone: (message: string) => void }) {
  const insets = useSafeAreaInsets();
  const { data } = useThreads();
  const [pool, setPool] = useState<{ views: MomentView[]; walks: Map<string, Walk> } | null>(null);
  const [step, setStep] = useState<'threads' | 'moment'>('threads');
  const [query, setQuery] = useState('');
  const [now] = useState(() => Date.now());
  const [limit, setLimit] = useState(PAGE);
  // What waits in the Undo window is not offered (owner-threads audit 4).
  const hidden = useHidden();
  useEffect(() => {
    let live = true;
    threads.moments().then(
      (r) => live && setPool({ views: toMomentViews(r.captures, r.walks), walks: new Map(r.walks.map((w) => [w.id, w])) }),
      () => live && setPool({ views: [], walks: new Map() }),
    );
    return () => {
      live = false;
    };
  }, []);
  const byId = useMemo(() => new Map((pool?.views ?? []).map((v) => [v.id, v])), [pool]);
  const threadRows = useMemo(
    () =>
      data.threads
        .map((t) => {
          const mine = data.members.filter((m) => m.thread_id === t.id).map((m) => byId.get(m.moment_id)).filter((v): v is MomentView => !!v);
          const oldest = [...mine].sort((a, b) => a.t - b.t)[0];
          const latest = Math.max(0, ...mine.map((v) => v.t));
          return { t, count: mine.length, oldest, latest, has: data.members.some((m) => m.thread_id === t.id && m.moment_id === props.moment.id) };
        })
        .filter((r) => r.oldest)
        .sort((a, b) => b.latest - a.latest),
    [data, byId, props.moment.id],
  );
  // Found by its words, its place or its date, a page at a time (audit 3).
  const found = useMemo(() => {
    const items = (pool?.views ?? []).map((v) => ({ id: v.id, t: v.t, words: v.words, context: rowOf(v, pool!.walks, now).context }));
    return filterPicker(items, { hidden, self: props.moment.id, query, limit });
  }, [pool, hidden, query, limit, props.moment.id, now]);
  const candidates = found.shown.map((i) => byId.get(i.id)).filter((v): v is MomentView => !!v);

  const addTo = async (threadId: string) => {
    const ok = await threads.addToThread(threadId, props.moment.id).catch(() => false);
    props.onDone(ok ? 'Connected' : 'Could not connect');
  };
  const joinWith = async (other: MomentView) => {
    const id = await threads.startThread([props.moment.id, other.id]).catch(() => null);
    props.onDone(id ? 'Connected' : 'Could not connect');
  };
  return (
    <View style={[StyleSheet.absoluteFill, styles.back, { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.card} testID="add-to-thread" accessibilityViewIsModal>
        <View style={styles.head}>
          <Text style={styles.title} accessibilityRole="header">{step === 'threads' ? 'Add to a thread' : 'Join it with another moment'}</Text>
          <Pressable testID="add-to-thread-close" accessibilityRole="button" accessibilityLabel="Close" onPress={props.onClose} hitSlop={8} style={styles.x}>
            <Icon name="close" size={22} color={theme.ink} />
          </Pressable>
        </View>
        {step === 'threads' ? (
          <ScrollView style={styles.list} contentContainerStyle={styles.pad}>
            <Pressable testID="add-new-thread" accessibilityRole="button" onPress={() => setStep('moment')} style={styles.row}>
              <Text style={styles.name}>A new thread</Text>
              <Text style={styles.sub}>Choose a second moment to join this one with</Text>
            </Pressable>
            {threadRows.map((r) => {
              const h = headingOf({ name: r.t.name, place: r.oldest.place, t: r.oldest.t, words: r.oldest.words }, now);
              return (
                <Pressable
                  key={r.t.id}
                  testID="add-thread-row"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: r.has }}
                  disabled={r.has}
                  onPress={() => void addTo(r.t.id)}
                  style={[styles.row, r.has && styles.dim]}
                >
                  <Text style={styles.name} numberOfLines={1}>{h.title}</Text>
                  <Text style={styles.sub} numberOfLines={1}>{r.has ? 'This moment is in it' : threadLine(r.count, r.oldest.t, now)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : (
          <>
            <TextInput
              testID="add-search"
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
            <ScrollView style={styles.list} contentContainerStyle={styles.pad}>
              {pool && candidates.length === 0 ? <Text style={styles.sub}>No other moment matches.</Text> : null}
              {candidates.map((v) => {
                const r = rowOf(v, pool!.walks, now);
                return (
                  <Pressable key={v.id} testID="add-moment-row" accessibilityRole="button" accessibilityLabel={`${r.words}. ${r.context}`} onPress={() => void joinWith(v)} style={styles.row}>
                    <Text style={styles.name} numberOfLines={2}>{r.words}</Text>
                    <Text style={styles.sub} numberOfLines={1}>{r.context}</Text>
                  </Pressable>
                );
              })}
              {found.more ? (
                <Pressable testID="add-more" accessibilityRole="button" onPress={() => setLimit((l) => l + PAGE)} style={styles.row}>
                  <Text style={styles.name}>Show more</Text>
                </Pressable>
              ) : null}
            </ScrollView>
          </>
        )}
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
  dim: { opacity: 0.45 },
  input: { backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.edge, borderRadius: 12, paddingHorizontal: 12, minHeight: 48, color: theme.ink, fontSize: 16 },
});
