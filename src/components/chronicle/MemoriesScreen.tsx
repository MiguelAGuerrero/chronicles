import { noteTypeOf } from '../../lib/noteType';
import type { Faced } from '../../lib/moment';
import { router, useFocusEffect, useIsFocused } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { JOURNAL_PAGE, journalMoments, journalPage } from '../../lib/journal/page';
import type { MomentState } from '../../lib/useCaptures';
import { captureEdits } from '../../lib/captureEdits';
import { dayKey } from '../../lib/days';
import { FORGOT_TOAST, HIDDEN_TOAST, NOT_A_THREAD, fewerLike, fewerWord, withSaveNote } from '../../lib/resurface/copy';
import { hiddenItems } from '../../lib/resurface/hidden';
import { resurface } from '../../lib/resurface';
import { useResurface } from '../../lib/resurface/useResurface';
import type { PrefsChange } from '../../lib/resurface/prefs';
import type { MomentView, Thread } from '../../lib/resurface/types';
import { onRecallOpen, recallWaiting, takeRecallOpen } from '../../lib/discovery/recallCheck';
import { chronicleSection } from '../../lib/resurface/sectionStore';
import { useOpenWalkInfo } from '../OpenWalk';
import { UndoToast } from '../UndoToast';
import { useStore } from '../../lib/useStore';

import { showWalk } from '../../lib/walkNav';
import { CaptureViewer } from '../CaptureView';
import { Icon } from '../icons';
import { Button, theme } from '../ui';
import { Entry, type NoFix } from '../journal/Entry';
import { FOOT_GAP, JournalPage, type JournalPageHandle } from '../journal/JournalPage';
import { LINE_REST_H, OpenLine, type OpenLineHandle } from '../journal/OpenLine';
import { Slip } from '../journal/Slip';
import { HiddenScreen } from './HiddenScreen';
import { MemoriesMenu } from './MemoriesMenu';
import { MemoryMenu } from './MemoryMenu';
import { ThreadScreen } from './ThreadScreen';
import { ThreadsRail } from './ThreadsRail';
import { closedWalks, fromLine, threadPool, wordsOf } from '../../lib/resurface/views';
import { threads } from '../../lib/threads';
import { answeringLine, headingOf, threadLine as ownThreadLine } from '../../lib/threads/lines';
import { removalDissolves } from '../../lib/threads/rules';
import { answeredBy } from '../../lib/threads/timeline';
import { useThreads } from '../../lib/threads/useThreads';
import { MyThreads, type MyThreadRow } from '../threads/MyThreads';
import { OwnThreadScreen } from '../threads/OwnThreadScreen';
import { ThreadMomentMenu } from '../threads/ThreadMomentMenu';

const TOAST_MS = 4200;
const stepIndex = (s: { index: number }) => s.index;
const NO_IDS: string[] = [];

/** A moment kept in this sitting, as the page draws it before (or without) a read of the store (JN9). */
const viewOf = (c: Faced): MomentView => ({ id: c.id, t: c.t, kind: c.kind, walkId: c.walk_id, words: wordsOf(c), place: null, hasMedia: c.kind === 'text' ? true : !!c.file_path, capture: c });

/**
 * Chronicle's Memories as a journal (chronicle journal JN1-JN24, decision 0155): every kept moment as an entry on
 * one sheet in book order, a resurfaced moment as a slip on today's page, and the open line at the foot, where
 * writing is the capture. Threads, Hidden and the resurfacing choices are behind the contents button.
 */
export function MemoriesScreen() {
  const { state, feed, now: readAt, hidden: deletedIds } = useResurface();
  // The page's own clock (audit 11): the read's `now` is set when Memories comes to the front, and a page left open
  // would date a new entry against it (no "No location" after its minute, yesterday's heading past midnight).
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const now = Math.max(readAt, tick);
  const index = useStore(resurface.store, stepIndex);
  const [limit, setLimit] = useState(JOURNAL_PAGE);
  // The contents' Threads (JN21): the Chronicle's threads and the owner's, off the page.
  const [threadsOpen, setThreadsOpen] = useState(false);
  // The slip's More also holds Relive it and Another (JN20).
  const [menuFromSlip, setMenuFromSlip] = useState(false);
  // The piece the open line is writing: drawn there, not on the page.
  const [writing, setWriting] = useState<string | null>(null);
  // Why a moment kept in this sitting has no place, when the line was told (JN5), and those moments themselves,
  // so they are drawn while the page is loading or could not be read (JN9).
  const [reasons, setReasons] = useState<Record<string, NoFix>>({});
  const [session, setSession] = useState<MomentView[]>([]);
  const pageRef = useRef<JournalPageHandle>(null);
  const [threadTerm, setThreadTerm] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  // More was opened from the sign on an entry's row: the eight at once (NY27).
  const [typeOnly, setTypeOnly] = useState(false);
  // The owner's threads (OT9-OT14): the one open, a moment's menu inside it, and the delete's confirm.
  const [ownId, setOwnId] = useState<string | null>(null);
  const [ownMenuFor, setOwnMenuFor] = useState<string | null>(null);
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
  const [viewing, setViewing] = useState<Faced[] | null>(null);
  // A note's page is headed by the line Lately reads for it (note pages NP2; note-pages audit 2).
  const headsOf = (list: { id: string }[] | null): Map<string, string> | undefined => {
    if (!list) return undefined;
    const m = new Map<string, string>();
    for (const c of list) {
      const e = state.context[c.id];
      if (e?.state === 'done') m.set(c.id, e.line);
    }
    return m;
  };
  const [menuOpen, setMenuOpen] = useState(false);
  const [hiddenOpen, setHiddenOpen] = useState(false);
  // A reminder tapped with no walk open lands on Chronicle and opens its capture at once (NV13), as the map's
  // screen does; with a walk open, the walk screen opens it and this declines. Until the keeper knows, it declines.
  const [recalled, setRecalled] = useState<Faced[] | null>(null);
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
        router.navigate('/');
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
        const found = open ? [] : await takeRecallOpen().catch(() => [] as Faced[]);
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
  // The owner's threads also show a moment of a walk still open (a reply made mid-walk); the feed never does (RM17).
  const inThreadById = useMemo(() => threadPool(state.moments, state.inOpenWalk, deletedIds), [state.moments, state.inOpenWalk, deletedIds]);
  const threadWalks = useMemo(() => closedWalks(state.walks), [state.walks]);
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
      const ms = mine.members.filter((m) => m.thread_id === t.id).map((m) => inThreadById.get(m.moment_id)).filter((m): m is MomentView => !!m);
      if (ms.length < 2) return [];
      const oldest = ms.reduce((o, m) => (m.t < o.t ? m : o));
      const latest = ms.reduce((o, m) => Math.max(o, m.t), 0);
      const h = headingOf({ name: t.name, place: oldest.place, t: oldest.t, words: oldest.words }, now);
      return [{ latest, row: { id: t.id, title: h.title, sub: h.sub, line: ownThreadLine(ms.length, oldest.t, now) } satisfies MyThreadRow }];
    });
    return rows.sort((a, b) => b.latest - a.latest).map((r) => r.row);
  }, [mine, inThreadById, now]);
  const own = ownId ? mine.threads.find((t) => t.id === ownId) ?? null : null;
  const ownMoments = own ? mine.members.filter((m) => m.thread_id === own.id).map((m) => inThreadById.get(m.moment_id)).filter((m): m is MomentView => !!m) : [];
  const ownMenuMoment = ownMenuFor ? inThreadById.get(ownMenuFor) ?? null : null;
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
  // The page (JN1, JN2, JN8): the feed's moments and an open walk's, in book order; before a read, or when it
  // failed, what was kept in this sitting.
  const ready = state.status === 'ready';
  const moments = useMemo(
    () => (ready ? journalMoments(feed.moments, state.inOpenWalk, deletedIds) : journalMoments(session, [], deletedIds)),
    [ready, feed.moments, state.inOpenWalk, deletedIds, session],
  );
  const page = useMemo(() => journalPage(moments, now, limit, { slip: ready && !!pick }), [moments, now, limit, ready, pick]);
  // The context of the entries drawn, read once each (MC6); a failed read is asked again when the moments are.
  const drawn = useMemo(() => page.rows.flatMap((r) => (r.k === 'entry' ? [r.key] : [])).join(' '), [page.rows]);
  useEffect(() => {
    if (ready && drawn) void resurface.contextFor(drawn.split(' '), deletedIds);
  }, [ready, drawn, deletedIds, state.version]);

  const say = (msg: string, change: PrefsChange) => {
    if (timer.current) clearTimeout(timer.current);
    // A choice that could not be kept shows for now, and the toast says so (audit 10).
    setToast({ msg: withSaveNote(msg, change.saved), change });
    timer.current = setTimeout(() => setToast(null), TOAST_MS);
  };
  const open = (m: MomentView) => setViewing([m.capture]);
  const relive = (m: MomentView) => router.push(m.walkId ? `/replay/${m.walkId}?ceremony=0` : `/day/${dayKey(m.t)}`);
  // The capture band (HC6-HC11): in front only while nothing is open over Memories, so opening a moment, a
  // menu, Relive or a replay mid-memo saves the memo first, and nothing plays over a recording.
  const isFocused = useIsFocused();
  const bandFocused = isFocused && !viewing && !recalled && !menuFor && !ownMenuFor && !menuOpen;
  // A viewer opened mid-memo waits until the memo has stopped, so nothing plays over a recording (audit 8).
  const [memoOn, setMemoOn] = useState(false);
  // A moment kept from the band heads Lately at once, and gains its place when its fix comes (HC9).
  const onMoment = useCallback((c: Faced, state: MomentState) => {
    setSession((prev) => [...prev.filter((m) => m.id !== c.id), viewOf(c)]);
    if (state === 'kept' || state === 'placed') void resurface.refresh();
    else setReasons((prev) => ({ ...prev, [c.id]: state }));
  }, []);
  const onChanged = useCallback(() => {
    setTick(Date.now());
    void resurface.refresh();
  }, []);
  // What the line wrote or removed, in this sitting's own copy, so the page is whole before a read and when one fails (audit 6).
  const onWritten = useCallback((e: { momentId: string; pieceId: string }, body: string, format?: 'md') => {
    setSession((prev) => prev.map((m) => {
      if (m.id !== e.momentId) return m;
      // A page's write is Markdown, and the copy says so, or the sheet would draw its marks raw (fix journal-note-pages audit 6).
      const was = format ? { body, body_format: format } : { body };
      const pieces = m.capture.pieces.map((p) => (p.id === e.pieceId ? { ...p, ...was } : p));
      const capture = { ...m.capture, pieces, ...(m.capture.piece_id === e.pieceId ? was : null) };
      return { ...m, capture, words: wordsOf(capture) };
    }));
  }, []);
  const onDropped = useCallback((e: { momentId: string; pieceId: string }, gone: 'moment' | 'piece') => {
    setSession((prev) => (gone === 'moment'
      ? prev.filter((m) => m.id !== e.momentId)
      : prev.map((m) => (m.id === e.momentId ? { ...m, capture: { ...m.capture, pieces: m.capture.pieces.filter((p) => p.id !== e.pieceId) } } : m))));
  }, []);
  // A tap in the line brings today's foot into view (JN9, JN11).
  const toFoot = useCallback(() => pageRef.current?.toFoot(), []);
  // Something was kept from the line: from a thread, the threads or Hidden that means back to the page, which opens
  // at its foot, so what was kept is seen (audit 15). Not on the tap itself: the field must keep its focus.
  const onSeen = useCallback(() => {
    setThreadTerm(null);
    setOwnId(null);
    setThreadsOpen(false);
    setHiddenOpen(false);
    pageRef.current?.toFoot();
  }, []);
  // Every list scrolls its last entry clear above the open line (JN9), and messages sit above it (JN18).
  // The line grows by its status row while it is written in; the sheet's foot follows what it measures (ui 1).
  const [lineH, setLineH] = useState(LINE_REST_H);
  const clear = { paddingBottom: lineH + 24 };
  // Memories' own toast (Undo) goes in the band's column, above its pills, so the two never cover each other (audit 2).
  const undoToast = toast ? (
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
  ) : null;
  const menuMoment = menuFor ? inThreadById.get(menuFor) ?? null : null;
  // The moment's first note: what Type in More marks (note types NY23).
  // The note that has a type, else the first (audit 57): what the sheet shows is what the page shows.
  const menuNote = menuMoment?.capture.pieces.find((p) => p.kind === 'text' && noteTypeOf(p.note_type)) ?? menuMoment?.capture.pieces.find((p) => p.kind === 'text') ?? null;
  const walkOf = (m: MomentView) => (m.walkId ? state.walks[m.walkId] : undefined);
  // A reply says what it answers wherever it is listed (audit 1).
  const answerLine = (m: MomentView) => {
    const to = answeredBy(m.id, mine.links);
    const parent = to ? inThreadById.get(to) : undefined;
    return parent ? answeringLine({ place: parent.place, t: parent.t, walkLine: fromLine(walkOf(parent)) }, now) : null;
  };
  const entry = (m: MomentView) => {
    const c = m.capture;
    return (
      <Entry
        moment={m}
        walk={m.walkId ? threadWalks[m.walkId] : undefined}
        context={state.context[m.id]}
        now={now}
        reason={reasons[m.id] ?? null}
        answering={answerLine(m)}
        writing={writing}
        onOpen={() => open(m)}
        onMap={c.lat != null && c.lon != null ? () => chronicleSection.showMoment([c.lon as number, c.lat as number]) : undefined}
        onWalk={(id) => router.push(`/replay/${id}?ceremony=0`)}
        onMore={() => { setMenuFromSlip(false); setTypeOnly(false); setMenuFor(m.id); }}
        onType={(piece) => lineRef.current?.pickType({ piece: piece.id, type: piece.note_type, onPick: (t) => void resurface.saveNote({ ...c, piece_id: piece.id }, '', t, true).catch(() => {}) })}
        typeOpen={typeOpen}
        onReact={dayKey(m.t) === dayKey(now) ? () => { setMenuFromSlip(false); setTypeOnly(true); setMenuFor(m.id); } : undefined}
        onOpenRef={open}
      />
    );
  };
  const failedNotice = state.status === 'failed' ? (
    <View style={styles.quiet} testID="memories-failed">
      <Text style={styles.quietText}>Couldn’t read your moments.</Text>
      <Button label="Try again" variant="secondary" onPress={() => { setHiddenOpen(false); void resurface.load(); }} />
    </View>
  ) : null;

  let body;
  if (own && ready) {
    body = (
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.pad, clear]}>
        <OwnThreadScreen
          thread={own}
          moments={ownMoments}
          links={mine.links}
          walks={threadWalks}
          now={now}
          onBack={() => setOwnId(null)}
          onOpen={open}
          onWalk={(id) => router.push(`/replay/${id}?ceremony=0`)}
          onMore={(m) => setOwnMenuFor(m.id)}
          onRename={(name) => void threads.rename(own.id, name).catch(() => {})}
          onDelete={() => {
            // At once, with Undo (UC4): a thread can be brought back until the pill is closed.
            setOwnId(null);
            threads.deleteThread(own.id);
          }}
          momentById={(id) => inThreadById.get(id)}
          suggestion={suggested}
        />
      </ScrollView>
    );
  } else if (thread) {
    body = (
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.pad, clear]}>
        <ThreadScreen
          thread={thread}
          moments={thread.momentIds.map((id) => byId.get(id)).filter((m): m is MomentView => !!m)}
          walks={state.walks}
          now={now}
          onBack={() => setThreadTerm(null)}
          onOpen={open}
          onWalk={(id) => router.push(`/replay/${id}?ceremony=0`)}
          onMore={(m) => { setMenuFromSlip(false); setTypeOnly(false); setMenuFor(m.id); }}
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
  } else if (threadsOpen && ready) {
    body = (
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.pad, clear]}>
        <View style={styles.threads} testID="threads-screen">
          <Pressable testID="threads-back" accessibilityRole="button" accessibilityLabel="Back to the journal" onPress={() => setThreadsOpen(false)} style={styles.back}>
            <Icon name="chevron-back" size={20} color={theme.ink} />
            <Text style={styles.backText}>Journal</Text>
          </Pressable>
          {feed.threads.length > 0 ? (
            <ThreadsRail threads={feed.threads} moments={byId} now={now} onOpen={(t: Thread) => setThreadTerm(t.term)} />
          ) : (
            <Text style={styles.hint} testID="threads-hint">Threads appear once you keep coming back to something.</Text>
          )}
          <MyThreads rows={myRows} onOpen={(id) => setOwnId(id)} />
        </View>
      </ScrollView>
    );
  } else {
    // The journal's page: drawn below, where the open line hands it the field to write in (JN28).
    body = null;
  }

  if (hiddenOpen && state.status === 'ready') {
    body = (
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.pad, clear]}>
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

  const subScreen = ready && (!!thread || !!own || threadsOpen || hiddenOpen);
  const lineRef = useRef<OpenLineHandle>(null);
  // The row under the line is out of view: the bar holds the pen, the camera and the mic (audit 50, JN37).
  const [away, setAway] = useState(false);
  // The sheet has opened: until it has, the bar holds the camera and the mic (JN35).
  const [sheetOpen, setSheetOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const journal = (line: { field: ReactNode; writing: boolean; entryOpen: boolean }) => (
    <JournalPage
      ref={pageRef}
      rows={page.rows}
      more={page.more}
      now={now}
      onMore={() => setLimit((l) => l + JOURNAL_PAGE)}
      footPad={lineH + FOOT_GAP}
      notice={failedNotice}
      loaded={state.status !== 'loading'}
      entry={entry}
      field={line.field}
      onWrite={() => lineRef.current?.write()}
      writing={line.writing}
      focused={isFocused}
      onAway={setAway}
      onOpen={setSheetOpen}
      slip={pick ? (
        <Slip
          pick={pick}
          context={state.context[pick.moment.id]}
          now={now}
          onOpen={() => open(pick.moment)}
          onMore={() => { setMenuFromSlip(true); setTypeOnly(false); setMenuFor(pick.moment.id); }}
        />
      ) : null}
    />
  );

  return (
    <View style={styles.screen} testID="memories">
      {ready && !subScreen && (
        <View style={styles.bar}>
          <Pressable testID="memories-menu" accessibilityRole="button" accessibilityLabel="Contents: threads, hidden and options" onPress={() => setMenuOpen(true)} style={styles.menuBtn}>
            <Text style={styles.menuText}>Contents</Text>
          </Pressable>
        </View>
      )}
      {/* First after the options button, so a screen reader reaches the band before the feed (HC8); drawn at the foot.
          Inside a thread or Hidden, after the screen, so its Back and heading come first (audit 9). */}
      {/* The open line owns the bar at the foot and the field; the page takes the field as its last line (JN28), and a
          screen with no page (a thread, the threads, Hidden) leaves it in the bar. */}
      <OpenLine ref={lineRef} inBar={body != null} penInBar={away} opened={sheetOpen} onTypeOpen={setTypeOpen} focused={bandFocused} onChanged={onChanged} onMoment={onMoment} onWriting={setWriting} onWritten={onWritten} onDropped={onDropped} onRecording={setMemoOn} onFoot={toFoot} onSeen={onSeen} onHeight={setLineH} above={<>{undoToast}<UndoToast style={styles.undoInColumn} /></>}>
        {(line) => (line ? journal(line) : body)}
      </OpenLine>
      <MemoriesMenu
        open={menuOpen}
        off={state.prefs.off}
        onClose={() => setMenuOpen(false)}
        onThreads={() => {
          setMenuOpen(false);
          setThreadsOpen(true);
        }}
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
        onlyType={typeOnly}
        type={menuNote && menuMoment ? { chosen: noteTypeOf(menuNote.note_type), onChoose: (t) => { const m = menuMoment; setMenuFor(null); void resurface.saveNote({ ...m.capture, piece_id: menuNote.id }, '', t, true).catch(() => {}); } } : undefined}
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
        onMap={menuMoment && menuMoment.capture.lat != null && menuMoment.capture.lon != null ? () => {
          const c = menuMoment.capture;
          setMenuFor(null);
          chronicleSection.showMoment([c.lon as number, c.lat as number]);
        } : undefined}
        onRelive={menuFromSlip && menuMoment ? () => {
          const m = menuMoment;
          setMenuFor(null);
          relive(m);
        } : undefined}
        onAnother={menuFromSlip ? () => {
          setMenuFor(null);
          resurface.another();
        } : undefined}
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
          // At once, with Undo (UC6); a thread it ends leaves the screen until Undo or Close.
          if (removalDissolves(mine.members, own.id)) setOwnId(null);
          threads.removeFromThread(own.id, m.id);
        }}
      />
      <CaptureViewer
        key={`memory:${viewing?.[0]?.id ?? 'none'}`}
        captures={!memoOn && viewing ? viewing.map((v) => inThreadById.get(v.id)?.capture ?? v) : null}
        onClose={() => {
          setViewing(null);
          // A reply made from the viewer is a new moment: Memories and the threads read again.
          void resurface.refresh();
          threads.load().catch(() => {});
        }}
        thread={own ? { id: own.id, name: own.name } : null}
        heads={headsOf(viewing)}
        remind
        onSaveEdit={async (c, patch) => {
          await captureEdits.save(c, patch);
          resurface.patch(c.id, patch, c.piece_id);
        }}
        onSaveNote={(c, body, type, only) => resurface.saveNote(c, body, type, only)}
      />
      <CaptureViewer
        key={recalled?.[0]?.id ?? 'none'}
        captures={memoOn ? null : recalled}
        heads={headsOf(recalled)}
        onClose={() => setRecalled(null)}
        autoPlay
        remind
        onSaveNote={(c, body, type, only) => resurface.saveNote(c, body, type, only)}
      />
      {/* Above the open line, whatever its height: a delete's Undo waits, and must never cover the line or sit under it (fix journal-note-pages audit 1). */}
    </View>
  );
}

const styles = StyleSheet.create({
  // A delete's Undo sits in the line's column of messages, so the sheet makes room for it and it never covers the
  // line's row (JN40).
  undoInColumn: { position: 'relative', left: 0, right: 0, width: '100%' },
  screen: { flex: 1, backgroundColor: theme.bg },
  scroll: { flex: 1 },
  pad: { paddingHorizontal: 16, paddingBottom: 24, width: '100%', maxWidth: 640, alignSelf: 'center' },
  threads: { gap: 22 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start', paddingRight: 12 },
  backText: { color: theme.ink, fontSize: 16, fontWeight: '600' },
  bar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, width: '100%', maxWidth: 640, alignSelf: 'center' },
  menuBtn: { minWidth: 44, height: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  menuText: { color: theme.ink, fontSize: 15, fontWeight: '600' },
  hint: { color: theme.muted, fontSize: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.line, borderRadius: 14, padding: 12 },
  quiet: { paddingVertical: 8, gap: 14, alignItems: 'flex-start' },
  quietText: { color: theme.ink, fontSize: 16, lineHeight: 23 },
  toast: { width: '100%', maxWidth: 480, backgroundColor: theme.ink, borderRadius: 14, paddingHorizontal: 16, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  toastText: { color: theme.bg, fontSize: 14, flex: 1 },
  undo: { color: '#ffb48a', fontSize: 14, fontWeight: '700', paddingHorizontal: 8 },
  undoHit: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
