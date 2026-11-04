import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { easeInOut } from '../../lib/ceremony/rhythm';
import type { CardOverlay } from '../../lib/ceremony/types';
import { useMediaUri } from '../../lib/useMediaUri';
import { Icon, KIND_LABEL } from '../icons';
import { theme } from '../ui';
import { cardWidth, PILE, pileCenter, restCenter, tiltOf, timeOf, type StageCtx } from './layout';

const easeOut = (u: number) => 1 - (1 - u) ** 3;
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
  const playing = useRef(false);
  const tried = useRef(false);
  useEventListener(player, 'playingChange', ({ isPlaying }) => {
    playing.current = isPlaying;
  });
  const want = o.playing && !ctx.held;
  useEffect(() => {
    if (!want) {
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
  }, [want, player]);
  return (
    <View style={{ height, width: '100%' }}>
      <VideoView player={player} style={styles.fill} contentFit="cover" nativeControls={false} playsInline accessibilityLabel="Video" />
      <View style={[styles.progress, { width: `${o.progress * 100}%` }]} />
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
          <Icon name="volume-mute" size={14} color="#ffffff" />
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
  // While following, the pin is where the map is centred: the middle of the screen.
  const pin: [number, number] = ctx.center ? [ctx.width / 2, ctx.height / 2] : rest;
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
      pointerEvents="none"
      style={[styles.card, { left: at[0] - w / 2, top: at[1] - h / 2, width: w, opacity, transform: [{ rotate: `${tilt}deg` }, { scale }] }]}
    >
      <View style={[styles.media, { height: imgH }]}>
        {uri && o.capture.kind === 'video' ? (
          <CardVideo o={o} ctx={ctx} uri={uri} height={imgH} />
        ) : uri ? (
          <Image source={{ uri }} style={styles.fill} resizeMode="cover" accessibilityIgnoresInvertColors />
        ) : null}
      </View>
      <View style={styles.cap}>
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
    position: 'absolute', backgroundColor: '#ffffff', paddingTop: 7, paddingHorizontal: 7, borderRadius: 6,
    shadowColor: '#000000', shadowOpacity: 0.22, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  media: { width: '100%', borderRadius: 2, overflow: 'hidden', backgroundColor: '#dcd9d3' },
  fill: { width: '100%', height: '100%' },
  cap: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingVertical: 8, paddingHorizontal: 2 },
  capText: { flex: 1, fontSize: 13, color: theme.ink },
  capTime: { fontSize: 13, color: theme.muted, fontVariant: ['tabular-nums'] },
  progress: { position: 'absolute', left: 0, bottom: 0, height: 3, backgroundColor: '#ffffff' },
  sound: {
    position: 'absolute', right: 6, top: 6, flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3,
  },
  soundText: { color: '#ffffff', fontSize: 11, fontWeight: '600' },
});
