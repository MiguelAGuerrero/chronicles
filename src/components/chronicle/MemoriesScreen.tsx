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
import { fromLine } from '../../lib/resurface/views';
import { threads } from '../../lib/threads';
import { answeringLine, headingOf, threadLine as ownThreadLine } from '../../lib/threads/lines';
import { removalDissolves } from '../../lib/threads/rules';
import { answeredBy } from '../../lib/threads/timeline';
import { useThreads } from '../../lib/threads/useThreads';
import { ConfirmCard } from '../ConfirmCard';
import { MyThreads, type MyThreadRow } from '../threads/MyThreads';
import { OwnThreadScreen } from '../threads/OwnThreadScreen';
import { ThreadMomentMenu } from '../threads/ThreadMomentMenu';

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
  // The owner's threads (OT9-OT14): the one open, a moment's menu inside it, and the delete's confirm.
  const [ownId, setOwnId] = useState<string | null>(null);
  const [ownMenuFor, setOwnMenuFor] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // Remove from this thread asks first when it would end the thread (owner-threads audit 5).
  const [removing, setRemoving] = useState<{ threadId: string; momentId: string } | null>(null);
  // A kept Chronicle thread's own name, offered in the name field and never stored (audit 13); and one Keep at a time (audit 12).
  const [suggested, setSuggested] = useState<string | null>(null);
  const keeping = useRef(false);
  const { data: mine } = useThreads();
  // Another screen's "in a thread" asks for a thread to open (OT11): taken when this screen is shown, and while it is.
  useEffect(
    () =>
      threads.store.subscribe(() => {
        const id = threads.takeOpen();
        if (id) setOwnId(id);
      }),
    [],
  );
  // A reply linked after the viewer closed (a memo saved on its way out) is a moment Memories has not read yet (audit 8).
  useEffect(() => {
    let members = threads.store.get().data.members.length;
    return threads.store.subscribe(() => {
      const next = threads.store.get().data.members.length;
      if (next === members) return;
      members = next;
      void resurface.refresh();
    });
  }, []);
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
      void Promise.resolve().then(() => {
        const asked = threads.takeOpen();
        if (live && asked) setOwnId(asked);
      });
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

  // The owner's threads, over the moments Memories knows (OT12): the latest moment first, no rank or count shown.
  const myRows = useMemo(() => {
    const rows = mine.threads.flatMap((t) => {
      const ms = mine.members.filter((m) => m.thread_id === t.id).map((m) => byId.get(m.moment_id)).filter((m): m is MomentView => !!m);
      if (ms.length < 2) return [];
      const oldest = ms.reduce((o, m) => (m.t < o.t ? m : o));
      const latest = ms.reduce((o, m) => Math.max(o, m.t), 0);
      const h = headingOf({ name: t.name, place: oldest.place, t: oldest.t, words: oldest.words }, now);
      return [{ latest, row: { id: t.id, title: h.title, sub: h.sub, line: ownThreadLine(ms.length, oldest.t, now) } satisfies MyThreadRow }];
    });
    return rows.sort((a, b) => b.latest - a.latest).map((r) => r.row);
  }, [mine, byId, now]);
  const own = ownId ? mine.threads.find((t) => t.id === ownId) ?? null : null;
  const ownMoments = own ? mine.members.filter((m) => m.thread_id === own.id).map((m) => byId.get(m.moment_id)).filter((m): m is MomentView => !!m) : [];
  const ownMenuMoment = ownMenuFor ? byId.get(ownMenuFor) ?? null : null;
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
  // A reply says what it answers wherever it is listed (audit 1).
  const answerLine = (m: MomentView) => {
    const to = answeredBy(m.id, mine.links);
    const parent = to ? byId.get(to) : undefined;
    return parent ? answeringLine({ place: parent.place, t: parent.t, walkLine: fromLine(walkOf(parent)) }, now) : null;
  };
  const card = (m: MomentView) => (
    <MomentCard key={m.id} moment={m} walk={walkOf(m)} context={state.context[m.id]} now={now} answering={answerLine(m)} onOpen={() => open(m)} onWalk={(id) => router.push(`/replay/${id}?ceremony=0`)} onMore={() => setMenuFor(m.id)} />
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
  } else if (own) {
    body = (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.pad}>
        <OwnThreadScreen
          thread={own}
          moments={ownMoments}
          links={mine.links}
          walks={state.walks}
          now={now}
          onBack={() => setOwnId(null)}
          onOpen={open}
          onWalk={(id) => router.push(`/replay/${id}?ceremony=0`)}
          onMore={(m) => setOwnMenuFor(m.id)}
          onRename={(name) => void threads.rename(own.id, name).catch(() => {})}
          onDelete={() => setConfirmingDelete(true)}
          momentById={(id) => byId.get(id)}
          suggestion={suggested}
        />
      </ScrollView>
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
          onKeep={() => {
            // A tap copies the Chronicle's thread into one of the owner's; the Chronicle's own is untouched (OT19).
            // No name is kept for the owner: the Chronicle's is only offered in the name field (audit 13). One tap, one thread (audit 12).
            if (keeping.current) return;
            keeping.current = true;
            void threads.startThread(thread.momentIds).then((id) => {
              if (id) {
                setSuggested(thread.name);
                setThreadTerm(null);
                setOwnId(id);
              }
            }).catch(() => {}).finally(() => {
              keeping.current = false;
            });
          }}
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
            <MyThreads rows={myRows} onOpen={(id) => setOwnId(id)} />
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
      <ThreadMomentMenu
        open={!!ownMenuMoment}
        onClose={() => setOwnMenuFor(null)}
        onOpen={() => {
          const m = ownMenuMoment;
          setOwnMenuFor(null);
          if (m) open(m);
        }}
        onRemove={() => {
          const m = ownMenuMoment;
          setOwnMenuFor(null);
          if (!m || !own) return;
          if (removalDissolves(mine.members, own.id)) setRemoving({ threadId: own.id, momentId: m.id });
          else void threads.removeFromThread(own.id, m.id).catch(() => {});
        }}
      />
      {removing && (
        <ConfirmCard
          testID="confirm-remove"
          text={{ title: 'Remove it from this thread?', body: 'This thread has two moments, so removing one ends it. The moments stay kept.', confirm: 'Remove' }}
          onCancel={() => setRemoving(null)}
          onConfirm={() => {
            const r = removing;
            setRemoving(null);
            setOwnId(null);
            void threads.removeFromThread(r.threadId, r.momentId).catch(() => {});
          }}
        />
      )}
      {confirmingDelete && own && (
        <ConfirmCard
          testID="confirm"
          text={{ title: 'Delete this thread?', body: 'The moments stay kept. You can undo it for 5 seconds.', confirm: 'Delete' }}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={() => {
            setConfirmingDelete(false);
            setOwnId(null);
            threads.deleteThread(own.id);
          }}
        />
      )}
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
        onClose={() => {
          setViewing(null);
          // A reply made from the viewer is a new moment: Memories and the threads read again.
          void resurface.refresh();
          threads.load().catch(() => {});
        }}
        thread={own ? { id: own.id, name: own.name } : null}
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
