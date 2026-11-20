import { useAudioPlayer, useAudioPlayerStatus, type AudioPlayer } from 'expo-audio';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { overlayOf, type StageLive } from '../../lib/ceremony/live';
import type { BubbleOverlay } from '../../lib/ceremony/types';
import { useMediaUri } from '../../lib/useMediaUri';
import { COLORS } from '../map/types';
import { Icon } from '../icons';
import { theme } from '../ui';
import { bubblePose, bubbleRoom, cornerHeight, STAGE_BOTTOM, timeOf, type StageCtx } from './layout';
import { Skeleton } from './Skeleton';
import { useLive, useLiveStyle } from './useLive';
import { useMediaWait } from './useMediaWait';
import { plainNote } from '../../lib/refs';
import { memoLengthMs, memoLengthText, voiceClock, voiceSpan, voiceState, wholeMs } from '../../lib/voiceTrim';

const BARS = 22;
/** A waveform's bar heights, fixed per memo: a picture of a voice, not a measurement. */
function bars(id: string): number[] {
  let h = 7;
  return Array.from({ length: BARS }, (_, i) => {
    h = (h * 31 + id.charCodeAt(i % id.length) + i) % 997;
    return 5 + (h % 17);
  });
}

/** A trimmed memo reports every 100 ms, so it stops at its end handle, not up to half a second late (VT7). */
const TRIMMED_PLAYER = { updateInterval: 100 };
// Module level: the compiler lint does not see a player mutated in a component.
function seekMemo(player: AudioPlayer, s: number) {
  void player.seekTo(s);
}

/** A memo's waveform, lit as far as it has played: it renders as a bar lights, alone (replay ceremony RC7). */
function Wave({ live, bubble, id }: { live: StageLive; bubble: string; id: string }) {
  const lit = useLive(live, (f) => Math.round((overlayOf(f, 'bubble', bubble)?.progress ?? 0) * BARS));
  return (
    <View style={styles.wave}>
      {bars(id).map((h, i) => (
        <View key={i} style={[styles.bar, { height: h, backgroundColor: COLORS.voice, opacity: i < lit ? 1 : 0.3 }]} />
      ))}
    </View>
  );
}

/** A memo plays while its bubble says so, and stops when held (RR10, RR7). A refused start leaves the play button to tap. */
function MemoBubble({ o, ctx }: { o: BubbleOverlay; ctx: StageCtx }) {
  const uri = useMediaUri(o.capture);
  // A trimmed memo plays only its kept part: from the start handle to the end handle (VT7).
  const trim = o.capture.edit?.trim ?? null;
  const player = useAudioPlayer(uri, trim ? TRIMMED_PLAYER : undefined);
  const status = useAudioPlayerStatus(player);
  // A memo the viewer started themselves (sound refused, then a tap) plays to its end, and the stage waits for it (audits 8, 23).
  const [byHand, setByHand] = useState(false);
  // Paused with its own button: the stage goes on without it (audit 32).
  const [handPaused, setHandPaused] = useState(false);
  const stopped = ctx.held || ctx.paused;
  const len = memoLengthMs(o.capture);
  const span = voiceSpan(trim, wholeMs(o.capture.body, (status.duration || 0) * 1000));
  const ended = status.didJustFinish || (trim ? voiceState(status.currentTime, span) === 'end' : status.duration > 0 && status.currentTime >= status.duration - 0.05);
  // Started once it has moved: a file that won't play can still say it is playing.
  const started = trim ? status.currentTime * 1000 > span.startMs : status.currentTime > 0;
  // Whether its slot says it plays, and whether the slot is over: read from the frame on stage, so the bubble renders
  // when one changes and not as the slot's time passes (replay ceremony RC7).
  const { live } = ctx;
  const key = o.key;
  const playing = useLive(live, (f) => overlayOf(f, 'bubble', key)?.playing ?? false);
  const over = useLive(live, (f) => (overlayOf(f, 'bubble', key)?.progress ?? 0) >= 1);
  const waited = useMediaWait(o.key, ctx, {
    inSlot: playing && !handPaused, slotOver: (over || byHand) && !ended && !handPaused, started, ended,
    positionMs: () => voiceClock(status.currentTime, span).atMs, planMs: () => (overlayOf(live.frame(), 'bubble', key)?.progress ?? 0) * Math.max(1000, len), lenMs: Math.max(1000, len), stopped,
  });
  // Plays in its slot, while the stage waits for it, and after Pause if it was started by hand.
  const want = (playing || waited || byHand) && !ended && !stopped && !handPaused;
  useEffect(() => {
    if (!status.isLoaded) return;
    if (want) player.play();
    else player.pause();
  }, [want, status.isLoaded, player]);
  // Found before the start handle once it is wanted: brought to it.
  const strayed = !!trim && status.isLoaded && want && voiceState(status.currentTime, span) === 'before';
  useEffect(() => {
    if (strayed) seekMemo(player, span.startMs / 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strayed, player]);
  return (
    <View testID="memo-bubble" style={styles.memo}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={status.playing ? 'Pause voice memo' : 'Play voice memo'}
        testID="memo-play"
        onPress={() => {
          setByHand(!status.playing);
          setHandPaused(status.playing);
          if (status.playing) player.pause();
          else {
            if (trim && ended) seekMemo(player, span.startMs / 1000);
            player.play();
          }
        }}
        style={styles.play}
      >
        <Icon name={status.playing ? 'pause' : 'play'} size={18} color={theme.surface} />
      </Pressable>
      <View style={styles.memoBody}>
        {/* While the stage waits for it to start, a skeleton waveform; the play button stays to tap (RR23). */}
        {!started && !ended && waited ? (
          <Skeleton testID="memo-skeleton" style={styles.waveSkeleton} still={ctx.reduceMotion} />
        ) : (
          <Wave live={live} bubble={key} id={o.capture.id} />
        )}
        {/* The time stays whole on a 320 px phone; the label gives way first (tend replay 8). */}
        <View style={styles.meta}>
          <Text style={[styles.when, styles.label]} numberOfLines={1}>{memoLengthText(o.capture) ? `Voice memo · ${memoLengthText(o.capture)}` : 'Voice memo'}{' ·\u00a0'}</Text>
          <Text testID="memo-time" style={[styles.when, styles.time]} numberOfLines={1}>{timeOf(o.capture.t)}</Text>
        </View>
      </View>
    </View>
  );
}

/**
 * A note's or memo's bubble. How far it has come in or gone is written on it frame by frame (`bubbleRoom`,
 * `bubblePose`, replay ceremony RC7): `o` is the bubble as it arrived, read here only for its capture.
 */
function Bubble({ o, ctx }: { o: BubbleOverlay; ctx: StageCtx }) {
  const memo = o.capture.kind === 'voice';
  const key = o.key;
  const still = ctx.reduceMotion;
  // With reduce motion a bubble appears and leaves in place: no height easing in or out (RR18, audit 12).
  const room = useLiveStyle(ctx.live, (f) => {
    const now = overlayOf(f, 'bubble', key);
    return now ? bubbleRoom(now, still) : null;
  });
  const pose = useLiveStyle(ctx.live, (f) => {
    const now = overlayOf(f, 'bubble', key);
    return now ? bubblePose(now, still) : null;
  });
  return (
    <View ref={room} style={styles.wrap} pointerEvents="box-none">
      <View ref={pose} style={[styles.bubble, { borderLeftColor: memo ? COLORS.voice : COLORS.text }]}>
        {memo ? (
          <MemoBubble o={o} ctx={ctx} />
        ) : (
          <Pressable
            testID="replay-note"
            accessibilityRole="button"
            accessibilityLabel={`Note, ${timeOf(o.capture.t)}: ${plainNote(o.capture.body, o.capture.body_format) ?? ''}`}
            accessibilityHint="Opens the note"
            onPress={() => ctx.open([o.capture])}
          >
            <Text style={styles.text} numberOfLines={6}>{plainNote(o.capture.body, o.capture.body_format)}</Text>
            <Text style={styles.when}>{timeOf(o.capture.t)}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/** Notes and memos as a conversation in the bottom-left corner (RR9, RR10). */
export function Bubbles({ items, ctx }: { items: BubbleOverlay[]; ctx: StageCtx }) {
  return (
    <View
      pointerEvents="box-none"
      style={[styles.column, { left: ctx.insets.left + 12, bottom: ctx.insets.bottom + STAGE_BOTTOM, width: Math.min(ctx.width * 0.66, 320), maxHeight: cornerHeight(ctx) }]}
    >
      {items.map((o) => (
        <Bubble key={o.key} o={o} ctx={ctx} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  column: { position: 'absolute', justifyContent: 'flex-end', overflow: 'hidden' },
  wrap: { overflow: 'hidden', paddingTop: 6, alignItems: 'flex-start' },
  bubble: {
    backgroundColor: theme.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomRightRadius: 16, borderBottomLeftRadius: 5,
    borderLeftWidth: 3, paddingHorizontal: 11, paddingTop: 8, paddingBottom: 7, maxWidth: '100%',
    shadowColor: theme.ink, shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  text: { fontSize: 15, lineHeight: 20, color: theme.ink },
  when: { fontSize: 12, color: theme.muted, marginTop: 2, fontVariant: ['tabular-nums'] },
  memo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  memoBody: { gap: 2, flexShrink: 1 },
  meta: { flexDirection: 'row', alignItems: 'baseline' },
  label: { flexShrink: 1 },
  // Never shrinks, never wraps: "5:38 PM" stays on one line (tend replay audit 2).
  time: { flexShrink: 0 },
  // 44 pt: on an iPhone it is the only way to hear a memo, and hitSlop does nothing on the web (audit 27).
  play: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.voice, alignItems: 'center', justifyContent: 'center' },
  wave: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 24 },
  bar: { width: 3, borderRadius: 2 },
  waveSkeleton: { width: BARS * 5 - 2, height: 16, marginVertical: 4, borderRadius: 4 },
});
