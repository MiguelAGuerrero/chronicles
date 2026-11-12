import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { easeInOut, easeOut } from '../../lib/ceremony/ease';
import { gridLayout } from '../../lib/ceremony/grid';
import type { CardOverlay } from '../../lib/ceremony/types';
import { editedSize, isEmptyEdit, type MediaEdit } from '../../lib/mediaEdit';
import { useMediaUri } from '../../lib/useMediaUri';
import { EditedPicture, useNaturalSize } from '../edit/EditedPhoto';
import { seekTo, useVideoSize, VideoPicture } from '../edit/EditedVideo';
import { Icon, KIND_LABEL } from '../icons';
import { theme } from '../ui';
import { cardWidth, PILE, pileCenter, project, restCenter, tiltOf, timeOf, type StageCtx } from './layout';
import { Skeleton } from './Skeleton';
import { StackGrid } from './Grid';

import { useMediaWait } from './useMediaWait';

/** A grid's height for its width: its rows of square cells (MS17). */
function gridHeight(n: number, width: number): number {
  const g = gridLayout(n);
  const cell = (width - 4 * (g.cols - 1)) / g.cols;
  return g.rows * cell + 4 * (g.rows - 1);
}

const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
/** How long a video may take to start before it is treated as refused sound (as the viewer's player). */
const AUTOPLAY_CHECK_MS = 800;

/** Mutes or unmutes a player and plays it (the player is a mutable native object, not React state). */
function playWithSound(player: ReturnType<typeof useVideoPlayer>, sound: boolean) {
  player.muted = !sound;
  player.play();
}

/** Where a picture of `size` sits to fill a `w` x `h` box ("cover"), centred. */
function coverRect(size: { w: number; h: number }, w: number, h: number) {
  const k = Math.max(w / size.w, h / size.h);
  return { left: (w - size.w * k) / 2, top: (h - size.h * k) / 2, width: size.w * k, height: size.h * k };
}

/** An edited photo filling its card (ME4): the same picture as the viewer, cropped to the card's shape. */
function CardPhoto({ uri, edit, width, height, onLoad }: { uri: string; edit: MediaEdit; width: number; height: number; onLoad: () => void }) {
  const size = useNaturalSize(uri);
  if (!size || !width) return null;
  const r = coverRect(editedSize(size.w, size.h, edit), width, height);
  return (
    <View style={[styles.fill, { overflow: 'hidden' }]} pointerEvents="none">
      <View style={{ position: 'absolute', ...r }}>
        <EditedPicture uri={uri} W={size.w} H={size.h} edit={edit} width={r.width} height={r.height} onLoad={onLoad} />
      </View>
    </View>
  );
}

/** A video in its card: plays while the card says so, pauses when held; muted with "Tap for sound" where sound is refused (RR12). Edited, it is turned, cropped and trimmed as in the viewer (ME4, ME15). */
function CardVideo({ o, ctx, uri, height, width }: { o: CardOverlay; ctx: StageCtx; uri: string; height: number; width: number }) {
  const edit = o.capture.edit && !isEmptyEdit(o.capture.edit) ? o.capture.edit : null;
  const trim = edit?.trim ?? null;
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    if (trim) p.timeUpdateEventInterval = 0.1;
  });
  const size = useVideoSize(player, edit ? uri : null);
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
  // A trimmed video plays only its kept part: it ends at the trim's end (ME15).
  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    if (trim && currentTime >= trim.end_ms / 1000 - 0.02 && !ended) {
      player.pause();
      setEnded(true);
    }
  });
  const stopped = ctx.held || ctx.paused;
  const startS = (trim?.start_ms ?? 0) / 1000;
  const lenMs = Math.max(1000, trim ? trim.end_ms - trim.start_ms : Number(o.capture.body) || 0);
  // The stage waits while the video is behind its slot or not done at its end (audit 20); it plays on meanwhile.
  const waited = useMediaWait(o.key, ctx, {
    inSlot: o.playing, slotOver: o.progress >= 1 && !ended, started, ended, positionMs: () => (player.currentTime - startS) * 1000, planMs: o.progress * lenMs, lenMs, stopped,
  });
  // A player told to play before it has loaded ignores it on web: it starts once ready (audit 8).
  useEventListener(player, 'statusChange', ({ status }) => {
    if (status !== 'readyToPlay') return;
    // A trimmed video starts at its start.
    if (trim && player.currentTime < startS) seekTo(player, startS);
    setReady(true);
  });
  // A video that has started plays on past its slot until it ends: never a pause at the slot's edge (audit 34).
  const want = (o.playing || waited || (started && o.progress >= 1)) && !ended && !stopped;
  const cover = edit && size && width ? coverRect(editedSize(size.w, size.h, edit), width, height) : null;
  // The web player plays only the <video> it has mounted, and iOS loads a video only once play() is
  // called, so it is never ready before then (fix ios-video 1). On the web, play is asked once the shown
  // view is mounted (this effect runs after its children's) and again when an edited video's view swaps in.
  const canPlay = ready || Platform.OS === 'web';
  const view = cover ? 'picture' : 'plain';
  useEffect(() => {
    if (!want || !canPlay) {
      player.pause();
      return;
    }
    if (startS > 0 && player.currentTime < startS) seekTo(player, startS);
    player.play();
    if (Platform.OS !== 'web' || tried.current) return;
    // Spent only once it has looked: a view swapped in before then asks again, and is checked again.
    const check = setTimeout(() => {
      tried.current = true;
      if (playing.current) return;
      playWithSound(player, false);
      setMuted(true);
    }, AUTOPLAY_CHECK_MS);
    return () => clearTimeout(check);
  }, [want, canPlay, player, view, startS]);
  return (
    <View style={{ height, width: '100%' }} pointerEvents="box-none">
      <View style={[styles.fill, { overflow: 'hidden' }]} pointerEvents="none">
        {edit && size && cover ? (
          <View style={{ position: 'absolute', ...cover }}>
            <VideoPicture player={player} W={size.w} H={size.h} edit={edit} width={cover.width} height={cover.height} />
          </View>
        ) : (
          <VideoView player={player} style={styles.fill} contentFit="cover" nativeControls={false} playsInline accessibilityLabel="Video" />
        )}
      </View>
      {/* Until it plays (loading, or a muted retry), a skeleton where the picture will be (RR23). */}
      {!started && !ended && (o.playing || waited) && <Skeleton testID="media-skeleton" style={StyleSheet.absoluteFill} still={ctx.reduceMotion} />}
      {muted && (
        <Pressable
          testID="video-sound"
          accessibilityRole="button"
          // Spoken as it reads (WCAG 2.5.3), what it does as the hint (tend replay 6).
          accessibilityLabel="Tap for sound"
          accessibilityHint="Turns the video's sound on"
          onPress={() => {
            playWithSound(player, true);
            setMuted(false);
          }}
          style={styles.sound}
        >
          <Icon name="volume-mute" size={16} color={theme.surface} />
          <Text style={styles.soundText}>Tap for sound</Text>
        </Pressable>
      )}
    </View>
  );
}

/** A photo or video grows from its pin, holds, and tucks into the pile; with reduce motion it fades in place (RR11, RR12, RR18). */
function MomentCard({ o, ctx }: { o: CardOverlay; ctx: StageCtx }) {
  const uri = useMediaUri(o.capture);
  // A photo's picture, once it has loaded: a skeleton stands in until then (RR23).
  const [loaded, setLoaded] = useState(false);
  const w = cardWidth(ctx);
  // A stack's grid sits in a square of the card's width (MS17).
  const grid = !!o.pieces?.length;
  const imgH = grid ? gridHeight(o.pieces!.length, w - 14) : w * 1.15;
  const h = imgH + 7 + 34;
  const rest = restCenter(ctx, h);
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
        {grid ? (
          <StackGrid o={o} ctx={ctx} width={w - 14} />
        ) : uri && o.capture.kind === 'video' ? (
          <CardVideo o={o} ctx={ctx} uri={uri} height={imgH} width={w - 14} />
        ) : uri && o.capture.edit && !isEmptyEdit(o.capture.edit) ? (
          <CardPhoto uri={uri} edit={o.capture.edit} width={w - 14} height={imgH} onLoad={() => setLoaded(true)} />
        ) : uri ? (
          <Image source={{ uri }} style={styles.fill} resizeMode="cover" accessibilityIgnoresInvertColors pointerEvents="none" onLoad={() => setLoaded(true)} />
        ) : null}
        {!grid && (!uri || (o.capture.kind === 'photo' && !loaded)) && <Skeleton testID="media-skeleton" style={StyleSheet.absoluteFill} still={ctx.reduceMotion} />}
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
  // The viewer's pill (CaptureView's `sound`): 48 px, on a solid ground over any picture (tend replay 6).
  sound: {
    position: 'absolute', right: 6, top: 6, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.ink, borderRadius: 24, paddingHorizontal: 16,
  },
  soundText: { color: theme.surface, fontSize: 14, fontWeight: '600' },
});
