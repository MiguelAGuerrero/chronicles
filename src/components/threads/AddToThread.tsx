import { type ComponentRef, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHidden } from '../../lib/deletion/useDeletions';
import { accessoryRoom, floatsAccessory, lineLift, overlayTop } from '../../lib/journal/keyboard';
import { useKeyboardHeight } from '../../lib/threads/useKeyboardHeight';
import { threads } from '../../lib/threads';
import { filterPicker, lastAddedTo, threadChoices, type ThreadRow } from '../../lib/threads/picker';
import { contextLine, headingOf, threadLine } from '../../lib/threads/lines';
import { useThreads } from '../../lib/threads/useThreads';
import type { MomentView } from '../../lib/resurface/types';
import { fromLine, poolWithOpenWalks } from '../../lib/resurface/views';
import type { Walk } from '../../lib/types';
import { MomentPicture } from '../chronicle/MomentPicture';
import { Icon } from '../icons';
import { theme } from '../ui';
import { ThreadMark } from './ThreadMark';

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

/** A thread's row: its heading, and its size in words, or that this moment is in it (CT4). */
type Listed = ThreadRow & { line: string };

/**
 * Add to a thread (OT5; thread at capture CT3-CT9, decision 0253): the thread last added to first, A new thread, the
 * owner's other threads, and a search over threads and moments. A new thread asks for a second kept moment (OT6), the
 * walk still open included (CT6), then offers an optional name (CT8). Drawn inside its host's Modal, never a second one
 * (iOS can't present a Modal over a Modal). It reads only the moment's id.
 */
export function AddToThread(props: { moment: { id: string }; onClose: () => void; onDone: (message: string, ok: boolean) => void }) {
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
  // The threads' search (CT5) and the new thread's (OT5) are apart, so going back keeps what was typed in each.
  const [find, setFind] = useState('');
  const [query, setQuery] = useState('');
  // The new thread waiting for its name, and the name as typed: read when the card goes, never in render.
  const made = useRef<string | null>(null);
  const typed = useRef('');
  const [name, setName] = useState('');
  // The search's focus is drawn on its own box, an ink edge (thread-at-capture ui 1): the web's ring sat inside it.
  const [searchFocus, setSearchFocus] = useState(false);
  const [now] = useState(() => Date.now());
  const [limit, setLimit] = useState(PAGE);
  // What waits in the Undo window is not offered (owner-threads audit 4).
  const hidden = useHidden();
  useEffect(() => {
    let live = true;
    threads.moments().then(
      // The walk still open is offered too (CT6), as the responses sheet does (RT13).
      (r) => live && setPool({ views: poolWithOpenWalks(r.captures, r.walks), walks: new Map(r.walks.map((w) => [w.id, w])) }),
      () => live && setPool({ views: [], walks: new Map() }),
    );
    return () => {
      live = false;
    };
  }, []);
  const byId = useMemo(() => new Map((pool?.views ?? []).map((v) => [v.id, v])), [pool]);
  const listed = useMemo<Listed[]>(
    () =>
      data.threads.flatMap((t) => {
        const mine = data.members.filter((m) => m.thread_id === t.id).map((m) => byId.get(m.moment_id)).filter((v): v is MomentView => !!v);
        const oldest = [...mine].sort((a, b) => a.t - b.t)[0];
        if (!oldest) return [];
        const h = headingOf({ name: t.name, place: oldest.place, t: oldest.t, words: oldest.words }, now);
        const has = data.members.some((m) => m.thread_id === t.id && m.moment_id === props.moment.id);
        return [{ id: t.id, title: h.title, words: h.sub ?? oldest.words, latest: Math.max(...mine.map((v) => v.t)), has, line: has ? 'This moment is in it' : threadLine(mine.length, oldest.t, now) }];
      }),
    [data, byId, props.moment.id, now],
  );
  const last = useMemo(() => lastAddedTo(data.members, new Set(listed.map((r) => r.id))), [data.members, listed]);
  const choices = threadChoices(listed, { query: find, last });
  // Found by its words, its place or its date, a page at a time (audit 3); on the first step only while searching (CT5).
  const q = step === 'moment' ? query : find;
  const found = useMemo(() => {
    const items = (pool?.views ?? []).map((v) => ({ id: v.id, t: v.t, words: v.words, context: rowOf(v, pool!.walks, now).context }));
    return filterPicker(items, { hidden, self: props.moment.id, query: q, limit });
  }, [pool, hidden, q, limit, props.moment.id, now]);
  const candidates = found.shown.map((i) => byId.get(i.id)).filter((v): v is MomentView => !!v);

  // One write per tap (thread-at-capture audit 2): a second tap while the first is stored does nothing, or two taps
  // on a row made two threads of the same two moments.
  const [busy, setBusy] = useState(false);
  const addTo = async (threadId: string) => {
    if (busy) return;
    setBusy(true);
    const ok = await threads.addToThread(threadId, props.moment.id).catch(() => false);
    props.onDone(ok ? 'Connected' : 'Could not connect', ok);
  };
  const joinWith = async (other: MomentView) => {
    if (busy) return;
    setBusy(true);
    const id = await threads.startThread([props.moment.id, other.id]).catch(() => null);
    if (!id) props.onDone('Could not connect', false);
    else {
      // An optional name once two are joined (CT8): nothing names it for the owner.
      made.current = id;
      setStep('name');
    }
  };
  const finish = async (keep: boolean) => {
    const id = made.current;
    made.current = null;
    if (keep && id && typed.current.trim()) await threads.rename(id, typed.current).catch(() => {});
    props.onDone('Connected', true);
  };
  // A name typed is the thread's however the card goes (thread-at-capture audit 3): Escape, Android's Back or the host
  // closing it unmount the card without a tap on Done, so what is still unsaved is saved as it goes.
  useEffect(
    () => () => {
      const id = made.current;
      if (id && typed.current.trim()) void threads.rename(id, typed.current).catch(() => {});
    },
    [],
  );

  const threadButton = (r: Listed, testID: string) => (
    <Pressable
      key={r.id}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: r.has || busy }}
      disabled={r.has || busy}
      onPress={() => void addTo(r.id)}
      style={[styles.row, r.has && styles.dim]}
    >
      <View style={styles.named}>
        <ThreadMark kind="made" size={16} />
        <Text style={styles.name} numberOfLines={1}>{r.title}</Text>
      </View>
      <Text style={styles.sub} numberOfLines={1}>{r.line}</Text>
    </Pressable>
  );
  const momentButton = (v: MomentView) => {
    const r = rowOf(v, pool!.walks, now);
    // A photo or video shows its small picture beside its words and its line, never alone (CT7).
    const pictured = v.kind === 'photo' || v.kind === 'video';
    return (
      <Pressable key={v.id} testID="add-moment-row" accessibilityRole="button" accessibilityLabel={`${r.words}. ${r.context}`} disabled={busy} onPress={() => void joinWith(v)} style={[styles.row, pictured && styles.pictured]}>
        {pictured ? (
          <View testID="row-picture" style={styles.thumb}>
            <MomentPicture capture={v.capture} style={styles.thumb} iconSize={22} />
          </View>
        ) : null}
        <View style={styles.texts}>
          <Text style={styles.name} numberOfLines={2}>{r.words}</Text>
          <Text style={styles.sub} numberOfLines={1}>{r.context}</Text>
        </View>
      </Pressable>
    );
  };
  const more = found.more ? (
    <Pressable testID="add-more" accessibilityRole="button" onPress={() => setLimit((l) => l + PAGE)} style={styles.row}>
      <Text style={styles.name}>Show more</Text>
    </Pressable>
  ) : null;
  const searching = step === 'threads' && find.trim().length > 0;

  if (step === 'name')
    return (
      <View ref={back} onLayout={measure} style={[StyleSheet.absoluteFill, styles.back, styles.end, { paddingTop: overlayTop({ inset: insets.top, at, keys: keyboard > 0 }), paddingBottom: foot }]}>
        <View style={[styles.card, styles.short]} testID="add-to-thread" accessibilityViewIsModal>
          <View style={styles.head}>
            <Text style={styles.title} accessibilityRole="header">Connected</Text>
            <Pressable testID="add-to-thread-close" accessibilityRole="button" accessibilityLabel="Close" onPress={() => void finish(true)} hitSlop={8} style={styles.x}>
              <Icon name="close" size={22} color={theme.ink} />
            </Pressable>
          </View>
          <Text style={styles.said} accessibilityLiveRegion="polite">The two moments are a thread now.</Text>
          <Text style={styles.label} nativeID="thread-name-label">Name this thread (optional)</Text>
          <TextInput
            testID="new-thread-name"
            maxLength={40}
            value={name}
            onChangeText={(t) => {
              typed.current = t;
              setName(t);
            }}
            autoFocus
            placeholder="Name this thread"
            placeholderTextColor={theme.muted}
            accessibilityLabel="Name this thread"
            accessibilityLabelledBy="thread-name-label"
            returnKeyType="done"
            onSubmitEditing={() => void finish(true)}
            style={[styles.input, styles.typing]}
          />
          <View style={styles.foot}>
            <Pressable testID="thread-name-skip" accessibilityRole="button" onPress={() => void finish(false)} style={[styles.btn, styles.btnQuiet]}>
              <Text style={styles.btnQuietText}>Leave it unnamed</Text>
            </Pressable>
            <Pressable testID="thread-name-done" accessibilityRole="button" onPress={() => void finish(true)} style={[styles.btn, styles.btnInk]}>
              <Text style={styles.btnInkText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );

  return (
    // With the keys up the card gives its top margin to the rows (audit 1).
    <View ref={back} onLayout={measure} style={[StyleSheet.absoluteFill, styles.back, { paddingTop: overlayTop({ inset: insets.top, at, keys: keyboard > 0 }), paddingBottom: foot }]}>
      <View style={styles.card} testID="add-to-thread" accessibilityViewIsModal>
        <View style={styles.head}>
          <Text style={styles.title} accessibilityRole="header">{step === 'threads' ? 'Add to a thread' : 'Join it with another moment'}</Text>
          <Pressable testID="add-to-thread-close" accessibilityRole="button" accessibilityLabel="Close" onPress={props.onClose} hitSlop={8} style={styles.x}>
            <Icon name="close" size={22} color={theme.ink} />
          </Pressable>
        </View>
        {step === 'threads' ? (
          <>
            {/* Closed until tapped (CT5): no autoFocus, so the keys never cover "Last added to" at open. */}
            <View style={[styles.input, searchFocus && styles.focused]}>
              <Icon name="search" size={18} color={theme.muted} />
              <TextInput
                testID="add-thread-search"
                value={find}
                onChangeText={(t) => {
                  setFind(t);
                  setLimit(PAGE);
                }}
                onFocus={() => setSearchFocus(true)}
                onBlur={() => setSearchFocus(false)}
                placeholder="Search threads and moments"
                placeholderTextColor={theme.muted}
                accessibilityLabel="Search threads and moments"
                style={styles.field}
              />
            </View>
            <ScrollView style={styles.list} contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
              {searching ? (
                <>
                  {choices.rest.length ? <Text style={styles.over}>Threads</Text> : null}
                  {choices.rest.map((r) => threadButton(r, 'add-thread-row'))}
                  {candidates.length ? <Text style={styles.over}>Moments</Text> : null}
                  {candidates.map(momentButton)}
                  {more}
                  {pool && !choices.rest.length && !candidates.length ? <Text style={styles.sub}>Nothing matches.</Text> : null}
                </>
              ) : (
                <>
                  {choices.last ? <Text style={styles.over}>Last added to</Text> : null}
                  {choices.last ? threadButton(choices.last, 'add-last-thread') : null}
                  <Pressable testID="add-new-thread" accessibilityRole="button" onPress={() => setStep('moment')} style={styles.row}>
                    <Text style={styles.name}>A new thread</Text>
                    <Text style={styles.sub}>Choose a second moment to join this one with</Text>
                  </Pressable>
                  {choices.rest.map((r) => threadButton(r, 'add-thread-row'))}
                </>
              )}
            </ScrollView>
          </>
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
              style={[styles.input, styles.typing]}
            />
            <ScrollView style={styles.list} contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
              {pool && candidates.length === 0 ? <Text style={styles.sub}>No other moment matches.</Text> : null}
              {candidates.map(momentButton)}
              {more}
            </ScrollView>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Over the journal's open line (its layer is `zIndex: 2`), which rises with any keyboard (fix picker-keyboard).
  back: { backgroundColor: 'rgba(20,24,32,0.7)', paddingHorizontal: 12, alignItems: 'center', zIndex: 3 },
  end: { justifyContent: 'flex-end' },
  card: { width: '100%', maxWidth: 520, flex: 1, backgroundColor: theme.surface, borderRadius: 18, padding: 12, gap: 8 },
  // The name step sizes to its content (`flexGrow: 0`, not `flex: 0`, which collapses on the web).
  short: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { color: theme.ink, fontSize: 17, fontWeight: '700', flex: 1 },
  x: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  list: { flex: 1 },
  pad: { gap: 6, paddingBottom: 8 },
  row: { minHeight: 56, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: theme.line, gap: 2 },
  pictured: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 8, gap: 12 },
  thumb: { width: 56, height: 56, borderRadius: 8, overflow: 'hidden', backgroundColor: theme.bg },
  texts: { flex: 1, minWidth: 0, gap: 2 },
  named: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: theme.ink, fontSize: 16, fontWeight: '600', flexShrink: 1 },
  sub: { color: theme.muted, fontSize: 13 },
  over: { color: theme.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', paddingHorizontal: 4, paddingTop: 4 },
  dim: { opacity: 0.45 },
  input: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.edge, borderRadius: 12, paddingHorizontal: 12, minHeight: 48 },
  field: { flex: 1, minWidth: 0, minHeight: 44, color: theme.ink, fontSize: 16, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null) },
  focused: { borderWidth: 2, borderColor: theme.ink, paddingHorizontal: 11 },
  typing: { color: theme.ink, fontSize: 16 },
  said: { color: theme.ink, fontSize: 15, backgroundColor: theme.bg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  label: { color: theme.muted, fontSize: 13 },
  foot: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' },
  btn: { minHeight: 44, paddingHorizontal: 18, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  btnQuiet: { borderWidth: 1, borderColor: theme.edge },
  btnQuietText: { color: theme.ink, fontSize: 15, fontWeight: '700' },
  btnInk: { backgroundColor: theme.ink },
  btnInkText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
});
