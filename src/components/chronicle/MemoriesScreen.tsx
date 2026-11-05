import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureEdits } from '../../lib/captureEdits';
import { dayKey } from '../../lib/days';
import { LATELY_PAGE, lately } from '../../lib/resurface/feed';
import { resurface } from '../../lib/resurface';
import { useResurface } from '../../lib/resurface/useResurface';
import type { MomentView, Prefs, Thread } from '../../lib/resurface/types';
import { onRecallOpen, recallWaiting, takeRecallOpen } from '../../lib/discovery/recallCheck';
import { useOpenWalkInfo } from '../OpenWalk';
import { UndoToast } from '../UndoToast';
import { useStore } from '../../lib/useStore';
import type { Capture } from '../../lib/types';
import { showWalk } from '../../lib/walkNav';
import { CaptureViewer } from '../CaptureView';
import { Button, theme } from '../ui';
import { MemoryMenu } from './MemoryMenu';
import { MomentCard } from './MomentCard';
import { Resurfaced } from './Resurfaced';
import { ThreadScreen } from './ThreadScreen';
import { ThreadsRail } from './ThreadsRail';
import { fromLine } from '../../lib/resurface/views';

const TOAST_MS = 4200;
const stepIndex = (s: { index: number }) => s.index;

/** Chronicle's Memories (RM4-RM21): the resurfaced moment, the threads, and Lately. */
export function MemoriesScreen() {
  const insets = useSafeAreaInsets();
  const { state, feed, now } = useResurface();
  const index = useStore(resurface.store, stepIndex);
  const [limit, setLimit] = useState(LATELY_PAGE);
  const [threadTerm, setThreadTerm] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Capture[] | null>(null);
  // A reminder tapped with no walk open lands on Chronicle and opens its capture at once (NV13), as the map's
  // screen does; with a walk open, the walk screen opens it and this declines. Until the keeper knows, it declines.
  const [recalled, setRecalled] = useState<Capture[] | null>(null);
  const openInfo = useOpenWalkInfo();
  const openRef = useRef(openInfo);
  useEffect(() => {
    openRef.current = openInfo;
  });
  useEffect(
    () =>
      onRecallOpen((found) => {
        if (!openRef.current.known || openRef.current.walk) return false;
        setRecalled(found);
        router.navigate('/chronicle');
        return true;
      }),
    [],
  );
  // One waiting from a cold start: with a walk open it opens on the walk (audit 2), else here.
  useFocusEffect(
    useCallback(() => {
      let live = true;
      (async () => {
        const open = await resurface.openWalk();
        if (!live) return;
        if (open && (await recallWaiting().catch(() => false))) {
          showWalk();
          return;
        }
        const found = open ? [] : await takeRecallOpen().catch(() => [] as Capture[]);
        if (live && found.length) setRecalled(found);
      })().catch(() => {});
      return () => {
        live = false;
      };
    }, []),
  );
  const [toast, setToast] = useState<{ msg: string; before: Prefs } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const byId = useMemo(() => new Map(feed.moments.map((m) => [m.id, m])), [feed.moments]);
  const pick = feed.order.length ? feed.order[index % feed.order.length] : null;
  const heroId = pick?.moment.id ?? null;
  // The top card showed this moment: kept, so the next open starts elsewhere (RM8).
  useEffect(() => {
    if (heroId) void resurface.shown(heroId);
  }, [heroId]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const thread = threadTerm ? feed.threads.find((t) => t.term === threadTerm) ?? null : null;
  const page = useMemo(() => lately(feed.moments, feed.threads, now, limit), [feed.moments, feed.threads, now, limit]);

  const say = (msg: string, before: Prefs) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ msg, before });
    timer.current = setTimeout(() => setToast(null), TOAST_MS);
  };
  const open = (m: MomentView) => setViewing([m.capture]);
  const relive = (m: MomentView) => router.push(m.walkId ? `/replay/${m.walkId}?ceremony=0` : `/day/${dayKey(m.t)}`);
  const menuMoment = menuFor ? byId.get(menuFor) ?? null : null;
  const walkOf = (m: MomentView) => (m.walkId ? state.walks[m.walkId] : undefined);
  const card = (m: MomentView) => (
    <MomentCard key={m.id} moment={m} walk={walkOf(m)} now={now} onOpen={() => open(m)} onWalk={(id) => router.push(`/replay/${id}?ceremony=0`)} onMore={() => setMenuFor(m.id)} />
  );

  let body;
  if (state.status === 'failed') {
    body = (
      <View style={styles.quiet} testID="memories-failed">
        <Text style={styles.quietText}>Couldn’t read your moments.</Text>
        <Button label="Try again" onPress={() => void resurface.load()} />
      </View>
    );
  } else if (state.status === 'ready' && feed.moments.length === 0) {
    body = (
      <View style={styles.quiet} testID="memories-empty">
        <Text style={styles.quietText}>Nothing kept yet. Walk somewhere, and keep what you notice.</Text>
        <Button testID="memories-navigate" label="Navigate" onPress={() => showWalk()} />
      </View>
    );
  } else if (thread) {
    body = (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.pad}>
        <ThreadScreen
          thread={thread}
          moments={thread.momentIds.map((id) => byId.get(id)).filter((m): m is MomentView => !!m)}
          walks={state.walks}
          now={now}
          onBack={() => setThreadTerm(null)}
          onOpen={open}
          onWalk={(id) => router.push(`/replay/${id}?ceremony=0`)}
          onMore={(m) => setMenuFor(m.id)}
          onRename={(name) => void resurface.rename(thread.term, name)}
          onRemove={() => {
            setThreadTerm(null);
            void resurface.removeThread(thread.term).then((before) => say('Okay, that is not a thread.', before));
          }}
        />
      </ScrollView>
    );
  } else if (state.status === 'ready') {
    body = (
      <FlatList
        testID="memories-list"
        data={page.items}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <View style={styles.item}>{card(item)}</View>}
        onEndReached={() => page.more && setLimit((l) => l + LATELY_PAGE)}
        onEndReachedThreshold={0.6}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            {pick && (
              <Resurfaced
                pick={pick}
                now={now}
                placeLine={fromLine(walkOf(pick.moment))}
                onOpen={() => open(pick.moment)}
                onRelive={() => relive(pick.moment)}
                onAnother={() => resurface.another()}
                onMore={() => setMenuFor(pick.moment.id)}
              />
            )}
            {feed.threads.length > 0 ? (
              <ThreadsRail threads={feed.threads} moments={byId} now={now} onOpen={(t: Thread) => setThreadTerm(t.term)} />
            ) : (
              <Text style={styles.hint} testID="threads-hint">Threads appear once you keep coming back to something.</Text>
            )}
            <View>
              <Text style={styles.h} accessibilityRole="header">Lately</Text>
              <Text style={styles.sub}>Newest first</Text>
            </View>
          </View>
        }
      />
    );
  } else {
    body = null;
  }

  return (
    <View style={styles.screen} testID="memories">
      {body}
      <MemoryMenu
        open={!!menuMoment}
        onClose={() => setMenuFor(null)}
        onLess={() => {
          const id = menuFor;
          setMenuFor(null);
          if (id) void resurface.less(id).then((before) => say('Okay, less like this.', before));
        }}
        onHide={() => {
          const id = menuFor;
          setMenuFor(null);
          if (id) void resurface.hide(id).then((before) => say('Okay, not this one.', before));
        }}
        onOpen={() => {
          const m = menuMoment;
          setMenuFor(null);
          if (m) open(m);
        }}
      />
      {toast && (
        <View style={[styles.toast, { bottom: 16 + insets.bottom * 0 }]} accessibilityLiveRegion="polite" testID="memories-toast">
          <Text style={styles.toastText}>{toast.msg}</Text>
          <Pressable
            testID="memories-undo"
            accessibilityRole="button"
            accessibilityLabel="Undo"
            hitSlop={10}
            onPress={() => {
              const before = toast.before;
              setToast(null);
              void resurface.undo(before);
            }}
          >
            <Text style={styles.undo}>Undo</Text>
          </Pressable>
        </View>
      )}
      <CaptureViewer
        key={`memory:${viewing?.[0]?.id ?? 'none'}`}
        captures={viewing && viewing.map((v) => byId.get(v.id)?.capture ?? v)}
        onClose={() => setViewing(null)}
        remind
        onSaveEdit={async (c, patch) => {
          await captureEdits.save(c, patch);
          resurface.patch(c.id, patch);
        }}
        onSaveNote={(c, body) => resurface.saveNote(c, body)}
      />
      <CaptureViewer
        key={recalled?.[0]?.id ?? 'none'}
        captures={recalled}
        onClose={() => setRecalled(null)}
        autoPlay
        remind
        onSaveNote={(c, body) => resurface.saveNote(c, body)}
      />
      <UndoToast style={{ top: 8 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  scroll: { flex: 1 },
  pad: { paddingHorizontal: 16, paddingBottom: 24, width: '100%', maxWidth: 640, alignSelf: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 32, width: '100%', maxWidth: 640, alignSelf: 'center' },
  header: { gap: 22, paddingBottom: 12 },
  item: { paddingBottom: 12 },
  h: { color: theme.ink, fontSize: 16, fontWeight: '700' },
  sub: { color: theme.muted, fontSize: 13 },
  hint: { color: theme.muted, fontSize: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.line, borderRadius: 14, padding: 12 },
  quiet: { padding: 24, gap: 14, alignItems: 'flex-start' },
  quietText: { color: theme.ink, fontSize: 16, lineHeight: 23 },
  toast: { position: 'absolute', left: 16, right: 16, alignSelf: 'center', maxWidth: 480, backgroundColor: theme.ink, borderRadius: 14, paddingHorizontal: 16, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  toastText: { color: theme.bg, fontSize: 14, flex: 1 },
  undo: { color: '#ffb48a', fontSize: 14, fontWeight: '700' },
});
