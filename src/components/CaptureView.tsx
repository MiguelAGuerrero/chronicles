import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useState } from 'react';
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

/**
 * One capture, full screen over whatever is behind it: the photo fills it, a
 * note is set large, a voice memo gets a player.
 */
export function CaptureContent(props: { capture: Capture; autoPlay?: boolean; onVoiceFinished?: () => void; footer?: string }) {
  const { capture } = props;
  const uri = useMediaUri(capture);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {capture.kind === 'photo' && uri && <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="contain" accessibilityLabel="Photo" />}
      <View style={styles.card} pointerEvents="box-none">
        {capture.kind === 'text' && <Text style={styles.note}>{capture.body}</Text>}
        {capture.kind === 'voice' && uri && (
          <VoicePlayer uri={uri} autoPlay={props.autoPlay} onFinished={props.onVoiceFinished} durationMs={Number(capture.body) || 0} />
        )}
        {capture.kind !== 'text' && !uri && <Text style={styles.note}>{KIND_LABEL[capture.kind]}</Text>}
        <Text style={styles.meta}>
          {KIND_LABEL[capture.kind]} · {timeOf(capture)}
          {props.footer ? ` · ${props.footer}` : ''}
        </Text>
      </View>
    </View>
  );
}

/** Opens the captures behind a map pin, one at a time. */
export function CaptureViewer(props: { captures: Capture[] | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const list = props.captures ?? [];
  const current = list[Math.min(index, list.length - 1)];
  return (
    <Modal visible={list.length > 0} animationType="fade" onRequestClose={props.onClose} onShow={() => setIndex(0)}>
      <View style={styles.viewer}>
        {current && <CaptureContent key={current.id} capture={current} footer={list.length > 1 ? `${index + 1} of ${list.length}` : undefined} />}
        <View style={[styles.viewerTop, { top: insets.top + 8 }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={props.onClose} style={styles.roundBtn} hitSlop={8}>
            <Icon name="close" size={26} color={theme.ink} />
          </Pressable>
        </View>
        {list.length > 1 && (
          <View style={[styles.viewerNav, { bottom: insets.bottom + 140 }]} pointerEvents="box-none">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous capture"
              disabled={index === 0}
              onPress={() => setIndex((i) => Math.max(0, i - 1))}
              style={[styles.roundBtn, index === 0 && styles.dim]}
            >
              <Icon name="chevron-back" size={26} color={theme.ink} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next capture"
              disabled={index >= list.length - 1}
              onPress={() => setIndex((i) => Math.min(list.length - 1, i + 1))}
              style={[styles.roundBtn, index >= list.length - 1 && styles.dim]}
            >
              <Icon name="chevron-forward" size={26} color={theme.ink} />
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute', left: 0, right: 0, bottom: 0, margin: 16, padding: 16, gap: 10,
    backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: theme.radius, maxWidth: 560, alignSelf: 'center', width: '92%',
  },
  note: { fontSize: 20, lineHeight: 27, color: theme.ink },
  meta: { fontSize: 14, color: theme.muted },
  voice: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  playBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#6b21a8', alignItems: 'center', justifyContent: 'center' },
  track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: theme.line, overflow: 'hidden' },
  trackFill: { height: 6, backgroundColor: '#6b21a8' },
  voiceTime: { fontSize: 14, color: theme.ink, fontVariant: ['tabular-nums'] },
  viewer: { flex: 1, backgroundColor: '#14181f' },
  viewerTop: { position: 'absolute', right: 12 },
  viewerNav: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  roundBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: 0.35 },
});
