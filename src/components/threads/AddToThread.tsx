import { type ComponentRef, forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Dimensions, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHidden } from '../../lib/deletion/useDeletions';
import { accessoryRoom, floatsAccessory, lineLift, overlayTop } from '../../lib/journal/keyboard';
import { useKeyboardHeight } from '../../lib/threads/useKeyboardHeight';
import { threads } from '../../lib/threads';
import { filterPicker } from '../../lib/threads/picker';
import { backFrom, CAP_THREAD, firstStep, lastAddedTo, nameToSave, rowShows, threadable, threadSearch } from '../../lib/threads/capThread';
import { contextLine, headingOf, threadLine } from '../../lib/threads/lines';
import { useThreads } from '../../lib/threads/useThreads';
import type { MomentView } from '../../lib/resurface/types';
import { fromLine, poolWithOpenWalks } from '../../lib/resurface/views';
import type { Walk } from '../../lib/types';
import { MomentPicture } from '../chronicle/MomentPicture';
import { Icon } from '../icons';
import { ThreadMark } from './ThreadMark';
import { theme } from '../ui';

const PAGE = 40;

/** A moment as the pickers list it (OT5, OT9, TK7): its place and date, its walk, and its own first words. Never bare. */
function rowOf(m: MomentView, walks: Map<string, Walk>, now: number) {
  const walk = m.walkId ? walks.get(m.walkId) : undefined;
  return { context: contextLine({ place: m.place, t: m.t, walkLine: fromLine(walk), now }), ...rowShows(m.kind, m.words) };
}

type ThreadRow = { id: string; title: string; sub: string | null; line: string; has: boolean };

/**
 * Add to a thread (OT5; threading at capture TK3-TK11, decision 0253): the search over threads and moments, not focused
 * until tapped; the thread last added to, first; A new thread, which asks for a second kept moment (OT6) from every
 * moment kept, the walk still open's too (TK6), each with its picture (TK7); then the owner's other threads. A new thread
 * offers an optional name (TK8). Drawn inside its host (the viewer's Modal, Memories, or the pill's own `ThreadFromPill`),
 * never as a Modal over a Modal. `onDone`'s message is null when the card has already said what happened.
 */
export interface AddToThreadHandle {
  /** Back or Escape from the host (threading-at-capture audit 5, ui 2): a step back, the name step finished, or close. */
  requestClose: () => void;
}

type AddToThreadProps = { moment: { id: string }; onClose: () => void; onDone: (message: string | null, ok: boolean) => void };

export const AddToThread = forwardRef<AddToThreadHandle, AddToThreadProps>(function AddToThread(props, ref) {
  const insets = useSafeAreaInsets();
  // The search's keyboard (fix picker-keyboard, the owner's iPhone, Nov 18): the card ends above the keys, and above the
  // row an iPhone's browser floats over them (`accessoryRoom`), so its last rows stay reachable. It rises by what the
  // keyboard covers above whatever lies under it (Memories' tab bar), measured while the keyboard is down, as the line does.
  const keyboard = useKeyboardHeight();
  const { height: windowH } = useWindowDimensions();
  const back = useRef<ComponentRef<typeof View>>(null);
  const [below, setBelow] = useState(0);
  // Where the backdrop starts in the window: the top inset is counted only where the host has not cleared it (audit 4).
  const [at, setAt] = useState(0);
  // The window's height is read when the measure answers, not when it was asked: one asked before a turn can answer after
  // it (audit 2).
  const take = () => back.current?.measureInWindow((_x: number, y: number, _w: number, h: number) => {
    setAt(Math.round(y));
    setBelow(Math.max(0, Math.round(Dimensions.get('window').height - (y + h))));
  });
  const measure = () => {
    if (keyboard === 0) take();
  };
  // Again once the window has turned, and once the keys are down (audit 2): the backdrop's box changes with neither.
  const down = keyboard === 0;
  useEffect(() => {
    if (down) take();
  }, [down, windowH]);
  const [floating] = useState(
    () => Platform.OS === 'web' && typeof navigator !== 'undefined' && typeof CSS !== 'undefined'
      && floatsAccessory({ ua: navigator.userAgent, touchPoints: navigator.maxTouchPoints, supports: (q) => CSS.supports(q) }),
  );
  const lift = lineLift(keyboard, below);
  const foot = Math.max(insets.bottom, lift > 0 ? lift + accessoryRoom({ keyboard, floating }) : 0) + 12;
  const { data } = useThreads();
  const [pool, setPool] = useState<{ views: MomentView[]; walks: Map<string, Walk> } | null>(null);
  const [step, setStep] = useState<'threads' | 'moment' | 'name'>('threads');
  const [query, setQuery] = useState('');
  const [now] = useState(() => Date.now());
  const [limit, setLimit] = useState(PAGE);
  const [made, setMade] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [nameFailed, setNameFailed] = useState(false);
  // What waits in the Undo window is not offered (owner-threads audit 4).
  const hidden = useHidden();
  useEffect(() => {
    let live = true;
    // The walk still open is offered too (TK6), as the responses sheet reads it (RT13).
    threads.moments().then(
      (r) => live && setPool({ views: poolWithOpenWalks(r.captures, r.walks), walks: new Map(r.walks.map((w) => [w.id, w])) }),
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
        .sort((a, b) => b.latest - a.latest)
        .map((r): ThreadRow => {
          const h = headingOf({ name: r.t.name, place: r.oldest.place, t: r.oldest.t, words: r.oldest.words }, now);
          return { id: r.t.id, title: h.title, sub: h.sub, line: r.has ? CAP_THREAD.inIt : threadLine(r.count, r.oldest.t, now), has: r.has };
        }),
    [data, byId, props.moment.id, now],
  );
  // The thread last added to, first (TK4): read from the members' `added_at`, among the threads listed.
  const lastId = useMemo(() => lastAddedTo(data.members, new Set(threadRows.map((r) => r.id))), [data.members, threadRows]);
  const last = threadRows.find((r) => r.id === lastId) ?? null;
  const others = threadRows.filter((r) => r.id !== lastId);
  const searching = query.trim().length > 0;
  const foundThreads = useMemo(() => (searching ? threadSearch(threadRows, query) : []), [searching, threadRows, query]);
  // Found by its words, its place or its date, a page at a time (audit 3).
  const found = useMemo(() => {
    const items = (pool?.views ?? []).map((v) => ({ id: v.id, t: v.t, words: v.words, context: rowOf(v, pool!.walks, now).context }));
    return filterPicker(items, { hidden, self: props.moment.id, query, limit });
  }, [pool, hidden, query, limit, props.moment.id, now]);
  const candidates = found.shown.map((i) => byId.get(i.id)).filter((v): v is MomentView => !!v);

  // One write at a time: a second tap while the first is being kept does nothing (threading-at-capture audit 2).
  const busy = useRef(false);
  // A promise chain, not try/finally: the React Compiler compiles no try without a catch (CM2).
  const once = (run: () => Promise<void>): Promise<void> => {
    if (busy.current) return Promise.resolve();
    busy.current = true;
    return run().finally(() => {
      busy.current = false;
    });
  };
  // A moment waiting in the Undo window connects nothing (audit 1): its thread would never be seen.
  const gone = () => !threadable(props.moment.id, hidden);
  const addTo = (threadId: string) => once(async () => {
    if (gone()) return props.onDone(CAP_THREAD.failed, false);
    const ok = await threads.addToThread(threadId, props.moment.id).catch(() => false);
    props.onDone(ok ? CAP_THREAD.connected : CAP_THREAD.failed, ok);
  });
  const joinWith = (other: MomentView) => once(async () => {
    if (gone()) return props.onDone(CAP_THREAD.failed, false);
    const id = await threads.startThread([props.moment.id, other.id]).catch(() => null);
    if (!id) return props.onDone(CAP_THREAD.failed, false);
    // Two moments are a thread now (OT6): an optional name, so a search finds it next time (TK8). The card says it.
    setMade(id);
    setStep('name');
  });
  const finish = async (save: boolean) => {
    const n = save ? nameToSave(name) : null;
    if (made && n) {
      const ok = await threads.rename(made, n).then(() => true, () => false);
      // A name that could not be kept: the thread stays unnamed and the field keeps what was typed (TK11).
      if (!ok) return setNameFailed(true);
    }
    props.onDone(null, true);
  };
  const requestClose = () => {
    const to = backFrom(step);
    if (to === 'finish') void finish(false);
    else if (to === 'threads') {
      setQuery('');
      setLimit(PAGE);
      setStep('threads');
    } else props.onClose();
  };
  useImperativeHandle(ref, () => ({ requestClose }));
  const onSearch = (t: string) => {
    setQuery(t);
    setLimit(PAGE);
  };

  const threadRow = (r: ThreadRow) => (
    <Pressable
      key={r.id}
      testID="add-thread-row"
      accessibilityRole="button"
      accessibilityState={{ disabled: r.has }}
      disabled={r.has}
      onPress={() => void addTo(r.id)}
      style={styles.row}
    >
      {/* Only the title is dimmed: the line says why the row cannot be tapped (threading-at-capture ui 3). */}
      <View style={[styles.titleRow, r.has && styles.dim]}>
        <ThreadMark kind="made" />
        <Text style={[styles.name, styles.shrink]} numberOfLines={1}>{r.title}</Text>
      </View>
      <Text testID="add-thread-line" style={styles.sub} numberOfLines={1}>{r.line}</Text>
    </Pressable>
  );
  const momentRow = (v: MomentView) => {
    const r = rowOf(v, pool!.walks, now);
    return (
      <Pressable key={v.id} testID="add-moment-row" accessibilityRole="button" accessibilityLabel={`${r.words}. ${r.context}`} onPress={() => void joinWith(v)} style={[styles.row, r.picture && styles.withPicture]}>
        {r.picture ? <MomentPicture capture={v.capture} style={styles.picture} iconSize={22} /> : null}
        <View style={styles.shrink}>
          <Text style={styles.name} numberOfLines={2}>{r.words}</Text>
          <Text style={styles.sub} numberOfLines={2}>{r.context}</Text>
        </View>
      </Pressable>
    );
  };
  const more = found.more ? (
    <Pressable testID="add-more" accessibilityRole="button" onPress={() => setLimit((l) => l + PAGE)} style={styles.row}>
      <Text style={styles.name}>Show more</Text>
    </Pressable>
  ) : null;
  const search = (placeholder: string, mark = false) => (
    <View style={styles.searchRow}>
      {/* The search mark, as drawn on the threads step (threading-at-capture ui 1). */}
      {mark ? <View testID="add-search-mark" style={styles.mark} pointerEvents="none"><Icon name="search" size={18} color={theme.muted} /></View> : null}
      <TextInput
      testID="add-search"
      value={query}
      onChangeText={onSearch}
      placeholder={placeholder}
      placeholderTextColor={theme.muted}
      accessibilityLabel={placeholder}
      style={[styles.input, mark && styles.marked]}
    />
    </View>
  );
  const title = step === 'threads' ? 'Add to a thread' : step === 'moment' ? 'Join it with another moment' : CAP_THREAD.connected;
  return (
    // With the keys up the card gives its top margin to the rows (audit 1).
    <View ref={back} onLayout={measure} style={[StyleSheet.absoluteFill, styles.back, step === 'name' && styles.low, { paddingTop: overlayTop({ inset: insets.top, at, keys: keyboard > 0 }), paddingBottom: foot }]}>
      <View style={[styles.card, step !== 'name' && styles.tall]} testID="add-to-thread" accessibilityViewIsModal>
        <View style={styles.head}>
          <Text style={styles.title} accessibilityRole="header">{title}</Text>
          <Pressable testID="add-to-thread-close" accessibilityRole="button" accessibilityLabel="Close" onPress={() => (step === 'name' ? void finish(false) : props.onClose())} hitSlop={8} style={styles.x}>
            <Icon name="close" size={22} color={theme.ink} />
          </Pressable>
        </View>
        {step === 'threads' ? (
          <>
            {search(CAP_THREAD.search, true)}
            <ScrollView style={styles.list} contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
              {searching ? (
                <>
                  {foundThreads.length ? <Text style={styles.section} accessibilityRole="header">{CAP_THREAD.threads}</Text> : null}
                  {foundThreads.map(threadRow)}
                  {candidates.length ? <Text style={styles.section} accessibilityRole="header">{CAP_THREAD.moments}</Text> : null}
                  {candidates.map(momentRow)}
                  {more}
                  {pool && !foundThreads.length && !candidates.length ? <Text style={styles.sub}>{CAP_THREAD.none}</Text> : null}
                </>
              ) : (
                <>
                  {firstStep({ loaded: !!pool, last: last?.id ?? null, others: others.map((r) => r.id) }).map((key) =>
                    key === 'new' ? (
                      <Pressable key={key} testID="add-new-thread" accessibilityRole="button" onPress={() => {
                        setQuery('');
                        setStep('moment');
                      }} style={styles.row}>
                        <Text style={styles.name}>A new thread</Text>
                        <Text style={styles.sub}>Choose a second moment to join this one with</Text>
                      </Pressable>
                    ) : key.startsWith('last:') && last ? (
                      <View key={key} testID="last-added" style={styles.pad}>
                        <Text style={styles.section} accessibilityRole="header">{CAP_THREAD.last}</Text>
                        {threadRow(last)}
                      </View>
                    ) : (
                      threadRow(others.find((r) => `thread:${r.id}` === key)!)
                    ),
                  )}
                </>
              )}
            </ScrollView>
          </>
        ) : step === 'moment' ? (
          <>
            {search('Search words, places or dates')}
            <ScrollView style={styles.list} contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
              {pool && candidates.length === 0 ? <Text style={styles.sub}>No other moment matches.</Text> : null}
              {candidates.map(momentRow)}
              {more}
            </ScrollView>
          </>
        ) : (
          <View style={styles.pad}>
            <Text style={styles.made} accessibilityLiveRegion="polite">{CAP_THREAD.made}</Text>
            <Text style={styles.label} nativeID="thread-name-label">{CAP_THREAD.nameLabel}</Text>
            <TextInput
              testID="thread-name"
              value={name}
              onChangeText={(t) => {
                setName(t);
                setNameFailed(false);
              }}
              autoFocus
              accessibilityLabel={CAP_THREAD.nameLabel}
              returnKeyType="done"
              onSubmitEditing={() => void finish(true)}
              style={styles.input}
            />
            {nameFailed ? <Text style={styles.sub} accessibilityLiveRegion="polite">{CAP_THREAD.nameFailed}</Text> : null}
            <View style={styles.actions}>
              <Pressable testID="thread-name-skip" accessibilityRole="button" onPress={() => void finish(false)} style={[styles.action, styles.quiet]}>
                <Text style={styles.quietText}>{CAP_THREAD.unnamed}</Text>
              </Pressable>
              <Pressable testID="thread-name-done" accessibilityRole="button" onPress={() => void finish(true)} style={[styles.action, styles.strong]}>
                <Text style={styles.strongText}>{CAP_THREAD.done}</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  // Over the journal's open line (its layer is `zIndex: 2`), which rises with any keyboard (fix picker-keyboard).
  back: { backgroundColor: 'rgba(20,24,32,0.7)', paddingHorizontal: 12, alignItems: 'center', zIndex: 3 },
  card: { width: '100%', maxWidth: 520, backgroundColor: theme.surface, borderRadius: 18, padding: 12, gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { color: theme.ink, fontSize: 17, fontWeight: '700', flex: 1 },
  x: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  list: { flex: 1 },
  pad: { gap: 6, paddingBottom: 8 },
  row: { minHeight: 56, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: theme.line, gap: 2 },
  name: { color: theme.ink, fontSize: 16, fontWeight: '600' },
  sub: { color: theme.muted, fontSize: 13 },
  dim: { opacity: 0.45 },
  // The name step (TK8) sits low, just above the keyboard, as drawn.
  low: { justifyContent: 'flex-end' },
  // Only the lists fill the height; the name step is its own size (`flex: 0` collapses on the web, react-native-web.md).
  tall: { flex: 1 },
  searchRow: { justifyContent: 'center' },
  mark: { position: 'absolute', left: 12, zIndex: 1 },
  marked: { paddingLeft: 38 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  shrink: { flexShrink: 1, flexGrow: 1, gap: 2 },
  withPicture: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 12 },
  picture: { width: 56, height: 56, borderRadius: 10, overflow: 'hidden' },
  section: { color: theme.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', paddingHorizontal: 4, paddingTop: 4 },
  made: { color: theme.ink, fontSize: 16, backgroundColor: theme.bg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  label: { color: theme.muted, fontSize: 13 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingTop: 4 },
  action: { minHeight: 44, paddingHorizontal: 18, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  quiet: { borderWidth: 1, borderColor: theme.edge },
  quietText: { color: theme.ink, fontSize: 16, fontWeight: '700' },
  strong: { backgroundColor: theme.ink },
  strongText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  input: { backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.edge, borderRadius: 12, paddingHorizontal: 12, minHeight: 48, color: theme.ink, fontSize: 16 },
});
