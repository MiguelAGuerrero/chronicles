import { useEventListener } from 'expo';
import { Picture } from '../Picture';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { overlayOf } from '../../lib/ceremony/live';
import { SIZE_WAIT_MS } from '../../lib/ceremony/media';
import type { CardOverlay } from '../../lib/ceremony/types';
import { editedSize, isEmptyEdit, type MediaEdit } from '../../lib/mediaEdit';
import type { Faced } from '../../lib/moment';
import { useMediaUri } from '../../lib/useMediaUri';
import { gridLabel } from '../../lib/quietLines';
import { lengthLabel, memoLengthMs } from '../../lib/voiceTrim';
import { EditedPicture, useNaturalSize } from '../edit/EditedPhoto';
import { seekTo, useVideoSize, VideoPicture } from '../edit/EditedVideo';
import { Icon, KIND_LABEL } from '../icons';
import { theme } from '../ui';
import { cardPose, cardSize, restCenter, timeOf, type StageCtx } from './layout';
import { Skeleton } from './Skeleton';
import { StackGrid } from './Grid';

import { useLive, useLiveStyle } from './useLive';
import { useMediaWait } from './useMediaWait';

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

/**
 * A video in its card: plays while the card says so, pauses when held; muted with "Tap for sound" where sound is
 * refused (RR12). Edited, it is turned, cropped and trimmed as in the viewer (ME4, ME15). `capture` is the video: the
 * card's own, or one of a moment's videos in its `turn` (replay ceremony RC37), which plays only while the card's
 * frame says that turn is up. Its player is made here, when it is drawn: one video, one player, never one a piece.
 */
function CardVideo({ o, capture, turn, ctx, uri, height, width }: { o: CardOverlay; capture: Faced; turn?: number; ctx: StageCtx; uri: string; height: number; width: number }) {
  const edit = capture.edit && !isEmptyEdit(capture.edit) ? capture.edit : null;
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
  const edited = !!edit;
  const [unsized, setUnsized] = useState(false);
  useEffect(() => {
    if (!edited) return;
    const t = setTimeout(() => setUnsized(true), SIZE_WAIT_MS);
    return () => clearTimeout(t);
  }, [edited]);
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
  // The kept part's length, as the plan reads it: the card's `progress` is a fraction of it (fix trimmed-length 2, 4).
  const lenMs = Math.max(1000, memoLengthMs(capture));
  // Whether its slot says it plays, and whether the slot is over: read from the frame on stage, so the card renders
  // when one changes and not as the slot's time passes (replay ceremony RC7).
  const { live } = ctx;
  const key = o.key;
  // Its own turn's frame: a video on its own is the card's every frame; one in its turn, only while that turn is up.
  const mine = (f: Parameters<typeof overlayOf>[0]) => {
    const now = overlayOf(f, 'card', key);
    return now && (turn == null || now.turn === turn) ? now : null;
  };
  const inSlot = useLive(live, (f) => mine(f)?.playing ?? false);
  const over = useLive(live, (f) => (mine(f)?.progress ?? 0) >= 1);
  // The stage waits while the video is behind its slot or not done at its end (audit 20); it plays on meanwhile.
  const waited = useMediaWait(turn == null ? o.key : `${o.key}:${capture.piece_id}`, ctx, {
    inSlot, slotOver: over && !ended, started, ended, positionMs: () => (player.currentTime - startS) * 1000,
    planMs: () => (mine(live.frame())?.progress ?? 0) * lenMs, lenMs, stopped,
  });
  // A player told to play before it has loaded ignores it on web: it starts once ready (audit 8).
  useEventListener(player, 'statusChange', ({ status }) => {
    if (status !== 'readyToPlay') return;
    // A trimmed video starts at its start.
    if (trim && player.currentTime < startS) seekTo(player, startS);
    setReady(true);
  });
  // A video that has started plays on past its slot until it ends: never a pause at the slot's edge (audit 34).
  const want = (inSlot || waited || (started && over)) && !ended && !stopped;
  const cover = edit && size && width ? coverRect(editedSize(size.w, size.h, edit), width, height) : null;
  // The web player plays only the <video> it has mounted, and iOS loads a video only once play() is
  // called, so it is never ready before then (fix ios-video 1). On the web, play is asked once the shown
  // view is mounted (this effect runs after its children's) and again when an edited video's view swaps in.
  // An edited video is shown through another view once its size is known (ME4): it is not asked to play before then,
  // or the swap takes the tag it was playing in away mid-start (a logged AbortError, and a muted retry). A video in
  // its turn comes up a third of a second before it plays, sooner than a size is read (replay ceremony RC37). One
  // whose size never comes plays as it is, after a short wait.
  const canPlay = (ready || Platform.OS === 'web') && (!edit || !!size || unsized);
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
      {!started && !ended && (inSlot || waited) && <Skeleton testID="media-skeleton" style={StyleSheet.absoluteFill} still={ctx.reduceMotion} />}
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

/**
 * One of a moment's videos, in its turn (replay ceremony RC37): laid over what the card showed before, coming in as
 * the frame says, its file found and its player made only now that its turn has come.
 */
function TurnVideo({ o, piece, turn, ctx, height, width }: { o: CardOverlay; piece: Faced; turn: number; ctx: StageCtx; height: number; width: number }) {
  const uri = useMediaUri(piece);
  const key = o.key;
  const come = useLiveStyle(ctx.live, (f) => {
    const now = overlayOf(f, 'card', key);
    return now ? { opacity: now.turn === turn ? now.turnIn ?? 1 : 1 } : null;
  });
  return (
    <View ref={come} testID="card-turn" style={styles.turn} pointerEvents="box-none">
      {uri ? <CardVideo key={uri} o={o} capture={piece} turn={turn} ctx={ctx} uri={uri} height={height} width={width} /> : <Skeleton testID="media-skeleton" style={StyleSheet.absoluteFill} still={ctx.reduceMotion} />}
    </View>
  );
}

/** A moment's videos in its card: the one whose turn it is, and none while its pictures are up. It renders when the turn changes. */
function Turns({ o, ctx, height, width }: { o: CardOverlay; ctx: StageCtx; height: number; width: number }) {
  const key = o.key;
  const turn = useLive(ctx.live, (f) => overlayOf(f, 'card', key)?.turn ?? 0);
  const piece = turn > 0 ? o.videos?.[turn - 1] : null;
  return piece ? <TurnVideo key={piece.piece_id} o={o} piece={piece} turn={turn} ctx={ctx} height={height} width={width} /> : null;
}

/**
 * A photo or video grows from its pin, holds, and shrinks back onto its place, where its picture then stands; with
 * reduce motion it fades in place (RR11, RR12, RR18; replay ceremony RC28). Where it stands, its size and its fade
 * are written on it frame by frame (`cardPose`, replay ceremony RC7): `o` is the card as it arrived, read here only
 * for what never moves (its capture, its pieces, its videos).
 */
function MomentCard({ o, ctx }: { o: CardOverlay; ctx: StageCtx }) {
  const uri = useMediaUri(o.capture);
  // A photo's picture, once it has loaded: a skeleton stands in until then (RR23).
  const [loaded, setLoaded] = useState(false);
  // A stack's grid sits in a square of the card's width (MS17); a moment with videos keeps one picture's room for
  // all it shows in turn (RC37). The size is the room's to say (`lib/ceremony/room`): the camera settles the pin
  // under this card from the same numbers (replay ceremony RC14).
  const grid = !!o.pieces?.length;
  const turns = !!o.videos?.length;
  const { w, h, imgH } = cardSize(ctx, turns ? 0 : o.pieces?.length ?? 0);
  const rest = restCenter(ctx, h);
  const key = o.key;
  // A photo held in its card drifts a little closer over its time up (RC36): its picture's own scale, nothing else's.
  const drift = useLiveStyle(ctx.live, (f) => {
    const now = overlayOf(f, 'card', key);
    return now ? { scale: 1 + (now.drift ?? 0) } : null;
  });
  // It grows from its pin, where the frame says the pin is (audit 10).
  const pose = useLiveStyle(ctx.live, (f) => {
    const now = overlayOf(f, 'card', key);
    return now ? cardPose(now, ctx, f.camera, w, h) : null;
  });
  // What the card says under its picture is what it shows: a moment's video in its turn is named as itself (RC37).
  const turn = useLive(ctx.live, (f) => overlayOf(f, 'card', key)?.turn ?? 0);
  const showing = (turn > 0 ? o.videos?.[turn - 1] : null) ?? o.capture;
  // A grid is named in the plural, a word and never a count (replay-ceremony ui 4).
  const named = showing.caption || (grid && turn === 0 ? gridLabel(o.pieces?.length ?? 0) : KIND_LABEL[showing.kind]);
  // A video's card says its kept length as a memo's bubble does (tend captures audit 19, decision 0264): "Video · 0:20".
  const label = showing.kind === 'video' ? lengthLabel(named, showing) : named;
  return (
    <View
      ref={pose}
      testID="replay-card"
      accessible
      accessibilityLabel={`${label}, ${timeOf(o.capture.t)}`}
      // Taps go through to the stage (hold), except on the card's own buttons ("Tap for sound", audit 3).
      pointerEvents="box-none"
      // Where it rests, until its first frame is written on it, before it is seen.
      style={[styles.card, { left: rest[0] - w / 2, top: rest[1] - h / 2, width: w }]}
    >
      <View style={[styles.media, { height: imgH }]} pointerEvents="box-none">
        {grid ? (
          <StackGrid o={o} ctx={ctx} width={w - 14} height={turns ? imgH : undefined} />
        ) : turns ? null : uri && o.capture.kind === 'video' ? (
          <CardVideo o={o} capture={o.capture} ctx={ctx} uri={uri} height={imgH} width={w - 14} />
        ) : uri ? (
          <View ref={drift} testID="card-photo" style={styles.fill} pointerEvents="none">
            {o.capture.edit && !isEmptyEdit(o.capture.edit) ? (
              <CardPhoto uri={uri} edit={o.capture.edit} width={w - 14} height={imgH} onLoad={() => setLoaded(true)} />
            ) : (
              <Picture uri={uri} style={styles.fill} fit="cover" accessibilityIgnoresInvertColors pointerEvents="none" onLoad={() => setLoaded(true)} />
            )}
          </View>
        ) : null}
        {/* A moment's videos, each in its turn over what the card showed before (RC37). */}
        {turns ? <Turns o={o} ctx={ctx} height={imgH} width={w - 14} /> : null}
        {!grid && !turns && (!uri || (o.capture.kind === 'photo' && !loaded)) && <Skeleton testID="media-skeleton" style={StyleSheet.absoluteFill} still={ctx.reduceMotion} />}
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
  turn: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: theme.line },
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
