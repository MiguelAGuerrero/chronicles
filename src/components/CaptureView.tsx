import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { forwardRef, useEffect, useRef, useState, type ComponentRef } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { releaseMedia, resolveMedia } from '../lib/media';
import type { Capture } from '../lib/types';
import { Icon, KIND_LABEL } from './icons';
import { theme } from './ui';

/** Resolves a capture's stored media to a URI it can be shown or played from. */
export function useMediaUri(capture: Capture | null): string | null {
  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    let resolved: string | null = null;
    if (capture?.file_path) {
      resolveMedia(capture.file_path)
        .then((u) => {
          resolved = u;
          if (alive) setUri(u);
          else if (u) releaseMedia(u);
        })
        .catch(() => alive && setUri(null));
    }
    return () => {
      alive = false;
      setUri(null);
      if (resolved) releaseMedia(resolved);
    };
  }, [capture?.file_path]);
  return uri;
}

const timeOf = (c: Capture) => new Date(c.t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/** A voice memo with a play/pause control; `autoPlay` starts it, `onFinished` fires when it ends. */
function VoicePlayer(props: { uri: string; autoPlay?: boolean; onFinished?: () => void; durationMs: number }) {
  const player = useAudioPlayer(props.uri);
  const status = useAudioPlayerStatus(player);
  const { autoPlay, onFinished } = props;
  useEffect(() => {
    if (autoPlay && status.isLoaded) player.play();
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

/** A video, fitted to the screen with the platform's own controls; `autoPlay` starts it with sound. */
function VideoPlayer(props: { uri: string; autoPlay?: boolean; onFinished?: () => void }) {
  const player = useVideoPlayer(props.uri, (p) => {
    p.loop = false;
  });
  // A player told to play before it has loaded ignores it on web, so it
  // starts once it is ready (and at once if it already is).
  const started = useRef(false);
  const start = () => {
    if (!props.autoPlay || started.current) return;
    started.current = true;
    player.play();
  };
  useEventListener(player, 'statusChange', ({ status }) => {
    if (status === 'readyToPlay') start();
  });
  useEffect(() => {
    if (player.status === 'readyToPlay') start();
    // Checked once, on mount; later readiness comes through statusChange.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player]);
  useEventListener(player, 'playToEnd', () => props.onFinished?.());
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls accessibilityLabel="Video" />;
}

/**
 * One capture, full screen over whatever is behind it: the photo or video
 * fills it, a note is set large, a voice memo gets a player. `nav` adds
 * previous and next buttons to the capture's own card, so they never sit
 * under a long note.
 */
export const CaptureContent = forwardRef<ComponentRef<typeof Pressable>, {
  capture: Capture;
  autoPlay?: boolean;
  onVoiceFinished?: () => void;
  footer?: string;
  /** Space kept clear at the top, e.g. under the safe area and a top bar. */
  topInset?: number;
  nav?: { onPrev?: () => void; onNext?: () => void };
  /** A primary action in the card (the replay's Continue), within thumb reach. The ref is the action's. */
  action?: { label: string; hint?: string; onPress: () => void; testID?: string };
}>(function CaptureContent(props, actionRef) {
  const { capture } = props;
  const uri = useMediaUri(capture);
  const video = capture.kind === 'video';
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {capture.kind === 'photo' && uri && <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="contain" accessibilityLabel="Photo" />}
      {video && uri && <VideoPlayer uri={uri} autoPlay={props.autoPlay} onFinished={props.onVoiceFinished} />}
      {/* Over a video the card sits at the top, clear of the player's controls. */}
      <View style={[styles.cardRow, video ? { top: (props.topInset ?? 0) + 72 } : styles.cardRowBottom]} pointerEvents="box-none">
        <View style={styles.card}>
          {capture.kind === 'text' && <Text style={styles.note}>{capture.body}</Text>}
          {capture.kind === 'voice' && uri && (
            <VoicePlayer uri={uri} autoPlay={props.autoPlay} onFinished={props.onVoiceFinished} durationMs={Number(capture.body) || 0} />
          )}
          {capture.kind !== 'text' && !uri && <Text style={styles.note}>{KIND_LABEL[capture.kind]}</Text>}
          <View style={styles.metaRow}>
            <Text style={styles.meta}>
              {KIND_LABEL[capture.kind]} · {timeOf(capture)}
              {props.footer ? ` · ${props.footer}` : ''}
            </Text>
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
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Previous capture"
                  disabled={!props.nav.onPrev}
                  onPress={props.nav.onPrev}
                  style={[styles.navBtn, !props.nav.onPrev && styles.dim]}
                >
                  <Icon name="chevron-back" size={24} color={theme.ink} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Next capture"
                  disabled={!props.nav.onNext}
                  onPress={props.nav.onNext}
                  style={[styles.navBtn, !props.nav.onNext && styles.dim]}
                >
                  <Icon name="chevron-forward" size={24} color={theme.ink} />
                </Pressable>
              </View>
            )}
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
export function CaptureViewer(props: { captures: Capture[] | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const list = props.captures ?? [];
  const i = Math.min(index, Math.max(0, list.length - 1));
  const current = list[i];
  const close = () => {
    setIndex(0);
    props.onClose();
  };
  return (
    <Modal visible={list.length > 0} animationType="fade" onRequestClose={close}>
      <View style={styles.viewer}>
        {current && (
          <CaptureContent
            key={current.id}
            capture={current}
            topInset={insets.top}
            footer={list.length > 1 ? `${i + 1} of ${list.length}` : undefined}
            nav={
              list.length > 1
                ? { onPrev: i > 0 ? () => setIndex(i - 1) : undefined, onNext: i < list.length - 1 ? () => setIndex(i + 1) : undefined }
                : undefined
            }
          />
        )}
        <View style={[styles.viewerTop, { top: insets.top + 8 }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={close} style={styles.roundBtn} hitSlop={8}>
            <Icon name="close" size={26} color={theme.ink} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // A full-width row centers the card on any screen width.
  cardRow: { position: 'absolute', left: 0, right: 0, paddingHorizontal: 16, alignItems: 'center' },
  cardRowBottom: { bottom: 16 },
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
  viewerTop: { position: 'absolute', right: 12 },
  roundBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: 0.35 },
});
