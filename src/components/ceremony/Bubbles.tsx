import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BubbleOverlay } from '../../lib/ceremony/types';
import { useMediaUri } from '../../lib/useMediaUri';
import { COLORS } from '../map/types';
import { Icon } from '../icons';
import { theme } from '../ui';
import { cornerHeight, STAGE_BOTTOM, timeOf, type StageCtx } from './layout';
import { Skeleton } from './Skeleton';
import { useMediaWait } from './useMediaWait';
import { plainNote } from '../../lib/refs';

const BARS = 22;
/** A waveform's bar heights, fixed per memo: a picture of a voice, not a measurement. */
function bars(id: string): number[] {
  let h = 7;
  return Array.from({ length: BARS }, (_, i) => {
    h = (h * 31 + id.charCodeAt(i % id.length) + i) % 997;
    return 5 + (h % 17);
  });
}
const secs = (ms: number) => `${Math.floor(ms / 60_000)}:${String(Math.floor((ms % 60_000) / 1000)).padStart(2, '0')}`;

/** A memo plays while its bubble says so, and stops when held (RR10, RR7). A refused start leaves the play button to tap. */
function MemoBubble({ o, ctx }: { o: BubbleOverlay; ctx: StageCtx }) {
  const uri = useMediaUri(o.capture);
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  // A memo the viewer started themselves (sound refused, then a tap) plays to its end, and the stage waits for it (audits 8, 23).
  const [byHand, setByHand] = useState(false);
  // Paused with its own button: the stage goes on without it (audit 32).
  const [handPaused, setHandPaused] = useState(false);
  const stopped = ctx.held || ctx.paused;
  const len = Number(o.capture.body) || 0;
  const ended = status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration - 0.05);
  // Started once it has moved: a file that won't play can still say it is playing.
  const started = status.currentTime > 0;
  const waited = useMediaWait(o.key, ctx, {
    inSlot: o.playing && !handPaused, slotOver: (o.progress >= 1 || byHand) && !ended && !handPaused, started, ended,
    positionMs: () => status.currentTime * 1000, planMs: o.progress * Math.max(1000, len), lenMs: Math.max(1000, len), stopped,
  });
  // Plays in its slot, while the stage waits for it, and after Hold if it was started by hand.
  const want = (o.playing || waited || byHand) && !ended && !stopped && !handPaused;
  useEffect(() => {
    if (!status.isLoaded) return;
    if (want) player.play();
    else player.pause();
  }, [want, status.isLoaded, player]);
  const lit = Math.round(o.progress * BARS);
  return (
    <View style={styles.memo}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={status.playing ? 'Pause voice memo' : 'Play voice memo'}
        testID="memo-play"
        onPress={() => {
          setByHand(!status.playing);
          setHandPaused(status.playing);
          if (status.playing) player.pause();
          else player.play();
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
          <View style={styles.wave}>
            {bars(o.capture.id).map((h, i) => (
              <View key={i} style={[styles.bar, { height: h, backgroundColor: COLORS.voice, opacity: i < lit ? 1 : 0.3 }]} />
            ))}
          </View>
        )}
        <Text style={styles.when}>Voice memo · {secs(len)} · {timeOf(o.capture.t)}</Text>
      </View>
    </View>
  );
}

function Bubble({ o, ctx }: { o: BubbleOverlay; ctx: StageCtx }) {
  const shown = o.exit > 0 ? 1 - o.exit : o.enter;
  const memo = o.capture.kind === 'voice';
  return (
    // With reduce motion a bubble appears and leaves in place: no height easing in or out (RR18, audit 12).
    <View style={[styles.wrap, !ctx.reduceMotion && { maxHeight: shown * 170 }]} pointerEvents="box-none">
      <View
        style={[
          styles.bubble,
          { borderLeftColor: memo ? COLORS.voice : COLORS.text, opacity: o.enter * (1 - o.exit) },
          !ctx.reduceMotion && { transform: [{ translateY: (1 - o.enter) * 10 - o.exit * 12 }, { scale: 0.96 + 0.04 * o.enter }] },
        ]}
      >
        {memo ? (
          <MemoBubble o={o} ctx={ctx} />
        ) : (
          <Pressable
            testID="replay-note"
            accessibilityRole="button"
            accessibilityLabel={`Note, ${timeOf(o.capture.t)}: ${plainNote(o.capture.body) ?? ''}`}
            accessibilityHint="Opens the note"
            onPress={() => ctx.open([o.capture])}
          >
            <Text style={styles.text} numberOfLines={6}>{plainNote(o.capture.body)}</Text>
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
  memoBody: { gap: 2 },
  // 44 pt: on an iPhone it is the only way to hear a memo, and hitSlop does nothing on the web (audit 27).
  play: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.voice, alignItems: 'center', justifyContent: 'center' },
  wave: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 24 },
  bar: { width: 3, borderRadius: 2 },
  waveSkeleton: { width: BARS * 5 - 2, height: 16, marginVertical: 4, borderRadius: 4 },
});
