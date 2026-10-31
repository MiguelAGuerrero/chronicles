import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView, type VideoPlayer as VideoPlayerType } from 'expo-video';
import { forwardRef, useEffect, useRef, useState, type ComponentRef } from 'react';
import { Image, Linking, Modal, Platform, Pressable, StyleSheet, Text, View, type LayoutRectangle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dropBaked, KeeperError, saveKeeper } from '../lib/export';
import { releaseMedia, resolveMedia } from '../lib/media';
import type { Capture } from '../lib/types';
import { useMediaUri } from '../lib/useMediaUri';
import { useBaker } from './Baker';
import { CaptionBar, CaptionEditor, usePhotoRect } from './Caption';
import { Icon, KIND_LABEL } from './icons';
import { theme } from './ui';

export { useMediaUri };

const timeOf = (c: Capture) => new Date(c.t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/** How long a memo or video may take to start playing before it is treated as refused. */
const AUTOPLAY_CHECK_MS = 800;
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


/** Mutes or unmutes a player and plays it (the player is a mutable native object, not React state). */
function playWithSound(player: VideoPlayerType, sound: boolean) {
  player.muted = !sound;
  player.play();
}

/**
 * A video, fitted to the screen with the platform's own controls; `autoPlay`
 * starts it with sound. Browsers (iOS always) refuse sound unless a tap
 * started it, and the replay reaches a video on its own clock: then it
 * plays muted, as social feeds do, with a button to turn the sound on.
 */
function VideoPlayer(props: { uri: string; autoPlay?: boolean; onFinished?: () => void }) {
  const player = useVideoPlayer(props.uri, (p) => {
    p.loop = false;
  });
  const [mutedForAutoplay, setMutedForAutoplay] = useState(false);
  // A player told to play before it has loaded ignores it on web, so it
  // starts once it is ready (and at once if it already is).
  const started = useRef(false);
  const playing = useRef(false);
  const check = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = () => {
    if (!props.autoPlay || started.current) return;
    started.current = true;
    player.play();
    if (Platform.OS !== 'web') return;
    check.current = setTimeout(() => {
      if (playing.current) return;
      playWithSound(player, false);
      setMutedForAutoplay(true);
    }, AUTOPLAY_CHECK_MS);
  };
  useEventListener(player, 'playingChange', ({ isPlaying }) => {
    playing.current = isPlaying;
  });
  useEventListener(player, 'statusChange', ({ status }) => {
    if (status === 'readyToPlay') start();
  });
  useEffect(() => {
    if (player.status === 'readyToPlay') start();
    return () => {
      if (check.current) clearTimeout(check.current);
    };
    // Checked once, on mount; later readiness comes through statusChange.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player]);
  useEventListener(player, 'playToEnd', () => props.onFinished?.());
  return (
    <>
      {/* Sized with width and height, not left/right/top/bottom: on web this
          style lands on the <video> tag itself, which keeps its own size otherwise. */}
      <VideoView player={player} style={styles.fill} contentFit="contain" nativeControls playsInline accessibilityLabel="Video" />
      {mutedForAutoplay && (
        <Pressable
          testID="video-sound"
          accessibilityRole="button"
          accessibilityLabel="Turn the sound on"
          onPress={() => {
            // A tap may unmute: browsers allow sound from here on.
            playWithSound(player, true);
            setMutedForAutoplay(false);
          }}
          style={styles.soundBtn}
        >
          <Icon name="volume-mute" size={20} color="#ffffff" />
          <Text style={styles.soundText}>Tap for sound</Text>
        </Pressable>
      )}
    </>
  );
}

/**
 * One capture, full screen. A photo or video fills everything above a thin
 * strip holding its details and the actions (previous and next, or the
 * replay's Continue), so the player's own controls never meet them. A note
 * or voice memo sits in a card over whatever is behind it.
 */
export const CaptureContent = forwardRef<ComponentRef<typeof Pressable>, {
  capture: Capture;
  autoPlay?: boolean;
  onVoiceFinished?: () => void;
  footer?: string;
  /** Unused by the full-screen layout; kept so callers can pass the safe area. */
  topInset?: number;
  nav?: { onPrev?: () => void; onNext?: () => void };
  /** A primary action (the replay's Continue), within thumb reach. The ref is the action's. */
  action?: { label: string; hint?: string; onPress: () => void; testID?: string };
}>(function CaptureContent(props, actionRef) {
  const { capture } = props;
  const insets = useSafeAreaInsets();
  const uri = useMediaUri(capture);
  const media = (capture.kind === 'photo' || capture.kind === 'video') && !!uri;
  const [box, setBox] = useState<LayoutRectangle | null>(null);
  const rect = usePhotoRect(capture.kind === 'photo' ? uri : null, box);
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
      {props.nav && (
        <View style={styles.nav}>
          {([['Previous capture', 'chevron-back', props.nav.onPrev], ['Next capture', 'chevron-forward', props.nav.onNext]] as const).map(
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
          {capture.kind === 'photo' && (
            <Image source={{ uri: uri! }} style={StyleSheet.absoluteFill} resizeMode="contain" accessibilityLabel="Photo" pointerEvents="none" />
          )}
          {capture.kind === 'photo' && capture.caption && rect && <CaptionBar text={capture.caption} y={capture.caption_y ?? 0.6} rect={rect} />}
          {capture.kind === 'video' && <VideoPlayer uri={uri!} autoPlay={props.autoPlay} onFinished={props.onVoiceFinished} />}
        </View>
        <View style={[styles.strip, { paddingBottom: insets.bottom + 10 }]}>
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
        <View style={styles.card}>
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
  captures: Capture[] | null;
  onClose: () => void;
  /** Extra words per capture, e.g. which walk it came from. */
  context?: Map<string, string>;
  /** A heading over the captures, e.g. "What happened here". */
  title?: string;
  /** Offers a caption edit on photos; the editor opens inside the viewer. */
  onSaveCaption?: (c: Capture, caption: string | null, y: number) => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [captioning, setCaptioning] = useState<Capture | null>(null);
  const list = props.captures ?? [];
  // Keepers leave the app on request: to Photos on a phone, as a download on
  // the web. A captioned photo is saved with its caption baked in.
  const [baker, bake] = useBaker();
  const [saveState, setSaveState] = useState<{ id: string; text: string; busy?: boolean; openSettings?: boolean } | null>(null);
  useEffect(() => {
    if (!saveState || saveState.busy || saveState.openSettings) return;
    const t = setTimeout(() => setSaveState(null), 3000);
    return () => clearTimeout(t);
  }, [saveState]);
  const saveCurrent = async (c: Capture) => {
    if (saveState?.busy) return;
    setSaveState({ id: c.id, text: 'Saving…', busy: true });
    let source: string | null = null;
    let baked: string | undefined;
    try {
      if (c.kind === 'photo' && c.caption && c.file_path) {
        source = await resolveMedia(c.file_path);
        if (source) baked = await bake(source, c.caption, c.caption_y ?? 0.6);
      }
      await saveKeeper(c, baked);
      setSaveState({ id: c.id, text: Platform.OS === 'web' ? 'Downloaded' : 'Saved to Photos' });
    } catch (e) {
      setSaveState({ id: c.id, text: e instanceof Error ? e.message : 'Could not save', openSettings: e instanceof KeeperError && e.openSettings });
    } finally {
      if (source) releaseMedia(source);
      if (baked) dropBaked(baked);
    }
  };
  const i = Math.min(index, Math.max(0, list.length - 1));
  const current = list[i];
  const close = () => {
    setIndex(0);
    setCaptioning(null);
    props.onClose();
  };
  const busy = !!saveState?.busy;
  return (
    <Modal visible={list.length > 0} animationType="fade" onRequestClose={captioning ? () => setCaptioning(null) : close}>
      <View style={styles.viewer}>
        {/* The baker draws behind everything; the cover hides it. */}
        {baker}
        <View style={[StyleSheet.absoluteFill, styles.viewer]} />
        {current && (
          <CaptureContent
            key={current.id}
            capture={current}
            topInset={insets.top}
            footer={[props.context?.get(current.id), list.length > 1 ? `${i + 1} of ${list.length}` : null].filter(Boolean).join(' · ') || undefined}
            nav={
              list.length > 1
                ? { onPrev: i > 0 ? () => setIndex(i - 1) : undefined, onNext: i < list.length - 1 ? () => setIndex(i + 1) : undefined }
                : undefined
            }
          />
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
          {current && (current.kind === 'photo' || current.kind === 'video') && current.file_path && (
            <Pressable
              testID="viewer-save"
              accessibilityRole="button"
              accessibilityLabel={Platform.OS === 'web' ? 'Download' : 'Save to Photos'}
              accessibilityState={{ busy, disabled: busy }}
              disabled={busy}
              onPress={() => saveCurrent(current)}
              style={[styles.roundBtn, busy && styles.dim]}
              hitSlop={8}
            >
              <Icon name="download-outline" size={24} color={theme.ink} />
            </Pressable>
          )}
          {current?.kind === 'photo' && props.onSaveCaption && (
            <Pressable
              testID="viewer-caption"
              accessibilityRole="button"
              accessibilityLabel={current.caption ? 'Edit caption' : 'Add caption'}
              onPress={() => setCaptioning(current)}
              style={styles.roundBtn}
              hitSlop={8}
            >
              <Text style={styles.aa}>Aa</Text>
            </Pressable>
          )}
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={close} style={styles.roundBtn} hitSlop={8}>
            <Icon name="close" size={26} color={theme.ink} />
          </Pressable>
        </View>
        {captioning && (
          // Inside this Modal, not a second one: iOS will not present a Modal over a Modal.
          <CaptionEditor
            overlay
            key={captioning.id}
            capture={captioning}
            onClose={() => setCaptioning(null)}
            onSave={async (caption, y) => {
              const c = captioning;
              setCaptioning(null);
              await props.onSaveCaption?.(c, caption, y).catch(() => setSaveState({ id: c.id, text: 'The caption could not be saved' }));
            }}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  navBtn: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: theme.edge, alignItems: 'center', justifyContent: 'center' },
  note: { fontSize: 20, lineHeight: 27, color: theme.ink },
  meta: { fontSize: 14, color: theme.muted },
  voice: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  playBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#6b21a8', alignItems: 'center', justifyContent: 'center' },
  track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: theme.line, overflow: 'hidden' },
  trackFill: { height: 6, backgroundColor: '#6b21a8' },
  voiceTime: { fontSize: 14, color: theme.ink, fontVariant: ['tabular-nums'] },
  viewer: { flex: 1, backgroundColor: '#14181f' },
  viewerTop: { position: 'absolute', left: 16, right: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  viewerTitleSlot: { flex: 1, alignItems: 'flex-start' },
  savedAction: { textDecorationLine: 'underline', fontWeight: '700' },
  aa: { fontSize: 18, fontWeight: '800', color: theme.ink },
  saved: { position: 'absolute', right: 12, flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: theme.ink, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, maxWidth: 280 },
  savedText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  viewerTitle: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, maxWidth: '100%' },
  viewerTitleText: { color: theme.ink, fontSize: 15, fontWeight: '700' },
  roundBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: 0.35 },
});
