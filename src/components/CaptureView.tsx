import { type Faced, faced, facedAt, pieceKey } from '../lib/moment';
import { split } from '../lib/split';
import { momentPill } from '../lib/momentPill';
import { useStore } from '../lib/useStore';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { forwardRef, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { HANDOFF_HINT } from '../lib/nav/openInMaps';
import { Linking, Platform, Pressable, StyleSheet, Text, View, type LayoutRectangle } from 'react-native';
import { Modal } from './Modal';
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
import { NoteEditor } from './NoteEditor';
import { ConfirmCard } from './ConfirmCard';
import { UndoToast } from './UndoToast';
import { deleteMoment, deletePiece, planMoment, planPiece } from '../lib/deletion';
import { momentDeleteText, pieceDeleteText, type ConfirmText } from '../lib/deletion/core';
import { useHidden, useVisible } from '../lib/deletion/useDeletions';
import { router } from 'expo-router';
import { chronicleSection } from '../lib/resurface/sectionStore';
import { threads } from '../lib/threads';
import { AddToThread } from './threads/AddToThread';
import { RespondBar } from './threads/RespondBar';
import { ThreadChip } from './threads/ThreadChip';
import { Icon, KIND_LABEL } from './icons';
import { theme } from './ui';

export { useMediaUri };

const timeOf = (c: Faced) => new Date(c.t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/** A refused memo in a replay that moves on by itself waits this long, as a photo does. */
const REFUSED_MOVE_ON_MS = 4000;

/** A voice memo with a play/pause control; `autoPlay` starts it, `onFinished` fires when it ends. */
function VoicePlayer(props: { uri: string; autoPlay?: boolean; onFinished?: () => void; durationMs: number }) {
  const player = useAudioPlayer(props.uri);
  const status = useAudioPlayerStatus(player);
  const { autoPlay, onFinished } = props;
  const playing = useRef(false);
  const finished = useRef(onFinished);
  useEffect(() => {
    playing.current = status.playing;
    finished.current = onFinished;
  }, [status.playing, onFinished]);
  // A browser that refuses to start it without a tap (iOS) leaves the play
  // button showing; a replay that moves on by itself then moves on after a
  // while, instead of waiting for an end that never comes.
  const refused = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!autoPlay || !status.isLoaded) return;
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
    if (status.didJustFinish) onFinished?.();
  }, [status.didJustFinish, onFinished]);
  const total = status.duration || props.durationMs / 1000;
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  return (
    <View style={styles.voice}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={status.playing ? 'Pause voice memo' : 'Play voice memo'}
        onPress={() => {
          if (refused.current) clearTimeout(refused.current);
          if (status.playing) player.pause();
          else {
            if (status.didJustFinish || (total && status.currentTime >= total - 0.1)) player.seekTo(0);
            player.play();
          }
        }}
        style={styles.playBtn}
        hitSlop={8}
      >
        <Icon name={status.playing ? 'pause' : 'play'} size={26} color="#ffffff" />
      </Pressable>
      <View style={styles.track}>
        <View style={[styles.trackFill, { width: `${total ? Math.min(100, (status.currentTime / total) * 100) : 0}%` }]} />
      </View>
      <Text style={styles.voiceTime}>
        {fmt(status.currentTime)} / {fmt(total)}
      </Text>
    </View>
  );
}


/** A video's own controls sit along the bottom of its picture; what stands above the strip leaves them this much. */
const VIDEO_CONTROLS = 56;

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
  /** Unused by the full-screen layout; kept so callers can pass the safe area. */
  topInset?: number;
  nav?: { onPrev?: () => void; onNext?: () => void };
  /** Stepping through a moment's pieces (MS10): drawn unlike `nav`, spoken "in this moment". */
  pieces?: { onPrev?: () => void; onNext?: () => void };
  /** A primary action (the replay's Continue), within thumb reach. The ref is the action's. */
  action?: { label: string; hint?: string; onPress: () => void; testID?: string };
  /** How far the strip or card reaches up from the screen's foot, with room for a video's own controls above it. */
  onFoot?: (height: number) => void;
}>(function CaptureContent(props, actionRef) {
  const { capture } = props;
  const insets = useSafeAreaInsets();
  const uri = useMediaUri(capture);
  const media = (capture.kind === 'photo' || capture.kind === 'video') && !!uri;
  const [box, setBox] = useState<LayoutRectangle | null>(null);
  const meta = `${KIND_LABEL[capture.kind]} · ${timeOf(capture)}${props.footer ? ` · ${props.footer}` : ''}`;
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
        <View
          style={styles.mediaArea}
          onLayout={(e) => setBox(e.nativeEvent.layout)}
          // A photo lets taps through (the replay moves on with one); a video
          // keeps its controls. Set on the photo, not this view: on web a view
          // with pointerEvents "none" never reports its layout.
          pointerEvents="box-none"
        >
          {capture.kind === 'photo' && <EditedPhoto uri={uri!} edit={capture.edit ?? null} caption={capture.caption} captionY={capture.caption_y} box={box} />}
          {capture.kind === 'video' && (
            <EditedVideo uri={uri!} edit={capture.edit ?? null} caption={capture.caption} captionY={capture.caption_y} autoPlay={props.autoPlay} onFinished={props.onVoiceFinished} />
          )}
        </View>
        <View
          style={[styles.strip, { paddingBottom: insets.bottom + 10 }]}
          onLayout={props.onFoot && ((e) => props.onFoot?.(e.nativeEvent.layout.height + (capture.kind === 'video' ? VIDEO_CONTROLS : 0)))}
        >
          <View style={styles.stripInner}>
            <Text style={styles.stripMeta} numberOfLines={2}>{meta}</Text>
            {actions(true)}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View key="card" style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={[styles.cardRow, { bottom: insets.bottom + 16 }]} pointerEvents="box-none">
        <View style={styles.card} onLayout={props.onFoot && ((e) => props.onFoot?.(e.nativeEvent.layout.height + insets.bottom + 16))}>
          {capture.kind === 'text' && <Text style={styles.note}>{capture.body}</Text>}
          {capture.kind === 'voice' && uri && (
            <VoicePlayer uri={uri} autoPlay={props.autoPlay} onFinished={props.onVoiceFinished} durationMs={Number(capture.body) || 0} />
          )}
          {capture.kind !== 'text' && !uri && <Text style={styles.note}>{KIND_LABEL[capture.kind]}</Text>}
          <View style={styles.metaRow}>
            <Text style={[styles.meta, styles.metaText]}>{meta}</Text>
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
  /** A heading over the captures, e.g. "What happened here". */
  title?: string;
  /**
   * Offers Edit on photos and videos (ME1); the editor opens inside the
   * viewer. Stores a change to the capture: its edits and caption, then its
   * new small copy.
   */
  onSaveEdit?: (c: Faced, patch: CapturePatch) => Promise<void>;
  /** Offers "Edit note" on notes (QL24); the editor opens inside the viewer. */
  onSaveNote?: (c: Faced, body: string) => Promise<void>;
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
}) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  // The piece shown of a moment holding more than one (MS10); back to its first when the moment changes.
  const [pieceAt, setPieceAt] = useState<{ moment: string; i: number }>({ moment: '', i: 0 });
  const hidden = useHidden();
  const openForAdd = useStore(momentPill.store, (s) => s.id);
  const [editing, setEditing] = useState<Faced | null>(null);
  const editor = useRef<MediaEditorHandle>(null);
  // Edits saved here show at once, whether or not the caller's list hears of it (ME21).
  const [patched, setPatched] = useState<Map<string, CapturePatch>>(() => new Map());
  const [noting, setNoting] = useState<Faced | null>(null);
  // Notes edited here show their new text at once, whether or not the
  // caller's list hears of it (QL25).
  const [edited, setEdited] = useState<Map<string, string>>(() => new Map());
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
  const [deleting, setDeleting] = useState<{ capture: Faced; text: ConfirmText; piece?: string } | null>(null);
  const [menu, setMenu] = useState(false);
  // Add to a thread (OT5): the picker is drawn inside this Modal.
  const [adding, setAdding] = useState<Faced | null>(null);
  // The reply note being written, for the moment it answers: Back and Escape close it before the viewer (owner-threads audit 9).
  const [composeFor, setComposeFor] = useState<string | null>(null);
  // How far the shown moment reaches up from the foot: Respond stands just above it. Kept across a swipe until the
  // next moment measures, so the bar never blinks out (it is one bar for every moment, audit 10).
  const [foot, setFoot] = useState<number | null>(null);
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
  const i = Math.min(index, Math.max(0, list.length - 1));
  const moment = list[i];
  // Its pieces, less any waiting in the Undo window (MS13).
  const pieces = moment ? moment.pieces.filter((p) => !hidden.has(pieceKey(p.id))) : [];
  const stacked = pieces.length > 1;
  const pi = moment && pieceAt.moment === moment.id ? Math.min(pieceAt.i, Math.max(0, pieces.length - 1)) : 0;
  const stepPiece = (d: number) => moment && setPieceAt({ moment: moment.id, i: Math.max(0, Math.min(pieces.length - 1, pi + d)) });
  const listed = moment && pieces[pi] ? facedAt(moment, pieces[pi].id) : moment;
  // Edits and notes are the piece's own (MS11): kept by the piece's id.
  const editedBody = listed ? edited.get(listed.piece_id) : undefined;
  const withBody = listed && editedBody != null && listed.body !== editedBody ? { ...listed, body: editedBody } : listed;
  const patch = withBody ? patched.get(withBody.piece_id) : undefined;
  const current = withBody && patch ? { ...withBody, ...patch } : withBody;
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
  const swipeFrom = useRef<number | null>(null);
  const close = () => {
    setIndex(0);
    setEditing(null);
    setNoting(null);
    setReminding(null);
    setDeleting(null);
    setAdding(null);
    setComposeFor(null);
    setMenu(false);
    props.onClose();
  };
  const askDelete = (c: Faced) => {
    planMoment(c).then(
      (text) => setDeleting({ capture: c, text }),
      () => setDeleting({ capture: c, text: momentDeleteText(c.kind, 0) }),
    );
  };
  // One piece of a stacked moment (MS13), named by its kind.
  const askDeletePiece = (c: Faced) => {
    const pieceId = c.piece_id;
    const m = moment ?? c;
    planPiece(m, pieceId).then(
      (text) => setDeleting({ capture: c, text, piece: pieceId }),
      () => setDeleting({ capture: c, text: pieceDeleteText(c.kind, 0), piece: pieceId }),
    );
  };
  const confirmDelete = () => {
    if (!deleting) return;
    if (deleting.piece && moment) {
      deletePiece(moment, deleting.piece, deleting.capture.kind);
      setPieceAt({ moment: moment.id, i: Math.max(0, pi - 1) });
      setDeleting(null);
      return;
    }
    const last = list.length <= 1;
    deleteMoment(deleting.capture);
    setDeleting(null);
    // Nothing left to show: the host hears the viewer closed.
    if (last) close();
  };
  const busy = !!saveState?.busy;
  return (
    <Modal
      visible={list.length > 0}
      animationType="fade"
      onRequestClose={menu ? () => setMenu(false) : composeFor ? () => setComposeFor(null) : adding ? () => setAdding(null) : deleting ? () => setDeleting(null) : editing ? () => editor.current?.requestClose() : noting ? () => setNoting(null) : reminding ? () => setReminding(null) : close}
    >
      <View
        style={styles.viewer}
        testID="capture-viewer"
        onTouchStart={(e) => {
          swipeFrom.current = stacked ? e.nativeEvent.pageX : null;
        }}
        onTouchEnd={(e) => {
          const from = swipeFrom.current;
          swipeFrom.current = null;
          if (from == null) return;
          const dx = e.nativeEvent.pageX - from;
          if (Math.abs(dx) > 60) stepPiece(dx < 0 ? 1 : -1);
        }}
      >
        {/* The baker draws behind everything; the cover hides it. */}
        {baker}
        <View style={[StyleSheet.absoluteFill, styles.viewer]} />
        {/* Down while the editor is up: a video never plays on beneath it, and the edited one mounts fresh. */}
        {current && !editing && (
          <CaptureContent
            key={`${current.id}:${current.piece_id}`}
            capture={current}
            autoPlay={props.autoPlay}
            topInset={insets.top}
            // No position over a moment's pieces (MS9): the pager's "i of n" stays for one-piece moments only.
            footer={[props.context?.get(current.id), list.length > 1 && !stacked ? `${i + 1} of ${list.length}` : null].filter(Boolean).join(' · ') || undefined}
            pieces={stacked ? { onPrev: pi > 0 ? () => stepPiece(-1) : undefined, onNext: pi < pieces.length - 1 ? () => stepPiece(1) : undefined } : undefined}
            nav={
              list.length > 1
                ? { onPrev: i > 0 ? () => setIndex(i - 1) : undefined, onNext: i < list.length - 1 ? () => setIndex(i + 1) : undefined }
                : undefined
            }
            onFoot={setFoot}
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
          <View style={[styles.saved, { top: insets.top + 64 }]} accessibilityLiveRegion="polite" pointerEvents="box-none">
            <Text style={styles.savedText}>{saveState.text}</Text>
            {saveState.openSettings && (
              <Pressable accessibilityRole="button" onPress={() => Linking.openSettings()} hitSlop={8}>
                <Text style={[styles.savedText, styles.savedAction]}>Open Settings</Text>
              </Pressable>
            )}
          </View>
        )}
        {/* Title and buttons share one row, so a long title never runs under them. */}
        <View style={[styles.viewerTop, { top: insets.top + 8 }]} pointerEvents="box-none">
          <View style={styles.viewerTitleSlot} pointerEvents="none">
            {props.title ? (
              <View style={styles.viewerTitle}>
                <Text style={styles.viewerTitleText} accessibilityRole="header" numberOfLines={1}>{props.title}</Text>
              </View>
            ) : null}
          </View>
          {(current?.kind === 'photo' || current?.kind === 'video') && props.onSaveEdit && (
            <Pressable
              testID="viewer-edit"
              accessibilityRole="button"
              accessibilityLabel="Edit"
              onPress={() => setEditing(current)}
              style={styles.roundBtn}
              hitSlop={8}
            >
              <Icon name="options" size={22} color={theme.ink} />
            </Pressable>
          )}
          {current && current.lat != null && props.remind && (
            <Pressable
              testID="viewer-remind"
              accessibilityRole="button"
              accessibilityLabel={recalls.has(current.id) ? 'Reminder set. Change or stop it' : 'Remind me here'}
              onPress={() => setReminding(current)}
              style={styles.roundBtn}
              hitSlop={8}
            >
              <Icon name={recalls.has(current.id) ? 'notifications' : 'notifications-outline'} size={22} color={theme.ink} />
            </Pressable>
          )}
          {current && current.lat != null && props.onGoHere && (
            <Pressable
              testID="viewer-go"
              accessibilityRole="button"
              accessibilityLabel="Go here"
              onPress={() => {
                const c = current;
                setIndex(0);
                props.onGoHere?.(c);
              }}
              style={styles.roundBtn}
              hitSlop={8}
            >
              <Icon name="navigate" size={22} color={theme.ink} />
            </Pressable>
          )}
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
          <Pressable testID="viewer-close" accessibilityRole="button" accessibilityLabel="Close" onPress={close} style={styles.roundBtn} hitSlop={8}>
            <Icon name="close" size={26} color={theme.ink} />
          </Pressable>
        </View>
        {current && openForAdd !== current.id && !editing && !noting && !reminding && !adding && (
          <>
            <ThreadChip
              key={`chip:${current.id}`}
              momentId={current.id}
              top={insets.top + 68}
              from={props.thread}
              onOpen={(id) => {
                close();
                // Already on that thread's screen: closing the viewer is opening it.
                if (props.thread?.id === id) return;
                threads.requestOpen(id);
                chronicleSection.set('memories');
                router.navigate('/');
              }}
            />
            <RespondBar answeredId={current.id} threadId={props.thread?.id ?? null} walkId={props.walkId ?? null} bottom={foot} composeFor={composeFor} setComposeFor={setComposeFor} />
          </>
        )}
        {adding && (
          <AddToThread
            moment={adding}
            onClose={() => setAdding(null)}
            onDone={(text) => {
              const id = adding.id;
              setAdding(null);
              setSaveState({ id, text });
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
        {noting && (
          // Inside this Modal too (QL24).
          <NoteEditor
            key={noting.id}
            body={noting.body ?? ''}
            onClose={() => setNoting(null)}
            onSave={async (body) => {
              const c = noting;
              setNoting(null);
              const before = edited.get(c.piece_id);
              setEdited((m) => new Map(m).set(c.piece_id, body));
              try {
                await props.onSaveNote?.(c, body);
              } catch {
                setEdited((m) => {
                  const n = new Map(m);
                  if (before == null) n.delete(c.piece_id);
                  else n.set(c.piece_id, before);
                  return n;
                });
                setSaveState({ id: c.id, text: 'The note could not be saved' });
              }
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
                setSaveState({ id: r.capture_id, text: 'It will come back when you pass here' });
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
                setSaveState({ id, text: 'No more reminders here' });
              } catch {
                setSaveState({ id, text: 'The reminder could not be stopped' });
              }
            }}
          />
        )}
        {menu && current && (
          <>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenu(false)} accessible={false} />
            <View style={[styles.menu, { top: insets.top + 64 }]} testID="viewer-menu">
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
              {current.kind === 'text' && props.onSaveNote && (
                <Pressable
                  testID="viewer-edit-note"
                  accessibilityRole="button"
                  onPress={() => {
                    setMenu(false);
                    setNoting(current);
                  }}
                  style={({ pressed }) => [styles.menuItem, pressed && styles.dim]}
                >
                  <Icon name="create-outline" size={22} color={theme.ink} />
                  <Text style={styles.menuText}>Edit note</Text>
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
                    askDeletePiece(current);
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
                  askDelete(moment ?? current);
                }}
                style={({ pressed }) => [styles.menuItem, pressed && styles.dim]}
              >
                <Icon name="trash-outline" size={22} color={theme.danger} />
                <Text style={[styles.menuText, { color: theme.danger }]}>{stacked ? 'Delete this moment' : `Delete this ${KIND_LABEL[current.kind].toLowerCase()}`}</Text>
              </Pressable>
            </View>
          </>
        )}
        {deleting && <ConfirmCard testID="confirm" text={deleting.text} onCancel={() => setDeleting(null)} onConfirm={confirmDelete} />}
        <UndoToast style={{ top: insets.top + 64 }} />
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
  mediaArea: { flex: 1 },
  // The thin strip under a photo or video: its details, then its actions.
  strip: { backgroundColor: '#14181f', paddingTop: 10, paddingHorizontal: 16, borderTopWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.15)' },
  stripInner: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%', maxWidth: 640, alignSelf: 'center', minHeight: 48 },
  stripMeta: { flex: 1, color: 'rgba(255,255,255,0.85)', fontSize: 14 },
  navBtnDark: { borderColor: 'rgba(255,255,255,0.5)' },
  metaText: { flex: 1 },
  card: {
    padding: 16, gap: 10, width: '100%', maxWidth: 560,
    backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: theme.radius,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
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
  viewerTitle: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, maxWidth: '100%' },
  viewerTitleText: { color: theme.ink, fontSize: 15, fontWeight: '700' },
  menu: { position: 'absolute', right: 12, backgroundColor: theme.surface, borderRadius: theme.radius, paddingVertical: 6, minWidth: 220, elevation: 8, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingHorizontal: 16 },
  menuText: { fontSize: 16, fontWeight: '600', color: theme.ink },
  roundBtn: { flexShrink: 0, width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: 0.35 },
});
