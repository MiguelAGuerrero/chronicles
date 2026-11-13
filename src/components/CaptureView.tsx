import { type Faced, faced, facedAt, hasMore, pieceKey } from '../lib/moment';
import { split } from '../lib/split';
import { momentPill } from '../lib/momentPill';
import { useStore } from '../lib/useStore';
import { useAudioPlayer, useAudioPlayerStatus, type AudioPlayer } from 'expo-audio';
import { forwardRef, useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { HANDOFF_HINT } from '../lib/nav/openInMaps';
import { AccessibilityInfo, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type LayoutChangeEvent, type LayoutRectangle, type StyleProp, type ViewStyle } from 'react-native';
import { Modal } from './Modal';
import { NoteMark } from './NoteMark';
import { MemoTranscript } from './MemoTranscript';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../lib/db';
import { editedRecall, liveRecalls, newRecall } from '../lib/discovery/recall';
import { saveRecall, stopRecall, storedRecall } from '../lib/discovery/recallCheck';
import { notifier } from '../lib/notify';
import type { Recall } from '../lib/discovery/types';
import { dropBaked, KeeperError, saveKeeper } from '../lib/export';
import { probeVideoSize, releaseMedia, resolveMedia } from '../lib/media';

import { useMediaUri } from '../lib/useMediaUri';
import { useBaker } from './Baker';
import { EditedPhoto } from './edit/EditedPhoto';
import { AUTOPLAY_CHECK_MS, EditedVideo } from './edit/EditedVideo';
import { MediaEditor, type MediaEditorHandle } from './edit/MediaEditor';
import type { CapturePatch } from '../lib/captureBus';
import { exportPlan, isEmptyEdit } from '../lib/mediaEdit';
import { exportVideo } from '../lib/videoEdit';
import { RemindEditor } from './RemindEditor';
import { NotePage, NoteReader, type NotePageHandle } from './notePage/NotePage';
import { noteHead, type NoteHead } from '../lib/notePage/head';
import { UndoToast } from './UndoToast';
import { deleteMoment, deletePiece } from '../lib/deletion';
import { useHidden, useVisible } from '../lib/deletion/useDeletions';
import { mentioning, plainNote, withGone } from '../lib/refs';
import type { MomentView } from '../lib/resurface/types';
import { useMomentPool } from './threads/useMomentPool';
import { MomentPicker } from './threads/MomentPicker';
import { NoteText } from './threads/NoteText';
import { router } from 'expo-router';
import { chronicleSection } from '../lib/resurface/sectionStore';
import { threads } from '../lib/threads';
import { AddToThread } from './threads/AddToThread';
import { ReplyDock, DOCK_H, type ReplyStage } from './threads/ReplyDock';
import { ResponsesSheet } from './threads/ResponsesSheet';
import { responseRows, responsesOf } from '../lib/threads/responses';
import { IN_A_THREAD, MENTIONED, responsesWord } from '../lib/threads/lines';
import { barsShown, viewerLine } from '../lib/viewerBars';
import { trimmedLine, voiceClock, voiceReachedEnd, voiceSpan, voiceState, wholeMs } from '../lib/voiceTrim';
import type { MediaEdit } from '../lib/mediaEdit';
import { threadsOf } from '../lib/threads/rules';
import { useThreads } from '../lib/threads/useThreads';
import { Icon, KIND_LABEL } from './icons';
import { theme } from './ui';

export { useMediaUri };

/**
 * Where a touch is, on phones and the web: react-native-web hands over the browser's own TouchEvent, which has no page
 * point of its own, so it is read from the touch lists (a lifted finger is only in changedTouches).
 */
function touchPoint(e: { pageX?: number; pageY?: number; touches?: ArrayLike<{ pageX: number; pageY: number }>; changedTouches?: ArrayLike<{ pageX: number; pageY: number }> }): { x: number; y: number } | null {
  const t = e.touches?.[0] ?? e.changedTouches?.[0];
  const x = t?.pageX ?? e.pageX;
  const y = t?.pageY ?? e.pageY;
  return x == null || y == null ? null : { x, y };
}

const timeOf = (c: Faced) => new Date(c.t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
/** The viewer's top bar (Close, More) over a note's page: 48 pt buttons and their margins. */
const VIEWER_TOP = 64;

/** A refused memo in a replay that moves on by itself waits this long, as a photo does. */
const REFUSED_MOVE_ON_MS = 4000;

/** A trimmed memo's player reports every 100 ms, so it stops at the end handle, not up to half a second late (VT6). */
const TRIMMED_PLAYER = { updateInterval: 100 };
// Module level, so the compiler lint does not see a player mutated in a component (captures-and-media rules).
function seekMemo(player: AudioPlayer, s: number) {
  void player.seekTo(s);
}
function pauseMemo(player: AudioPlayer) {
  player.pause();
}

/**
 * A voice memo with a play/pause control; `autoPlay` starts it, `onFinished` fires when it ends. A trimmed memo
 * (VT6, VT7) starts at the start handle, stops at the end handle and counts as finished there; its clock and bar
 * read against the kept part.
 */
function VoicePlayer(props: { uri: string; autoPlay?: boolean; onFinished?: () => void; durationMs: number; edit?: MediaEdit | null }) {
  const trim = props.edit?.trim ?? null;
  const player = useAudioPlayer(props.uri, trim ? TRIMMED_PLAYER : undefined);
  const status = useAudioPlayerStatus(player);
  const { autoPlay, onFinished } = props;
  const playing = useRef(false);
  const finished = useRef(onFinished);
  useEffect(() => {
    playing.current = status.playing;
    finished.current = onFinished;
  }, [status.playing, onFinished]);
  // The stored length wins; the file's own only for a memo with none on record, so every surface agrees (audit 3, 4).
  const whole = wholeMs(props.durationMs, (status.duration || 0) * 1000);
  const span = voiceSpan(trim, whole);
  const where = voiceState(status.currentTime, span);
  // The press that restarts the kept part names the position it left: until the player moves off it, it is not the end (audit 2).
  const [restartedFrom, setRestartedFrom] = useState<number | null>(null);
  const restarting = restartedFrom !== null && status.currentTime === restartedFrom;
  const atEnd = !!trim && voiceReachedEnd(status.currentTime, span, restarting);
  // Once per play: the trim's end and the file's end can both say so.
  const reported = useRef(false);
  const report = () => {
    if (reported.current) return;
    reported.current = true;
    finished.current?.();
  };
  // A browser that refuses to start it without a tap (iOS) leaves the play
  // button showing; a replay that moves on by itself then moves on after a
  // while, instead of waiting for an end that never comes.
  const refused = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!autoPlay || !status.isLoaded) return;
    if (trim) seekMemo(player, trim.start_ms / 1000);
    player.play();
    if (Platform.OS !== 'web') return;
    const check = setTimeout(() => {
      if (!playing.current) refused.current = setTimeout(() => finished.current?.(), REFUSED_MOVE_ON_MS);
    }, AUTOPLAY_CHECK_MS);
    return () => {
      clearTimeout(check);
      if (refused.current) clearTimeout(refused.current);
    };
    // Only once the memo has loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.isLoaded]);
  useEffect(() => {
    if (status.playing && !atEnd) reported.current = false;
  }, [status.playing, atEnd]);
  useEffect(() => {
    if (status.didJustFinish) report();
  }, [status.didJustFinish]);
  // A trimmed memo that reaches its end handle stops and is finished; one found before its start is brought to it.
  const stopAtEnd = status.playing && atEnd;
  useEffect(() => {
    if (!stopAtEnd) return;
    pauseMemo(player);
    report();
  }, [stopAtEnd, player]);
  const strayed = !!trim && status.playing && where === 'before';
  useEffect(() => {
    if (strayed) seekMemo(player, span.startMs / 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strayed, player]);
  const clock = voiceClock(status.currentTime, span);
  const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
  return (
    <View style={styles.voice}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={status.playing ? 'Pause voice memo' : 'Play voice memo'}
        onPress={() => {
          if (refused.current) clearTimeout(refused.current);
          if (status.playing) player.pause();
          else {
            if (trim && where === 'end') {
              setRestartedFrom(status.currentTime);
              seekMemo(player, span.startMs / 1000);
            } else if (status.didJustFinish || (!trim && whole && status.currentTime * 1000 >= whole - 100)) player.seekTo(span.startMs / 1000);
            player.play();
          }
        }}
        style={styles.playBtn}
        hitSlop={8}
      >
        <Icon name={status.playing ? 'pause' : 'play'} size={26} color="#ffffff" />
      </Pressable>
      <View style={styles.track}>
        <View style={[styles.trackFill, { width: `${clock.ofMs ? Math.min(100, (clock.atMs / clock.ofMs) * 100) : 0}%` }]} />
      </View>
      <Text style={styles.voiceTime} testID="voice-time">
        {fmt(clock.atMs)} / {fmt(clock.ofMs)}
      </Text>
    </View>
  );
}


/** A video's own controls sit along the bottom of its picture; what stands above the strip leaves them this much. */

/**
 * The picture's area: a plain view, or, in the viewer, a button whose tap shows or hides the bars (UC7). The
 * picture itself lets taps through to it.
 */
function MediaArea(props: { onTap?: () => void; onLayout: (e: LayoutChangeEvent) => void; style: StyleProp<ViewStyle>; children: ReactNode }) {
  if (!props.onTap) {
    return <View style={props.style} onLayout={props.onLayout} pointerEvents="box-none">{props.children}</View>;
  }
  return (
    <Pressable style={props.style} onLayout={props.onLayout} onPress={props.onTap} accessibilityRole="button" accessibilityLabel="Show or hide the controls" testID="viewer-media">
      {props.children}
    </Pressable>
  );
}

/**
 * One capture, full screen. A photo or video fills everything above a thin
 * strip holding its details and the actions (previous and next, or the
 * replay's Continue), so the player's own controls never meet them. A note
 * or voice memo sits in a card over whatever is behind it.
 */
export const CaptureContent = forwardRef<ComponentRef<typeof Pressable>, {
  capture: Faced;
  autoPlay?: boolean;
  onVoiceFinished?: () => void;
  footer?: string;
  /** The viewer's parts of the line, in order; it names the day first and keeps one thread status (audit 19, 21). */
  parts?: (string | null | undefined)[];
  /** Unused by the full-screen layout; kept so callers can pass the safe area. */
  topInset?: number;
  nav?: { onPrev?: () => void; onNext?: () => void };
  /** Stepping through a moment's pieces (MS10): drawn unlike `nav`, spoken "in this moment". */
  pieces?: { onPrev?: () => void; onNext?: () => void };
  /** A primary action (the replay's Continue), within thumb reach. The ref is the action's. */
  action?: { label: string; hint?: string; onPress: () => void; testID?: string };
  /** Room left clear at the bottom for the viewer's docked toolbar, so nothing sits over the moment (OT27). */
  dock?: number;
  /** The viewer's bars are hidden: no strip, and the picture fills the screen (UC7). */
  bare?: boolean;
  /** A tap on the picture (a photo in the viewer): shows or hides the viewer's bars (UC7). */
  onMediaTap?: () => void;
  /** A note's mentions are drawn as cards that open their moments (moment references RF4); else they read as words (RF6). */
  onOpenRef?: (v: MomentView) => void;
  /** A moment's responses, named in words at the end of the info line, a button that opens them (response thread RT1). */
  responses?: { text: string; onPress: () => void } | null;
  /** A note is read as its page (NP5): its head, its drawing to its last line; a tap on the words asks to edit. */
  note?: { head: NoteHead; onEdit?: () => void; onOpenMention: (id: string) => void; gone?: (id: string) => boolean };
}>(function CaptureContent(props, actionRef) {
  const { capture } = props;
  const insets = useSafeAreaInsets();
  const uri = useMediaUri(capture);
  const media = (capture.kind === 'photo' || capture.kind === 'video') && !!uri;
  const [box, setBox] = useState<LayoutRectangle | null>(null);
  const [now] = useState(() => Date.now());
  const meta = viewerLine({ kind: KIND_LABEL[capture.kind], t: capture.t, time: timeOf(capture), now, parts: props.parts ?? [props.footer] });
  // The responses' words come last, inside the info line: the viewer's only control for them (RT1, RT11).
  const responsesLink = (onDark: boolean) =>
    props.responses ? (
      <Text>
        {' · '}
        <Text testID="viewer-responses-link" accessibilityRole="button" accessibilityHint="Opens the responses" onPress={props.responses.onPress} style={[styles.responsesLink, onDark && styles.responsesLinkDark]}>
          {props.responses.text}
        </Text>
      </Text>
    ) : null;
  const actions = (onDark: boolean) => (
    <>
      {props.action && (
        <Pressable
          ref={actionRef}
          testID={props.action.testID}
          accessibilityRole="button"
          accessibilityHint={props.action.hint}
          onPress={props.action.onPress}
          style={({ pressed }) => [styles.action, pressed && styles.dim]}
        >
          <Text style={styles.actionText}>{props.action.label}</Text>
          <Icon name="chevron-forward" size={20} color="#ffffff" />
        </Pressable>
      )}
      {props.pieces && (
        <View style={styles.nav}>
          {([['Previous in this moment', 'arrow-back-circle-outline', props.pieces.onPrev], ['Next in this moment', 'arrow-forward-circle-outline', props.pieces.onNext]] as const).map(
            ([label, icon, onPress]) => (
              <Pressable
                key={label}
                testID={label === 'Next in this moment' ? 'piece-next' : 'piece-prev'}
                accessibilityRole="button"
                accessibilityLabel={label}
                disabled={!onPress}
                onPress={onPress}
                style={[styles.pieceBtn, !onPress && styles.dim]}
              >
                <Icon name={icon} size={30} color={onDark ? '#ffffff' : theme.ink} />
              </Pressable>
            ),
          )}
        </View>
      )}
      {props.nav && (
        <View style={styles.nav}>
          {([['Previous moment', 'chevron-back', props.nav.onPrev], ['Next moment', 'chevron-forward', props.nav.onNext]] as const).map(
            ([label, icon, onPress]) => (
              <Pressable
                key={label}
                accessibilityRole="button"
                accessibilityLabel={label}
                disabled={!onPress}
                onPress={onPress}
                style={[styles.navBtn, onDark && styles.navBtnDark, !onPress && styles.dim]}
              >
                <Icon name={icon} size={24} color={onDark ? '#ffffff' : theme.ink} />
              </Pressable>
            ),
          )}
        </View>
      )}
    </>
  );

  if (media) {
    return (
      // Keyed apart from the card layout, which shows while the file loads:
      // reusing its views would leave the media area unmeasured on web.
      <View key="media" style={[StyleSheet.absoluteFill, styles.mediaScreen]} pointerEvents="box-none">
        <MediaArea
          onTap={props.onMediaTap}
          onLayout={(e) => setBox(e.nativeEvent.layout)}
          // In the viewer the picture fills the whole screen in both states, so it never moves when the bars hide; the
          // bars sit over its black margins (UC7, ui-conformance audit 28).
          style={props.dock !== undefined ? StyleSheet.absoluteFill : styles.mediaArea}
        >
          {capture.kind === 'photo' && <EditedPhoto uri={uri!} edit={capture.edit ?? null} caption={capture.caption} captionY={capture.caption_y} box={box} />}
          {capture.kind === 'video' && (
            <EditedVideo uri={uri!} edit={capture.edit ?? null} caption={capture.caption} captionY={capture.caption_y} autoPlay={props.autoPlay} onFinished={props.onVoiceFinished} />
          )}
        </MediaArea>
        {props.bare ? null : (
        <View style={[styles.strip, props.dock !== undefined && styles.stripOver, { paddingBottom: (props.dock ? props.dock : 0) + insets.bottom + 10 }]}>
          <View style={styles.stripInner}>
            <Text style={styles.stripMeta} numberOfLines={props.responses ? 3 : 2} testID="capture-meta" accessibilityLiveRegion="polite">{meta}{responsesLink(true)}</Text>
            {actions(true)}
          </View>
        </View>
        )}
      </View>
    );
  }

  if (capture.kind === 'text' && props.note) {
    return (
      <View key="page" style={[StyleSheet.absoluteFill, { paddingTop: insets.top + VIEWER_TOP, paddingBottom: (props.dock ?? 0) + insets.bottom }]}>
        {/* The moment's content between the viewer's bars, as a note's card was (the journeys read it as `capture-card`). */}
        <View testID="capture-card" style={styles.pageArea}>
        {capture.note_type ? <View style={styles.pageMark}><NoteMark capture={capture} /></View> : null}
        <NoteReader body={props.note.gone ? withGone(capture.body ?? '', props.note.gone) : (capture.body ?? '')} bodyFormat={capture.body_format ?? null} head={props.note.head} onEdit={props.note.onEdit} onOpenMention={props.note.onOpenMention} />
        <View style={[styles.metaRow, styles.pageMeta]}>
          <Text style={[styles.meta, styles.metaText]} testID="capture-meta" accessibilityLiveRegion="polite">{meta}{responsesLink(false)}</Text>
          {actions(false)}
        </View>
        </View>
      </View>
    );
  }

  return (
    <View key="card" style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={[styles.cardRow, { bottom: (props.dock ?? 0) + insets.bottom + 16 }]} pointerEvents="box-none">
        <View style={styles.card} testID="capture-card">
          {capture.kind === 'text' && <NoteMark capture={capture} />}
          {capture.kind === 'text' &&
            (props.onOpenRef ? <NoteText body={capture.body ?? ''} format={capture.body_format} style={styles.note} onOpen={props.onOpenRef} /> : <Text style={styles.note}>{plainNote(capture.body, capture.body_format)}</Text>)}
          {capture.kind === 'voice' && uri && (
            <VoicePlayer uri={uri} autoPlay={props.autoPlay} onFinished={props.onVoiceFinished} durationMs={Number(capture.body) || 0} edit={capture.edit ?? null} />
          )}
          {capture.kind === 'voice' && <MemoTranscript piece={{ id: capture.piece_id, t: capture.t, body: capture.body, edit: capture.edit }} />}
          {capture.kind !== 'text' && !uri && <Text style={styles.note}>{KIND_LABEL[capture.kind]}</Text>}
          <View style={styles.metaRow}>
            <Text style={[styles.meta, styles.metaText]} testID="capture-meta" accessibilityLiveRegion="polite">{meta}{responsesLink(false)}</Text>
            {actions(false)}
          </View>
        </View>
      </View>
    </View>
  );
});

/**
 * Opens the captures behind a map pin, one at a time. Callers key it by the
 * pin they open, so it always starts on that pin's first capture.
 */
export function CaptureViewer(props: {
  captures: Faced[] | null;
  onClose: () => void;
  /** Extra words per capture, e.g. which walk it came from. */
  context?: Map<string, string>;
  /** A note's page head line per moment, where the screen has one (note pages NP2), without touching the info line. */
  heads?: Map<string, string>;
  /** A heading over the captures, e.g. "What happened here". */
  title?: string;
  /**
   * Offers Edit on photos and videos (ME1); the editor opens inside the
   * viewer. Stores a change to the capture: its edits and caption, then its
   * new small copy.
   */
  onSaveEdit?: (c: Faced, patch: CapturePatch) => Promise<void>;
  /** Offers "Edit note" on notes (QL24); the editor opens inside the viewer. */
  /** `type`: the chosen note type when the owner changed it (null clears), else undefined, the stored one standing (NY7, NY16); `typeOnly`: the words are not being saved, so the body and its format stay as kept. */
  onSaveNote?: (c: Faced, body: string, type?: string | null, typeOnly?: boolean) => Promise<void>;
  /** Offers navigating to where the capture was taken (during a walk). */
  onGoHere?: (c: Faced) => void;
  /** Open in Maps (NH6): hands the capture's place to the phone's maps app, from the More menu. */
  onOpenInMaps?: (c: Faced) => void;
  /** Offers "Remind me here" (v1, R1); the viewer reads and writes the flags itself. */
  remind?: boolean;
  /** The open walk, if any: a flag set during it waits for the next walk (audit). */
  walkId?: string | null;
  /** Plays a memo or video as it opens (a reminder opened, R4). */
  autoPlay?: boolean;
  /** The owner's thread this viewer was opened from: Respond answers into it, and only here is its name said (OT3, OT11). */
  thread?: { id: string; name: string | null } | null;
  /** Opens on this moment, at this piece, rather than the first (the media gallery's tile, MG8). */
  startAt?: { id: string; piece?: string } | null;
  /** False: no "i of n" over the moments (the media gallery, MG7). */
  position?: boolean;
  /** Told each moment the viewer comes to, so its caller can read its context line (MG8). */
  onShown?: (id: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  // A gallery's tile opens the viewer at its own moment and piece (MG8); every other caller starts at the first.
  const [index, setIndex] = useState(() => Math.max(0, props.startAt ? (props.captures ?? []).findIndex((c) => c.id === props.startAt?.id) : 0));
  const [openedStack, setOpenedStack] = useState<Faced[]>([]);
  const [mentionPick, setMentionPick] = useState(false);
  // Every kept moment, for the notes that mention the one shown (RF7), read when the viewer opens.
  // The owner's threads, so the info line can say a moment is in one (OT11) and has responses (RT1).
  const { data: owned } = useThreads();
  const pool = useMomentPool(props.captures, owned.links.length);
  // The piece shown of a moment holding more than one (MS10); back to its first when the moment changes.
  const [pieceAt, setPieceAt] = useState<{ moment: string; i: number }>(() => {
    const at = props.startAt;
    const m = at ? props.captures?.find((c) => c.id === at.id) : undefined;
    return { moment: at?.id ?? '', i: m && at?.piece ? Math.max(0, m.pieces.findIndex((x) => x.id === at.piece)) : 0 };
  });
  const hidden = useHidden();
  const openForAdd = useStore(momentPill.store, (s) => s.id);
  const [editing, setEditing] = useState<Faced | null>(null);
  const editor = useRef<MediaEditorHandle>(null);
  // A note being written or edited closes its @ picker first, then itself (tend chronicle 1).
  const noteEditor = useRef<NotePageHandle>(null);
  const replyNote = useRef<NotePageHandle>(null);
  // Edits saved here show at once, whether or not the caller's list hears of it (ME21).
  const [patched, setPatched] = useState<Map<string, CapturePatch>>(() => new Map());
  const [noting, setNoting] = useState<Faced | null>(null);
  // A note's page is headed by the day and the moment's context as the viewer was given it (NP2).
  const [headNow] = useState(() => Date.now());
  // With no line given, it says what it knows and never claims no place for a placed moment (note-pages audit 2).
  const headOf = (c: Faced): NoteHead =>
    noteHead({ t: c.t, now: headNow, time: timeOf(c), context: props.heads?.get(c.id) ?? props.context?.get(c.id) ?? null, placing: false, draft: null, placed: c.lat != null, onWalk: !!c.walk_id });
  // Notes edited here show their new text at once, whether or not the
  // caller's list hears of it (QL25).
  const [edited, setEdited] = useState<Map<string, string>>(() => new Map());
  // The type chosen with it, by piece: null is "No type" (NY7).
  const [editedType, setEditedType] = useState<Map<string, string | null>>(() => new Map());
  // What was deleted (D3, D5) leaves the viewer at once; a piece split out (MS16) shows at once as its own moment,
  // right after the one it came from, while its split waits or once it is stored.
  const visible = useVisible(props.captures);
  const splits = useStore(split.store, (st) => st.pending);
  const hiddenNow = useHidden();
  const list = useMemo(() => {
    const out: Faced[] = [];
    for (const c of visible) {
      out.push(c);
      for (const x of splits)
        if (x.from === c.id && hiddenNow.has(pieceKey(x.moment.id)) && !visible.some((v) => v.id === x.moment.id)) out.push(faced(x.moment));
    }
    return out;
  }, [visible, splits, hiddenNow]);
  // A tap on a photo hides the bars (UC7); a screen reader keeps them (UC8, on a phone: the web always reports one).
  const [chrome, setChrome] = useState(true);
  const [reader, setReader] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let live = true;
    AccessibilityInfo.isScreenReaderEnabled().then((on) => live && setReader(on), () => {});
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', (on) => setReader(on));
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  const [statusOf, setStatusOf] = useState<Map<string, string>>(() => new Map());
  const [recordingReply, setRecordingReply] = useState(false);
  const [menu, setMenu] = useState(false);
  // Add to a thread (OT5): the picker is drawn inside this Modal.
  const [adding, setAdding] = useState<Faced | null>(null);
  // Respond's sheet or its note, open: Back closes it before the viewer (owner-threads audit 9).
  const [replyStage, setReplyStage] = useState<ReplyStage>(null);
  // A moment's responses sheet (response thread, decision 0131): the moment it was opened for, at which depth of the
  // viewer's stack, and its height. A response opened from it goes on the stack, and Back returns to the sheet (RT6).
  const [sheet, setSheet] = useState<{ root: string; depth: number; size: 'half' | 'full' } | null>(null);
  const [sheetNow] = useState(() => Date.now());
  // Remind me here: the flags of the captures shown, read when the viewer opens.
  const [recalls, setRecalls] = useState<Map<string, Recall>>(() => new Map());
  const [reminding, setReminding] = useState<Faced | null>(null);
  const listKey = list.map((c) => c.id).join(',');
  useEffect(() => {
    if (!props.remind || !listKey) return;
    let alive = true;
    // Only live ones: a reminder past its end shows as none, as on its pin (audit 1).
    db.listRecalls().then((rs) => alive && setRecalls(new Map(liveRecalls(rs, Date.now()).map((r) => [r.capture_id, r]))), () => {});
    return () => {
      alive = false;
    };
  }, [props.remind, listKey]);
  // Keepers leave the app on request: to Photos on a phone, as a download on
  // the web. A captioned photo is saved with its caption baked in.
  const [baker, bakers] = useBaker();
  const [saveState, setSaveState] = useState<{ id: string; text: string; busy?: boolean; openSettings?: boolean } | null>(null);
  useEffect(() => {
    if (!saveState || saveState.busy || saveState.openSettings) return;
    const t = setTimeout(() => setSaveState(null), 3000);
    return () => clearTimeout(t);
  }, [saveState]);
  const saveCurrent = async (c: Faced) => {
    if (saveState?.busy) return;
    setSaveState({ id: c.id, text: 'Saving…', busy: true });
    let source: string | null = null;
    let baked: string | undefined;
    let overlay: string | null = null;
    const edited = !isEmptyEdit(c.edit) || !!c.caption;
    const job = { edit: c.edit ?? null, caption: c.caption ?? null, captionY: c.caption_y ?? null };
    try {
      // Everything shown on the moment is in what is saved (ME16, ME17); an unedited one saves as it is.
      if (edited && c.file_path && (c.kind === 'photo' || c.kind === 'video')) {
        source = await resolveMedia(c.file_path);
        if (source && c.kind === 'photo') baked = await bakers.bake(source, job);
        if (source && c.kind === 'video') {
          try {
            const size = await probeVideoSize(source);
            if (!size) throw new Error('size');
            const plan = exportPlan(size, job.edit ?? { rotate: 0, crop: null }, { maxLong: 1920, even: true });
            overlay = await bakers.bakeOverlay(size, job, plan);
            baked = await exportVideo(source, plan, job.edit ?? { v: 1, rotate: 0, crop: null, filter: 'original', strokes: [], trim: null }, overlay, Number(c.body) || 0);
          } catch {
            throw new Error('The video could not be saved');
          }
        }
      }
      await saveKeeper(c, baked);
      setSaveState({ id: c.id, text: Platform.OS === 'web' ? 'Downloaded' : 'Saved to Photos' });
    } catch (e) {
      setSaveState({ id: c.id, text: e instanceof Error ? e.message : 'Could not save', openSettings: e instanceof KeeperError && e.openSettings });
    } finally {
      if (source) releaseMedia(source);
      if (baked) dropBaked(baked);
      if (overlay) dropBaked(overlay);
    }
  };
  // A moment a note mentions, opened over the note (RF4): shown alone; Back or Close returns to the note.
  const opened = useVisible(openedStack.length ? [openedStack[openedStack.length - 1]] : []);
  const shownList = openedStack.length ? opened : list;
  const i = openedStack.length ? 0 : Math.min(index, Math.max(0, list.length - 1));
  const moment = shownList[i];
  // The moment shown, told to the caller (MG8); the callback is kept in a ref (React Compiler).
  const onShown = useRef(props.onShown);
  useEffect(() => {
    onShown.current = props.onShown;
  });
  const momentId = moment?.id;
  useEffect(() => {
    if (momentId) onShown.current?.(momentId);
  }, [momentId]);
  // Its pieces, less any waiting in the Undo window (MS13).
  const pieces = moment ? moment.pieces.filter((p) => !hidden.has(pieceKey(p.id))) : [];
  const stacked = pieces.length > 1;
  const pi = moment && pieceAt.moment === moment.id ? Math.min(pieceAt.i, Math.max(0, pieces.length - 1)) : 0;
  const stepPiece = (d: number) => moment && setPieceAt({ moment: moment.id, i: Math.max(0, Math.min(pieces.length - 1, pi + d)) });
  const listed = moment && pieces[pi] ? facedAt(moment, pieces[pi].id) : moment;
  // Edits and notes are the piece's own (MS11): kept by the piece's id.
  const editedBody = listed ? edited.get(listed.piece_id) : undefined;
  const withText = listed && editedBody != null && listed.body !== editedBody ? { ...listed, body: editedBody, body_format: 'md' as const } : listed;
  const withBody = withText && editedType.has(withText.piece_id) ? { ...withText, note_type: editedType.get(withText.piece_id) } : withText;
  const patch = withBody ? patched.get(withBody.piece_id) : undefined;
  const current = withBody && patch ? { ...withBody, ...patch } : withBody;
  // The notes that mention the moment shown, read from their text (RF7): by date, never by count.
  const mentionedBy = current
    ? mentioning(pool.views.filter((v) => v.kind === 'text').map((v) => ({ id: v.id, t: v.t, body: v.capture.body })), current.id).filter((n) => !hidden.has(n.id))
    : [];
  // Another moment opened closes the pill (MS4).
  const shownId = current?.id ?? null;
  useEffect(() => {
    if (shownId) momentPill.opened(shownId);
  }, [shownId]);
  // The arrow keys step through a moment's pieces on the web (MS10).
  const stepRef = useRef(stepPiece);
  useEffect(() => {
    stepRef.current = stepPiece;
  });
  useEffect(() => {
    if (Platform.OS !== 'web' || !stacked || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') stepRef.current(1);
      else if (e.key === 'ArrowLeft') stepRef.current(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stacked]);
  // A horizontal swipe does the same on a phone (MS10).
  const swipeFrom = useRef<{ x: number; y: number } | null>(null);
  // Back to the note a mentioned moment was opened from (RF4).
  const back = () => setOpenedStack((s) => s.slice(0, -1));
  const close = () => {
    setIndex(0);
    setOpenedStack([]);
    setMentionPick(false);
    setEditing(null);
    setNoting(null);
    setReminding(null);
    setAdding(null);
    setChrome(true);
    setReplyStage(null);
    setMenu(false);
    setSheet(null);
    props.onClose();
  };
  // One piece of a stacked moment (MS13), named by its kind: at once, with Undo, as a moment is (UC4).
  const deletePieceNow = (c: Faced) => {
    if (!moment) return;
    deletePiece(moment, c.piece_id, c.kind);
    setPieceAt({ moment: moment.id, i: Math.max(0, pi - 1) });
  };
  // A moment is deleted at once, with Undo on the pill (UC4); nothing left to show and the host hears the viewer closed.
  const deleteNow = (c: Faced) => {
    if (openedStack.length) {
      // A mentioned moment deleted: back to the note, whose card now says it is no longer kept (RF5).
      deleteMoment(c);
      back();
      return;
    }
    const last = list.length <= 1;
    deleteMoment(c);
    if (last) close();
  };
  // What the moment's info line says about what was just done to it, in place of a pill (UC10): said, not shown off.
  const tell = (id: string, text: string) => {
    setStatusOf((m) => new Map(m).set(id, text));
    AccessibilityInfo.announceForAccessibility(text);
  };
  const busy = !!saveState?.busy;
  // The toolbar is docked while the moment shows on its own; an editor or a picker takes the screen (OT1, OT27).
  // A note, a memo or a video always shows its bars; a reply being recorded keeps them up (audit 3, 16).
  const bars = barsShown({ chrome, reader, recording: recordingReply, kind: current?.kind ?? 'text' });
  const docked = !!current && !editing && !noting && !reminding && !adding && bars;
  const mine = current ? threadsOf(current.id, owned) : [];
  const here = props.thread ? mine.find((t) => t.id === props.thread!.id) : undefined;
  const inThreadWords = here?.name ? `${IN_A_THREAD}: ${here.name}` : IN_A_THREAD;
  const inThread = mine.length ? inThreadWords[0].toUpperCase() + inThreadWords.slice(1) : null;
  // The moment's responses (RT1): every kept moment that answers it, or answers one of its responses; links touching
  // what waits in Undo are already gone (RT8).
  const responseIds = current && pool.ready ? responsesOf(current.id, owned.links).filter((id) => pool.every.has(id)) : [];
  const rootView = current ? pool.every.get(current.id) : undefined;
  const sheetUp = !!sheet && !!current && !!rootView && sheet.root === current.id && sheet.depth === openedStack.length && responseIds.length > 0 && docked;
  const openResponses = () => {
    if (!current || !responseIds.length) return;
    setMenu(false);
    setChrome(true);
    setSheet({ root: current.id, depth: openedStack.length, size: 'half' });
  };
  const fromSheet = !!sheet && openedStack.length > 0 && sheet.depth === openedStack.length - 1;
  const openThread = (id: string) => {
    close();
    // Already on that thread's screen: closing the viewer is opening it.
    if (props.thread?.id === id) return;
    threads.requestOpen(id);
    chronicleSection.set('memories');
    router.navigate('/chronicle');
  };
  const editAction =
    current && (current.kind === 'photo' || current.kind === 'video' || current.kind === 'voice') && props.onSaveEdit
      ? { label: 'Edit', testID: 'viewer-edit', onPress: () => setEditing(current) }
      : current && current.kind === 'text' && props.onSaveNote
        ? { label: 'Edit', testID: 'viewer-edit-note', onPress: () => setNoting(current) }
        : null;
  return (
    <Modal
      visible={list.length > 0}
      animationType="fade"
      onRequestClose={menu ? () => setMenu(false) : mentionPick ? () => setMentionPick(false) : replyStage === 'note' ? () => replyNote.current?.requestClose() : replyStage ? () => setReplyStage(null) : sheetUp ? () => setSheet(null) : adding ? () => setAdding(null) : editing ? () => editor.current?.requestClose() : noting ? () => noteEditor.current?.requestClose() : reminding ? () => setReminding(null) : openedStack.length ? back : close}
    >
      <View
        style={styles.viewer}
        testID="capture-viewer"
        onTouchStart={(e) => {
          // The sheet's own drags are its own (RT3); under it, a swipe across steps a stack's pieces (MS10) and a swipe up
          // opens the responses, as in iOS Photos (RT2, decision 0131).
          swipeFrom.current = sheetUp ? null : touchPoint(e.nativeEvent);
        }}
        onTouchEnd={(e) => {
          const from = swipeFrom.current;
          swipeFrom.current = null;
          if (from == null) return;
          const end = touchPoint(e.nativeEvent);
          if (!end) return;
          const dx = end.x - from.x;
          const dy = end.y - from.y;
          if (dy < -60 && Math.abs(dy) > Math.abs(dx)) openResponses();
          else if (stacked && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) stepPiece(dx < 0 ? 1 : -1);
        }}
      >
        {/* The baker draws behind everything; the cover hides it. */}
        {baker}
        <View style={[StyleSheet.absoluteFill, styles.viewer]} />
        {/* Down while the editor, the reminder, a note or the thread picker is up: closing an overlay drawn over a mounted
            capture leaves a stale copy of it in the web's DOM (Nov 4, and the reminder editor, ui-conformance audit), and a
            video never plays on beneath one. */}
        {current && !editing && !reminding && !noting && !adding && (
          <CaptureContent
            key={`${current.id}:${current.piece_id}`}
            capture={current}
            autoPlay={props.autoPlay}
            topInset={insets.top}
            dock={docked ? DOCK_H : 0}
            bare={!bars}
            onMediaTap={current.kind === 'photo' && !editing && !reader && !recordingReply ? () => setChrome((c) => !c) : undefined}
            parts={[
              props.context?.get(current.id),
              // No position over a moment's pieces (MS9): the pager's "i of n" stays for one-piece moments only.
              props.position !== false && shownList.length > 1 && !stacked ? `${i + 1} of ${shownList.length}` : null,
              inThread,
              mentionedBy.length ? MENTIONED : null,
              props.remind && recalls.has(current.id) ? 'Reminder set' : null,
              // One phrase: its spaces do not break, so "of 0:04" never sits alone on a line (voice-trim ui 3).
              current.kind === 'voice' ? trimmedLine(current)?.replace(/ /g, '\u00a0') : null,
              statusOf.get(current.id),
            ]}
            pieces={stacked ? { onPrev: pi > 0 ? () => stepPiece(-1) : undefined, onNext: pi < pieces.length - 1 ? () => stepPiece(1) : undefined } : undefined}
            onOpenRef={(v) => setOpenedStack((st) => [...st, v.capture])}
            note={
              current.kind === 'text'
                ? {
                    head: headOf(current),
                    onEdit: props.onSaveNote ? () => setNoting(current) : undefined,
                    onOpenMention: (id) => {
                      const v = pool.byId.get(id);
                      if (v && !hidden.has(v.id)) setOpenedStack((st) => [...st, v.capture]);
                    },
                    // A moment no longer kept, or waiting in Undo, reads so and opens nothing (RF5; note-pages audit 10).
                    gone: pool.ready ? (id) => !pool.byId.has(id) || hidden.has(id) : undefined,
                  }
                : undefined
            }
            responses={responseIds.length && !sheetUp ? { text: responsesWord(responseIds.length), onPress: openResponses } : null}
            nav={
              shownList.length > 1
                ? { onPrev: i > 0 ? () => setIndex(i - 1) : undefined, onNext: i < shownList.length - 1 ? () => setIndex(i + 1) : undefined }
                : undefined
            }
          />
        )}
        {current && (
          // What the viewer shows, for the e2e (MS10): the piece and its kind, never seen or said.
          <View testID="piece-shown" pointerEvents="none" style={styles.hiddenMark} {...({ dataSet: { kind: current.kind, piece: current.piece_id } } as object)} />
        )}
        {current && openForAdd === current.id && !editing && !noting && !reminding && !adding && (
          // Add to this moment, only while its pill is open (MS12): back to the walk screen, which adds to it.
          <View style={[styles.addRow, { top: insets.top + 68 }]} testID="viewer-add">
            {([['Add a photo to this moment', 'camera', 'photo'], ['Add a voice memo to this moment', 'mic', 'voice'], ['Add a note to this moment', 'create', 'text']] as const).map(([label, icon, kind]) => (
              <Pressable
                key={kind}
                accessibilityRole="button"
                accessibilityLabel={label}
                onPress={() => {
                  close();
                  momentPill.ask(kind);
                }}
                style={styles.roundBtn}
                hitSlop={6}
              >
                <Icon name={icon} size={22} color={theme.ink} />
              </Pressable>
            ))}
          </View>
        )}
        {saveState && saveState.id === current?.id && (
          <View style={[styles.saved, { top: insets.top + 64 }]} accessibilityLiveRegion="polite" pointerEvents="box-none" testID="viewer-pill">
            <Text style={styles.savedText}>{saveState.text}</Text>
            {saveState.openSettings && (
              <Pressable accessibilityRole="button" onPress={() => Linking.openSettings()} hitSlop={8}>
                <Text style={[styles.savedText, styles.savedAction]}>Open Settings</Text>
              </Pressable>
            )}
          </View>
        )}
        {/* Title and buttons share one row, so a long title never runs under them. */}
        {bars && (
        <View style={[styles.viewerTop, { top: insets.top + 8 }]} pointerEvents="box-none">
          <View style={styles.viewerTitleSlot} pointerEvents="none">
            {props.title ? (
              <View style={styles.viewerTitle}>
                <Text style={styles.viewerTitleText} accessibilityRole="header" numberOfLines={1}>{props.title}</Text>
              </View>
            ) : null}
          </View>
          {current && (
            // Save and Delete share one button, so the row fits a 320 px phone (deletion audit 5).
            <Pressable
              testID="viewer-more"
              accessibilityRole="button"
              accessibilityLabel="More"
              accessibilityState={{ expanded: menu }}
              onPress={() => setMenu((m) => !m)}
              style={styles.roundBtn}
              hitSlop={4}
            >
              <Icon name="ellipsis-horizontal" size={22} color={theme.ink} />
            </Pressable>
          )}
          <Pressable testID="viewer-close" accessibilityRole="button" accessibilityLabel={fromSheet ? 'Back to the responses' : openedStack.length ? 'Back to the note' : 'Close'} onPress={openedStack.length ? back : close} style={styles.roundBtn} hitSlop={8}>
            <Icon name={openedStack.length ? 'arrow-back' : 'close'} size={26} color={theme.ink} />
          </Pressable>
        </View>
        )}
        {sheetUp && sheet && rootView && (
          // Over everything but the docked toolbar, whose Respond answers the sheet's moment (RT7); never a Modal (RT3).
          <View style={[StyleSheet.absoluteFill, { bottom: DOCK_H + insets.bottom }]} pointerEvents="box-none">
            <ResponsesSheet
              rows={responseRows(rootView, pool.every, owned.links)}
              walks={pool.walks}
              now={sheetNow}
              size={sheet.size}
              onSize={(s) => setSheet((cur) => (cur && s ? { ...cur, size: s } : null))}
              areaHeight={height - DOCK_H - insets.bottom}
              onOpen={(m) => setOpenedStack((st) => [...st, m.capture])}
            />
          </View>
        )}
        {current && openForAdd !== current.id && !editing && !noting && !reminding && !adding && (
          // Kept mounted while the bars are hidden, so a voice reply being recorded goes on (UC7).
          <ReplyDock
            ref={replyNote}
            hidden={!bars}
            answeredId={current.id}
            threadId={props.thread?.id ?? null}
            walkId={props.walkId ?? null}
            bottomInset={insets.bottom}
            stage={replyStage}
            setStage={setReplyStage}
            say={(text, openSettings) => setSaveState({ id: current.id, text, openSettings: openSettings && Platform.OS !== 'web' })}
            kept={(id, text) => tell(id, text)}
            onRecording={setRecordingReply}
            edit={sheetUp ? null : editAction}
          />
        )}
        {adding && (
          <AddToThread
            moment={adding}
            onClose={() => setAdding(null)}
            onDone={(text, ok) => {
              const id = adding.id;
              setAdding(null);
              if (ok) tell(id, 'Added to a thread');
              else setSaveState({ id, text });
            }}
          />
        )}
        {editing && (
          // Inside this Modal, not a second one: iOS will not present a Modal over a Modal.
          <MediaEditor
            ref={editor}
            overlay
            key={editing.id}
            capture={editing}
            onClose={() => setEditing(null)}
            onSave={async (p) => {
              const c = editing;
              await props.onSaveEdit?.(c, p);
              setPatched((m) => new Map(m).set(c.piece_id, { ...m.get(c.piece_id), ...p }));
            }}
          />
        )}
        {mentionPick && current && (
          <MomentPicker
            pool={pool}
            self={current.id}
            title="Notes that mention it"
            only={mentionedBy.map((n) => n.id)}
            onPick={(v) => {
              setMentionPick(false);
              setOpenedStack((st) => [...st, v.capture]);
            }}
            onClose={() => setMentionPick(false)}
          />
        )}
        {noting && (
          // Inside this Modal too (QL24), as the note's page (NP5, NP9): kept as it is written, no Save and no question.
          <NotePage
            ref={noteEditor}
            key={noting.id}
            body={noting.body ?? ''}
            bodyFormat={noting.body_format ?? null}
            type={noting.note_type ?? null}
            onType={async (t) => {
              // A type chosen on the page is kept at once, beside the words, and put back if it can't be (NY7).
              const c = noting;
              const had = editedType.has(c.piece_id);
              const before = editedType.get(c.piece_id) ?? null;
              setEditedType((m) => new Map(m).set(c.piece_id, t));
              try {
                await props.onSaveNote?.(c, edited.get(c.piece_id) ?? c.body ?? '', t, true);
              } catch {
                setEditedType((m) => {
                  const n = new Map(m);
                  if (had) n.set(c.piece_id, before);
                  else n.delete(c.piece_id);
                  return n;
                });
                setSaveState({ id: c.id, text: 'The type could not be saved' });
              }
            }}
            head={headOf(noting)}
            self={noting.id}
            onClose={() => setNoting(null)}
            store={{
              kept: true,
              create: async () => {},
              save: async (body) => {
                const c = noting;
                const before = edited.get(c.piece_id);
                setEdited((m) => new Map(m).set(c.piece_id, body));
                try {
                  await props.onSaveNote?.(c, body);
                } catch (e) {
                  // What shows is what is kept (note-pages audit 5): the page stays open with its words.
                  setEdited((m) => {
                    const n = new Map(m);
                    if (before == null) n.delete(c.piece_id);
                    else n.set(c.piece_id, before);
                    return n;
                  });
                  throw e;
                }
              },
              remove: () => (hasMore(noting) ? deletePieceNow(noting) : deleteNow(noting)),
            }}
          />
        )}
        {reminding && (
          <RemindEditor
            key={reminding.id}
            current={recalls.get(reminding.id) ?? null}
            onClose={() => setReminding(null)}
            onSave={async (frequency, until) => {
              const id = reminding.id;
              setReminding(null);
              try {
                // Asked first, still inside the tap: a browser refuses a prompt that comes too late (audit 5);
                // a phone's location task can't show one at all.
                notifier.ask('recall').catch(() => {});
                // Read fresh: a fire while the viewer was open must not be undone (R9).
                const fresh = await storedRecall(id);
                const r = fresh ? editedRecall(fresh, frequency, until) : newRecall(id, frequency, until, props.walkId ?? null);
                await saveRecall(r);
                setRecalls((m) => new Map(m).set(r.capture_id, r));
                // The info line says Reminder set (UC12); the rest is said, not shown (UC10).
                AccessibilityInfo.announceForAccessibility('Reminder set. It will come back when you pass here');
              } catch {
                setSaveState({ id, text: 'The reminder could not be saved' });
              }
            }}
            onStop={async () => {
              const id = reminding.id;
              setReminding(null);
              try {
                await stopRecall(id);
                setRecalls((m) => {
                  const n = new Map(m);
                  n.delete(id);
                  return n;
                });
                AccessibilityInfo.announceForAccessibility('No more reminders here');
              } catch {
                setSaveState({ id, text: 'The reminder could not be stopped' });
              }
            }}
          />
        )}
        {menu && current && (
          <>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenu(false)} accessible={false} />
            <ScrollView style={[styles.menu, { top: insets.top + 64, maxHeight: Math.max(220, height - insets.top - insets.bottom - 140) }]} testID="viewer-menu">
              {current.lat != null && props.remind && (
                // In More since UC9; its state is in the info line (UC12).
                <Pressable
                  testID="viewer-remind"
                  accessibilityRole="button"
                  onPress={() => {
                    setMenu(false);
                    setReminding(current);
                  }}
                  style={({ pressed }) => [styles.menuItem, pressed && styles.dim]}
                >
                  <Icon name={recalls.has(current.id) ? 'notifications' : 'notifications-outline'} size={22} color={theme.ink} />
                  <Text style={styles.menuText}>{recalls.has(current.id) ? 'Reminder set: change or stop' : 'Remind me here'}</Text>
                </Pressable>
              )}
              {current.lat != null && props.onGoHere && (
                <Pressable
                  testID="viewer-go"
                  accessibilityRole="button"
                  onPress={() => {
                    const c = current;
                    setMenu(false);
                    setIndex(0);
                    props.onGoHere?.(c);
                  }}
                  style={({ pressed }) => [styles.menuItem, pressed && styles.dim]}
                >
                  <Icon name="navigate" size={22} color={theme.ink} />
                  <Text style={styles.menuText}>Go here</Text>
                </Pressable>
              )}
              {(current.kind === 'photo' || current.kind === 'video') && current.file_path && (
                <Pressable
                  testID="viewer-save"
                  accessibilityRole="button"
                  accessibilityState={{ busy, disabled: busy }}
                  disabled={busy}
                  onPress={() => {
                    setMenu(false);
                    saveCurrent(current);
                  }}
                  style={({ pressed }) => [styles.menuItem, (pressed || busy) && styles.dim]}
                >
                  <Icon name="download-outline" size={22} color={theme.ink} />
                  <Text style={styles.menuText}>{Platform.OS === 'web' ? 'Download' : 'Save to Photos'}</Text>
                </Pressable>
              )}
              {current.lat != null && current.lon != null && props.onOpenInMaps && (
                <Pressable
                  testID="viewer-handoff"
                  accessibilityRole="button"
                  accessibilityHint={HANDOFF_HINT}
                  onPress={() => {
                    setMenu(false);
                    props.onOpenInMaps?.(current);
                  }}
                  style={({ pressed }) => [styles.menuItem, pressed && styles.dim]}
                >
                  <Icon name="open-outline" size={22} color={theme.ink} />
                  <Text style={styles.menuText}>Open in Maps</Text>
                </Pressable>
              )}
              {mentionedBy.length > 0 && (
                // The note that mentions it, or a list of them by their first words and date (RF7).
                <Pressable
                  testID="viewer-open-note"
                  accessibilityRole="button"
                  onPress={() => {
                    setMenu(false);
                    const only = mentionedBy.length === 1 ? pool.byId.get(mentionedBy[0].id) : undefined;
                    if (only) setOpenedStack((st) => [...st, only.capture]);
                    else setMentionPick(true);
                  }}
                  style={({ pressed }) => [styles.menuItem, pressed && styles.dim]}
                >
                  <Icon name="document-text-outline" size={22} color={theme.ink} />
                  <Text style={styles.menuText}>{mentionedBy.length === 1 ? 'Open the note' : 'Open the notes'}</Text>
                </Pressable>
              )}
              {responseIds.length > 0 && (
                <Pressable
                  testID="viewer-responses"
                  accessibilityRole="button"
                  onPress={openResponses}
                  style={({ pressed }) => [styles.menuItem, pressed && styles.dim]}
                >
                  <Icon name="chatbubbles-outline" size={22} color={theme.ink} />
                  <Text style={styles.menuText}>Responses</Text>
                </Pressable>
              )}
              {mine.length > 0 && (
                <Pressable
                  testID="viewer-open-thread"
                  accessibilityRole="button"
                  onPress={() => {
                    setMenu(false);
                    openThread((here ?? mine[0]).id);
                  }}
                  style={({ pressed }) => [styles.menuItem, pressed && styles.dim]}
                >
                  <Icon name="link" size={22} color={theme.ink} />
                  <Text style={styles.menuText}>Open its thread</Text>
                </Pressable>
              )}
              <Pressable
                testID="viewer-add-thread"
                accessibilityRole="button"
                onPress={() => {
                  setMenu(false);
                  setAdding(current);
                }}
                style={({ pressed }) => [styles.menuItem, pressed && styles.dim]}
              >
                <Icon name="link" size={22} color={theme.ink} />
                <Text style={styles.menuText}>Add to a thread</Text>
              </Pressable>
              {stacked && pi > 0 && moment && (
                // Split out (MS16): never the first piece, the moment's anchor.
                <Pressable
                  testID="menu-split"
                  accessibilityRole="button"
                  onPress={() => {
                    setMenu(false);
                    const m = moment;
                    const { piece_id: _f, ...rest } = m;
                    void split.split({ id: rest.id, walk_id: rest.walk_id, t: rest.t, lat: rest.lat, lon: rest.lon, segment_id: rest.segment_id, pieces: rest.pieces }, current.piece_id).catch(() => {});
                    setPieceAt({ moment: m.id, i: Math.max(0, pi - 1) });
                  }}
                  style={({ pressed }) => [styles.menuItem, pressed && styles.dim]}
                >
                  <Icon name="git-branch-outline" size={22} color={theme.ink} />
                  <Text style={styles.menuText}>Split this {KIND_LABEL[current.kind].toLowerCase()} out</Text>
                </Pressable>
              )}
              {stacked && (
                // One piece, named by its kind (MS13); the moment and the rest stay.
                <Pressable
                  testID="menu-delete-piece"
                  accessibilityRole="button"
                  onPress={() => {
                    setMenu(false);
                    deletePieceNow(current);
                  }}
                  style={({ pressed }) => [styles.menuItem, pressed && styles.dim]}
                >
                  <Icon name="remove-circle-outline" size={22} color={theme.danger} />
                  <Text style={[styles.menuText, { color: theme.danger }]}>Delete this {KIND_LABEL[current.kind].toLowerCase()}</Text>
                </Pressable>
              )}
              <Pressable
                testID={stacked ? 'menu-delete' : 'viewer-delete'}
                accessibilityRole="button"
                onPress={() => {
                  setMenu(false);
                  deleteNow(moment ?? current);
                }}
                style={({ pressed }) => [styles.menuItem, pressed && styles.dim]}
              >
                <Icon name="trash-outline" size={22} color={theme.danger} />
                <Text style={[styles.menuText, { color: theme.danger }]}>{stacked ? 'Delete this moment' : `Delete this ${KIND_LABEL[current.kind].toLowerCase()}`}</Text>
              </Pressable>
            </ScrollView>
          </>
        )}
        <UndoToast style={{ bottom: (docked ? DOCK_H : 0) + insets.bottom + 72 }} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  hiddenMark: { position: 'absolute', width: 0, height: 0, opacity: 0 },
  addRow: { position: 'absolute', right: 16, flexDirection: 'row', gap: 8 },
  // A full-width row centers the card on any screen width.
  cardRow: { position: 'absolute', left: 0, right: 0, paddingHorizontal: 16, alignItems: 'center' },
  fill: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  soundBtn: {
    position: 'absolute', alignSelf: 'center', top: '45%', flexDirection: 'row', alignItems: 'center', gap: 8,
    minHeight: 48, paddingHorizontal: 18, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.7)',
  },
  soundText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  mediaScreen: { backgroundColor: '#000000' },
  stripOver: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  mediaArea: { flex: 1 },
  // The thin strip under a photo or video: its details, then its actions.
  strip: { backgroundColor: '#14181f', paddingTop: 10, paddingHorizontal: 16, borderTopWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.15)' },
  stripInner: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%', maxWidth: 640, alignSelf: 'center', minHeight: 48 },
  stripMeta: { flex: 1, color: 'rgba(255,255,255,0.85)', fontSize: 14 },
  responsesLink: { color: theme.ink, textDecorationLine: 'underline', fontWeight: '600' },
  responsesLinkDark: { color: '#ffffff' },
  navBtnDark: { borderColor: 'rgba(255,255,255,0.5)' },
  metaText: { flex: 1 },
  card: {
    padding: 16, gap: 10, width: '100%', maxWidth: 560,
    backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: theme.radius,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  pageArea: { flex: 1 },
  // A note's type, one line above the page it marks (NY9).
  pageMark: { paddingHorizontal: 16, paddingTop: 10 },
  pageMeta: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: theme.surface, borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.line },
  nav: { flexDirection: 'row', gap: 8 },
  action: {
    flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 48, paddingLeft: 18, paddingRight: 12,
    borderRadius: 24, backgroundColor: theme.accent,
  },
  actionText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  pieceBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  navBtn: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: theme.edge, alignItems: 'center', justifyContent: 'center' },
  note: { fontSize: 20, lineHeight: 27, color: theme.ink },
  meta: { fontSize: 14, color: theme.muted },
  voice: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  playBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#6b21a8', alignItems: 'center', justifyContent: 'center' },
  track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: theme.line, overflow: 'hidden' },
  trackFill: { height: 6, backgroundColor: '#6b21a8' },
  voiceTime: { fontSize: 14, color: theme.ink, fontVariant: ['tabular-nums'] },
  viewer: { flex: 1, backgroundColor: '#14181f' },
  viewerTop: { position: 'absolute', left: 16, right: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  viewerTitleSlot: { flex: 1, alignItems: 'flex-start' },
  savedAction: { textDecorationLine: 'underline', fontWeight: '700' },
  aa: { fontSize: 18, fontWeight: '800', color: theme.ink },
  saved: { position: 'absolute', right: 12, flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: theme.ink, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, maxWidth: 280 },
  savedText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  viewerTitle: { paddingVertical: 8, paddingHorizontal: 4, maxWidth: '100%' },
  viewerTitleText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  menu: { position: 'absolute', right: 12, maxWidth: 320, flexGrow: 0, backgroundColor: theme.surface, borderRadius: theme.radius, paddingVertical: 6, minWidth: 220, elevation: 8, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingHorizontal: 16 },
  menuText: { fontSize: 16, fontWeight: '600', color: theme.ink },
  roundBtn: { flexShrink: 0, width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: 0.35 },
});
