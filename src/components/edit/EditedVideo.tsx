import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView, type VideoPlayer } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type LayoutRectangle } from 'react-native';
import { probeVideoSize } from '../../lib/media';
import { applyAffine, editedSize, exportPlan, serializeEdit, type MediaEdit } from '../../lib/mediaEdit';
import { CaptionBar } from '../Caption';
import { Icon } from '../icons';
import { EditedPicture, fitRect, webData } from './EditedPhoto';

/** How long a video may take to start playing before it is treated as refused. */
export const AUTOPLAY_CHECK_MS = 800;
/** How often the player says where it is, so a trim's end is caught (ME15). */
const TIME_UPDATE_S = 0.1;

const NO_EDIT: MediaEdit = { v: 1, rotate: 0, crop: null, filter: 'original', strokes: [], trim: null };

/**
 * A video's picture size: the player's video track on phones, a probe of
 * the metadata on the web (expo-video's web player has no track).
 */
export function useVideoSize(player: VideoPlayer, uri: string | null): { w: number; h: number } | null {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const asked = useRef(false);
  // The track's size is the encoded one (a portrait clip reads landscape); a
  // first-frame thumbnail is upright on both platforms (iOS applies the
  // track's transform, Android's retriever its rotation), so it is asked
  // first, and the track only stands in if it fails.
  const read = () => {
    if (Platform.OS === 'web' || asked.current || player.status !== 'readyToPlay') return;
    asked.current = true;
    player
      .generateThumbnailsAsync([0])
      .then(([t]) => {
        if (t?.width && t.height) setSize({ w: t.width, h: t.height });
        else throw new Error('no frame');
      })
      .catch(() => {
        const s = player.videoTrack?.size;
        if (s && s.width && s.height) setSize({ w: s.width, h: s.height });
      });
  };
  useEventListener(player, 'videoTrackChange', read);
  useEventListener(player, 'statusChange', read);
  // The web player has no track and makes no thumbnails: the metadata says it.
  useEffect(() => {
    if (!uri || Platform.OS !== 'web') return;
    let alive = true;
    void probeVideoSize(uri).then((s) => alive && s && setSize(s));
    return () => {
      alive = false;
    };
  }, [uri]);
  return size;
}

/**
 * The video turned and cropped to fill `width` x `height` (the edited
 * shape), its lines on top in a layer that takes no taps (ME12). The
 * transform is the bakers' (`exportPlan`): the original's centre goes where
 * the plan puts it, scaled and turned about it.
 */
export function VideoPicture(props: { player: VideoPlayer; W: number; H: number; edit: MediaEdit; width: number; height: number; nativeControls?: boolean }) {
  const { W, H, edit } = props;
  const plan = exportPlan({ w: W, h: H }, edit, {});
  const k = props.width / plan.out.w;
  const m = plan.matrix.map((v) => v * k) as typeof plan.matrix;
  const scale = Math.hypot(m[0], m[1]);
  const c = applyAffine(m, { x: W / 2, y: H / 2 });
  const w = W * scale;
  const h = H * scale;
  return (
    <View style={{ width: props.width, height: props.height, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', left: c.x - w / 2, top: c.y - h / 2, width: w, height: h, transform: [{ rotate: `${edit.rotate}deg` }] }}>
        {/* Sized with width and height, not left/right/top/bottom: on web this
            style lands on the <video> tag itself, which keeps its own size otherwise. */}
        <VideoView player={props.player} style={styles.fill} contentFit="fill" nativeControls={!!props.nativeControls} playsInline accessibilityLabel="Video" />
      </View>
      {edit.strokes.length > 0 && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none" testID="video-lines">
          <EditedPicture uri={null} W={W} H={H} edit={edit} width={props.width} height={props.height} linesOnly />
        </View>
      )}
    </View>
  );
}

/** Mutes or unmutes a player and plays it (the player is a mutable native object, not React state). */
function playWithSound(player: VideoPlayer, sound: boolean) {
  player.muted = !sound;
  player.play();
}

/** Moves a player to a time in seconds (outside render: the player is not React state). */
export function seekTo(player: VideoPlayer, s: number) {
  player.currentTime = s;
}

/**
 * A video moment full screen (ME4, ME12, ME13, ME15). Unturned and uncropped,
 * it keeps the platform's own controls; turned or cropped, those would turn
 * with it, so it gets a plain play button instead. A trimmed video starts at
 * its start, ends at its end, and a seek outside is brought back.
 * `autoPlay` starts it with sound; browsers (iOS always) refuse sound unless a
 * tap started it, so it then plays muted with a button to turn the sound on.
 */
export function EditedVideo(props: { uri: string; edit: MediaEdit | null; caption?: string | null; captionY?: number | null; autoPlay?: boolean; onFinished?: () => void }) {
  const edit = props.edit ?? NO_EDIT;
  const trim = edit.trim;
  const player = useVideoPlayer(props.uri, (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = TIME_UPDATE_S;
  });
  const size = useVideoSize(player, props.uri);
  const [box, setBox] = useState<LayoutRectangle | null>(null);
  const shown = size ? editedSize(size.w, size.h, edit) : null;
  const rect = fitRect(box, shown);
  const plain = edit.rotate === 0 && !edit.crop;
  const [mutedForAutoplay, setMutedForAutoplay] = useState(false);
  const [playing, setPlaying] = useState(false);
  const started = useRef(false);
  const isPlaying = useRef(false);
  const ended = useRef(false);
  const finished = useRef(props.onFinished);
  useEffect(() => {
    finished.current = props.onFinished;
  }, [props.onFinished]);
  const check = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toStart = () => {
    if (trim) seekTo(player, trim.start_ms / 1000);
  };
  // A player told to play before it has loaded ignores it on web, so it
  // starts once it is ready (and at once if it already is).
  const start = () => {
    if (started.current) return;
    started.current = true;
    toStart();
    if (!props.autoPlay) return;
    player.play();
    if (Platform.OS !== 'web') return;
    check.current = setTimeout(() => {
      if (isPlaying.current) return;
      playWithSound(player, false);
      setMutedForAutoplay(true);
    }, AUTOPLAY_CHECK_MS);
  };
  useEventListener(player, 'playingChange', ({ isPlaying: on }) => {
    isPlaying.current = on;
    setPlaying(on);
    // Played again from the trim's end (the platform's own controls too): the kept part starts over (media-editing audit 6).
    if (on && trim && player.currentTime >= trim.end_ms / 1000 - 0.05) {
      seekTo(player, trim.start_ms / 1000);
      ended.current = false;
    }
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
  const end = () => {
    if (ended.current) return;
    ended.current = true;
    finished.current?.();
  };
  useEventListener(player, 'playToEnd', end);
  // The kept part only (ME15): stop at its end (the replay moves on), pull a seek outside back in.
  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    if (!trim) return;
    const s = trim.start_ms / 1000;
    const e = trim.end_ms / 1000;
    if (currentTime >= e - 0.02) {
      if (isPlaying.current) {
        player.pause();
        seekTo(player, e);
        end();
      } else if (currentTime > e + 0.05) seekTo(player, e);
    } else if (currentTime < s - 0.05) seekTo(player, s);
  });
  const toggle = () => {
    if (playing) {
      player.pause();
      return;
    }
    // At the end, Play starts the kept part again.
    const e = trim ? trim.end_ms / 1000 : player.duration;
    if (e && player.currentTime >= e - 0.05) {
      seekTo(player, trim ? trim.start_ms / 1000 : 0);
      ended.current = false;
    }
    playWithSound(player, true);
    setMutedForAutoplay(false);
  };
  return (
    <View
      style={StyleSheet.absoluteFill}
      onLayout={(e) => setBox(e.nativeEvent.layout)}
      pointerEvents="box-none"
      testID="edited-video"
      {...webData({ edit: serializeEdit(edit) ?? '', size: shown ? `${Math.round(shown.w)}x${Math.round(shown.h)}` : '' })}
    >
      {rect && size && (
        <View style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.width, height: rect.height }}>
          <VideoPicture player={player} W={size.w} H={size.h} edit={edit} width={rect.width} height={rect.height} nativeControls={plain} />
        </View>
      )}
      {/* Before the size is known (or with no size at all), the plain player as before. */}
      {(!size || !rect) && <VideoView player={player} style={styles.fill} contentFit="contain" nativeControls playsInline accessibilityLabel="Video" />}
      {rect && props.caption ? <CaptionBar text={props.caption} y={props.captionY ?? 0.6} rect={rect} /> : null}
      {rect && !plain && !mutedForAutoplay && (
        <Pressable
          testID="video-play"
          accessibilityRole="button"
          accessibilityLabel={playing ? 'Pause video' : 'Play video'}
          onPress={toggle}
          style={[styles.playBtn, { left: rect.x + 12, top: rect.y + rect.height - 60 }]}
          hitSlop={8}
        >
          <Icon name={playing ? 'pause' : 'play'} size={24} color="#ffffff" />
        </Pressable>
      )}
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
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  playBtn: { position: 'absolute', width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  soundBtn: {
    position: 'absolute', alignSelf: 'center', top: '45%', flexDirection: 'row', alignItems: 'center', gap: 8,
    minHeight: 48, paddingHorizontal: 18, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.7)',
  },
  soundText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});
