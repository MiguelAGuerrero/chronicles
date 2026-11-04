import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { easeInOut, easeOut } from '../../lib/ceremony/ease';
import type { CardOverlay } from '../../lib/ceremony/types';
import { useMediaUri } from '../../lib/useMediaUri';
import { Icon, KIND_LABEL } from '../icons';
import { theme } from '../ui';
import { cardWidth, PILE, pileCenter, project, restCenter, tiltOf, timeOf, type StageCtx } from './layout';
import { useMediaWait } from './useMediaWait';

const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
/** How long a video may take to start before it is treated as refused sound (as the viewer's player). */
const AUTOPLAY_CHECK_MS = 800;

/** Mutes or unmutes a player and plays it (the player is a mutable native object, not React state). */
function playWithSound(player: ReturnType<typeof useVideoPlayer>, sound: boolean) {
  player.muted = !sound;
  player.play();
}

/** A video in its card: plays while the card says so, pauses when held; muted with "Tap for sound" where sound is refused (RR12). */
function CardVideo({ o, ctx, uri, height }: { o: CardOverlay; ctx: StageCtx; uri: string; height: number }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });
  const [muted, setMuted] = useState(false);
  const [ready, setReady] = useState(() => player.status === 'readyToPlay');
  const [started, setStarted] = useState(false);
  const [ended, setEnded] = useState(false);
  const playing = useRef(false);
  const tried = useRef(false);
  useEventListener(player, 'playingChange', ({ isPlaying }) => {
    playing.current = isPlaying;
    if (isPlaying) setStarted(true);
  });
  useEventListener(player, 'playToEnd', () => setEnded(true));
  const stopped = ctx.held || ctx.paused;
  const lenMs = Math.max(1000, Number(o.capture.body) || 0);
  // The stage waits while the video is behind its slot or not done at its end (audit 20); it plays on meanwhile.
  const waited = useMediaWait(o.key, ctx, {
    inSlot: o.playing, slotOver: o.progress >= 1 && !ended, started, ended, positionMs: () => player.currentTime * 1000, planMs: o.progress * lenMs, lenMs, stopped,
  });
  // A player told to play before it has loaded ignores it on web: it starts once ready (audit 8).
  useEventListener(player, 'statusChange', ({ status }) => {
    if (status === 'readyToPlay') setReady(true);
  });
  // A video that has started plays on past its slot until it ends: never a pause at the slot's edge (audit 34).
  const want = (o.playing || waited || (started && o.progress >= 1)) && !ended && !stopped;
  useEffect(() => {
    if (!want || !ready) {
      player.pause();
      return;
    }
    player.play();
    if (Platform.OS !== 'web' || tried.current) return;
    tried.current = true;
    const check = setTimeout(() => {
      if (playing.current) return;
      playWithSound(player, false);
      setMuted(true);
    }, AUTOPLAY_CHECK_MS);
    return () => clearTimeout(check);
  }, [want, ready, player]);
  return (
    <View style={{ height, width: '100%' }} pointerEvents="box-none">
      <View style={styles.fill} pointerEvents="none">
        <VideoView player={player} style={styles.fill} contentFit="cover" nativeControls={false} playsInline accessibilityLabel="Video" />
      </View>
      {muted && (
        <Pressable
          testID="video-sound"
          accessibilityRole="button"
          accessibilityLabel="Turn the sound on"
          onPress={() => {
            playWithSound(player, true);
            setMuted(false);
          }}
          style={styles.sound}
        >
          <Icon name="volume-mute" size={14} color={theme.surface} />
          <Text style={styles.soundText}>Tap for sound</Text>
        </Pressable>
      )}
    </View>
  );
}

/** A photo or video grows from its pin, holds, and tucks into the pile; with reduce motion it fades in place (RR11, RR12, RR18). */
function MomentCard({ o, ctx }: { o: CardOverlay; ctx: StageCtx }) {
  const uri = useMediaUri(o.capture);
  const w = cardWidth(ctx);
  const imgH = w * 1.15;
  const h = imgH + 7 + 34;
  const rest = restCenter(ctx);
  // It grows from its pin, where the frame says the pin is (audit 10).
  const pin = (o.from ? project(ctx, o.from) : null) ?? rest;
  const pile = pileCenter(ctx);
  let at = rest;
  let scale = 1;
  let tilt = 0;
  let opacity = 1;
  if (o.fade) {
    opacity = o.tuck > 0 ? 1 - o.tuck : o.grow;
  } else if (o.tuck > 0) {
    const b = easeInOut(o.tuck);
    at = [lerp(rest[0], pile[0], b), lerp(rest[1], pile[1], b)];
    scale = lerp(1, PILE.thumb / w, b);
    tilt = lerp(0, tiltOf(o.capture.id), b);
  } else {
    const a = easeOut(o.grow);
    at = [lerp(pin[0], rest[0], a), lerp(pin[1], rest[1], a)];
    scale = lerp(0.08, 1, a);
    opacity = Math.min(1, o.grow * 3);
  }
  const label = o.capture.caption || KIND_LABEL[o.capture.kind];
  return (
    <View
      testID="replay-card"
      accessible
      accessibilityLabel={`${label}, ${timeOf(o.capture.t)}`}
      // Taps go through to the stage (hold), except on the card's own buttons ("Tap for sound", audit 3).
      pointerEvents="box-none"
      style={[styles.card, { left: at[0] - w / 2, top: at[1] - h / 2, width: w, opacity, transform: [{ rotate: `${tilt}deg` }, { scale }] }]}
    >
      <View style={[styles.media, { height: imgH }]} pointerEvents="box-none">
        {uri && o.capture.kind === 'video' ? (
          <CardVideo o={o} ctx={ctx} uri={uri} height={imgH} />
        ) : uri ? (
          <Image source={{ uri }} style={styles.fill} resizeMode="cover" accessibilityIgnoresInvertColors pointerEvents="none" />
        ) : null}
      </View>
      <View style={styles.cap} pointerEvents="none">
        <Text style={styles.capText} numberOfLines={1}>{label}</Text>
        <Text style={styles.capTime}>{timeOf(o.capture.t)}</Text>
      </View>
    </View>
  );
}

export function Cards({ items, ctx }: { items: CardOverlay[]; ctx: StageCtx }) {
  return (
    <>
      {items.map((o) => (
        <MomentCard key={o.key} o={o} ctx={ctx} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute', backgroundColor: theme.surface, paddingTop: 7, paddingHorizontal: 7, borderRadius: 6,
    shadowColor: theme.ink, shadowOpacity: 0.22, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  media: { width: '100%', borderRadius: 2, overflow: 'hidden', backgroundColor: theme.line },
  fill: { width: '100%', height: '100%' },
  cap: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingVertical: 8, paddingHorizontal: 2 },
  capText: { flex: 1, fontSize: 13, color: theme.ink },
  capTime: { fontSize: 13, color: theme.muted, fontVariant: ['tabular-nums'] },
  sound: {
    position: 'absolute', right: 6, top: 6, flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: theme.chip, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3,
  },
  soundText: { color: theme.surface, fontSize: 11, fontWeight: '600' },
});
