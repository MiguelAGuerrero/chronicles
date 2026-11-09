import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { captureEdits } from '../../lib/captureEdits';
import { dayKey } from '../../lib/days';
import { EMPTY, FORGOT_TOAST, HIDDEN_TOAST, NEWEST_FIRST, NOT_A_THREAD, OFF_LINE, fewerLike, fewerWord, withSaveNote } from '../../lib/resurface/copy';
import { LATELY_PAGE, lately } from '../../lib/resurface/feed';
import { hiddenItems } from '../../lib/resurface/hidden';
import { resurface } from '../../lib/resurface';
import { useResurface } from '../../lib/resurface/useResurface';
import type { PrefsChange } from '../../lib/resurface/prefs';
import type { MomentView, Thread } from '../../lib/resurface/types';
import { onRecallOpen, recallWaiting, takeRecallOpen } from '../../lib/discovery/recallCheck';
import { useOpenWalkInfo } from '../OpenWalk';
import { UndoToast } from '../UndoToast';
import { useStore } from '../../lib/useStore';
import type { Capture } from '../../lib/types';
import { showWalk } from '../../lib/walkNav';
import { CaptureViewer } from '../CaptureView';
import { Icon } from '../icons';
import { Button, theme } from '../ui';
import { HiddenScreen } from './HiddenScreen';
import { MemoriesMenu } from './MemoriesMenu';
import { MemoryMenu } from './MemoryMenu';
import { MomentCard } from './MomentCard';
import { Resurfaced } from './Resurfaced';
import { ThreadScreen } from './ThreadScreen';
import { ThreadsRail } from './ThreadsRail';

const TOAST_MS = 4200;
const stepIndex = (s: { index: number }) => s.index;
const NO_IDS: string[] = [];

/** Reads a card's context as the card mounts, and so only for the cards the list renders (MC6); a moment read already is not read again. */
function ReadsContext({ id, version, deleted }: { id: string; version: number; deleted: ReadonlySet<string> }) {
  // `version` counts the reads of the moments: a card whose read failed asks again when the owner comes back (audit 2).
  useEffect(() => {
    void resurface.contextFor([id], deleted);
  }, [id, version, deleted]);
  return null;
}

/** Chronicle's Memories (RM4-RM21): the resurfaced moment, the threads, and Lately. */
export function MemoriesScreen() {
  const { state, feed, now, hidden: deletedIds } = useResurface();
  const index = useStore(resurface.store, stepIndex);
  const [limit, setLimit] = useState(LATELY_PAGE);
  const [threadTerm, setThreadTerm] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Capture[] | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hiddenOpen, setHiddenOpen] = useState(false);
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
  const [toast, setToast] = useState<{ msg: string; change: PrefsChange } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const byId = useMemo(() => new Map(feed.moments.map((m) => [m.id, m])), [feed.moments]);
  const pick = feed.order.length ? feed.order[index % feed.order.length] : null;
  const heroId = pick?.moment.id ?? null;
  // The top card showed this moment: kept, so the next open starts elsewhere (RM8).
  useEffect(() => {
    if (heroId) {
      void resurface.shown(heroId);
      void resurface.contextFor([heroId], deletedIds);
    }
  }, [heroId, deletedIds, state.version]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const thread = threadTerm ? feed.threads.find((t) => t.term === threadTerm) ?? null : null;
  // An open thread's moments are on screen: read their context too (MC6).
  const threadIds = thread ? thread.momentIds : NO_IDS;
  useEffect(() => {
    if (threadIds.length) void resurface.contextFor(threadIds, deletedIds);
  }, [threadIds, deletedIds, state.version]);
  const hidden = useMemo(() => hiddenItems(state.prefs, feed.moments), [state.prefs, feed.moments]);
  // A delete began: the lines of the walks it touches are read again, so none names the capture that is going (audit 9).
  useEffect(() => {
    if (!deletedIds.size) return;
    const walks = new Set(state.moments.filter((m) => deletedIds.has(m.id) && m.walkId).map((m) => m.walkId as string));
    resurface.dropContextOfWalks([...walks]);
  }, [deletedIds, state.moments]);
  const page = useMemo(() => lately(feed.moments, now, limit), [feed.moments, now, limit]);

  const say = (msg: string, change: PrefsChange) => {
    if (timer.current) clearTimeout(timer.current);
    // A choice that could not be kept shows for now, and the toast says so (audit 10).
    setToast({ msg: withSaveNote(msg, change.saved), change });
    timer.current = setTimeout(() => setToast(null), TOAST_MS);
  };
  const open = (m: MomentView) => setViewing([m.capture]);
  const relive = (m: MomentView) => router.push(m.walkId ? `/replay/${m.walkId}?ceremony=0` : `/day/${dayKey(m.t)}`);
  const menuMoment = menuFor ? byId.get(menuFor) ?? null : null;
  const walkOf = (m: MomentView) => (m.walkId ? state.walks[m.walkId] : undefined);
  const card = (m: MomentView) => (
    <MomentCard key={m.id} moment={m} walk={walkOf(m)} context={state.context[m.id]} now={now} onOpen={() => open(m)} onWalk={(id) => router.push(`/replay/${id}?ceremony=0`)} onMore={() => setMenuFor(m.id)} />
  );

  let body;
  if (state.status === 'failed') {
    body = (
      <View style={styles.quiet} testID="memories-failed">
        <Text style={styles.quietText}>Couldn’t read your moments.</Text>
        <Button label="Try again" onPress={() => { setHiddenOpen(false); void resurface.load(); }} />
      </View>
    );
  } else if (state.status === 'ready' && feed.moments.length === 0) {
    body = (
      <View style={styles.quiet} testID="memories-empty">
        <Text style={styles.quietText}>{EMPTY}</Text>
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
            void resurface.removeThread(thread.term).then((change) => say(NOT_A_THREAD, change));
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
        renderItem={({ item }) => (
          <View style={styles.item}>
            <ReadsContext id={item.id} version={state.version} deleted={deletedIds} />
            {card(item)}
          </View>
        )}
        onEndReached={() => page.more && setLimit((l) => l + LATELY_PAGE)}
        onEndReachedThreshold={0.6}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            {state.prefs.off && (
              <View style={styles.off} testID="resurfaced-off">
                <Text style={styles.offText}>{OFF_LINE}</Text>
                <Button testID="resurfaced-on" label="Turn on" variant="secondary" onPress={() => void resurface.setOff(false)} />
              </View>
            )}
            {pick && (
              <Resurfaced
                pick={pick}
                context={state.context[pick.moment.id]}
                now={now}
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
              <Text style={styles.sub}>{NEWEST_FIRST}</Text>
            </View>
          </View>
        }
      />
    );
  } else {
    body = null;
  }

  if (hiddenOpen && state.status === 'ready') {
    body = (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.pad}>
        <HiddenScreen
          items={hidden}
          moments={byId}
          names={state.prefs.renames}
          now={now}
          onBack={() => setHiddenOpen(false)}
          onOpen={open}
          onMoment={(id) => void resurface.restoreMoment(id)}
          onThread={(term) => void resurface.restoreThread(term)}
          onWord={(term) => void resurface.restoreWord(term)}
        />
      </ScrollView>
    );
  }

  return (
    <View style={styles.screen} testID="memories">
      {state.status === 'ready' && !thread && !hiddenOpen && (
        <View style={styles.bar}>
          <Pressable testID="memories-menu" accessibilityRole="button" accessibilityLabel="Memories options" onPress={() => setMenuOpen(true)} style={styles.menuBtn}>
            <Icon name="ellipsis-horizontal" size={22} color={theme.muted} />
          </Pressable>
        </View>
      )}
      {body}
      <MemoriesMenu
        open={menuOpen}
        off={state.prefs.off}
        onClose={() => setMenuOpen(false)}
        onHidden={() => {
          setMenuOpen(false);
          setHiddenOpen(true);
        }}
        onToggle={() => {
          setMenuOpen(false);
          void resurface.setOff(!state.prefs.off);
        }}
        onForget={() => {
          setMenuOpen(false);
          void resurface.forget().then((change) => say(FORGOT_TOAST, change));
        }}
      />
      <MemoryMenu
        open={!!menuMoment}
        onClose={() => setMenuFor(null)}
        onLess={() => {
          const id = menuFor;
          setMenuFor(null);
          if (id) {
            void resurface.less(id).then((change) => {
              const set = change.after.less.filter((t) => !change.before.less.includes(t));
              say(fewerLike(fewerWord(set, change.after.shown)), change);
            });
          }
        }}
        onHide={() => {
          const id = menuFor;
          setMenuFor(null);
          if (id) void resurface.hide(id).then((change) => say(HIDDEN_TOAST, change));
        }}
        onOpen={() => {
          const m = menuMoment;
          setMenuFor(null);
          if (m) open(m);
        }}
      />
      {toast && (
        <View style={styles.toast} accessibilityLiveRegion="polite" testID="memories-toast">
          <Text style={styles.toastText}>{toast.msg}</Text>
          <Pressable
            testID="memories-undo"
            accessibilityRole="button"
            accessibilityLabel="Undo"
            style={styles.undoHit}
            onPress={() => {
              const change = toast.change;
              setToast(null);
              void resurface.undo(change);
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
  bar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, width: '100%', maxWidth: 640, alignSelf: 'center' },
  menuBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  off: { backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.line, padding: 14, gap: 10, alignItems: 'flex-start' },
  offText: { color: theme.ink, fontSize: 15 },
  item: { paddingBottom: 12 },
  h: { color: theme.ink, fontSize: 16, fontWeight: '700' },
  sub: { color: theme.muted, fontSize: 13 },
  hint: { color: theme.muted, fontSize: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.line, borderRadius: 14, padding: 12 },
  quiet: { padding: 24, gap: 14, alignItems: 'flex-start' },
  quietText: { color: theme.ink, fontSize: 16, lineHeight: 23 },
  toast: { position: 'absolute', bottom: 16, left: 16, right: 16, alignSelf: 'center', maxWidth: 480, backgroundColor: theme.ink, borderRadius: 14, paddingHorizontal: 16, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  toastText: { color: theme.bg, fontSize: 14, flex: 1 },
  undo: { color: '#ffb48a', fontSize: 14, fontWeight: '700', paddingHorizontal: 8 },
  undoHit: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
