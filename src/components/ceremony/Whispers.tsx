import { StyleSheet, Text, View } from 'react-native';
import { overlayOf } from '../../lib/ceremony/live';
import type { PassedOverlay, WhisperOverlay } from '../../lib/ceremony/types';
import { theme } from '../ui';
import { PASSED, passedDot, passedPose, WHISPER_WIDTH, whisperPose, type StageCtx } from './layout';
import { useLiveStyle } from './useLive';

/**
 * One passed place's line. Where it stands beside its place as the camera moves, and its fade, are written on it frame
 * by frame (`whisperPose`, replay ceremony RC7).
 */
function Whisper({ w, ctx }: { w: WhisperOverlay; ctx: StageCtx }) {
  const key = w.key;
  const pose = useLiveStyle(ctx.live, (f) => {
    const now = overlayOf(f, 'whisper', key);
    return now ? whisperPose(now, ctx, f.camera) : null;
  });
  return (
    <Text
      ref={pose}
      testID="replay-whisper"
      // A tap on it holds the replay like any tap on the stage (audit 37).
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      // Under the clock until its first frame is written on it, before it is seen.
      style={[styles.whisper, { left: (ctx.width - WHISPER_WIDTH) / 2, top: ctx.insets.top + 100 }]}
    >
      {w.text}
    </Text>
  );
}

/** A place passed without stopping, said beside it as the walker goes by (RR15). Without a following map, under the clock. */
export function Whispers({ items, ctx }: { items: WhisperOverlay[]; ctx: StageCtx }) {
  return (
    <>
      {items.map((w) => (
        <Whisper key={w.key} w={w} ctx={ctx} />
      ))}
    </>
  );
}

/**
 * One passed place named on the last view (replay ceremony RC25): a mark on the place and its name beside it, in body
 * ink at full strength on a ground of its own. Where they stand as the camera settles, and their coming in, are
 * written on them frame by frame (`passedPose`, `passedDot`).
 */
function PassedName({ o, ctx, above, index }: { o: PassedOverlay; ctx: StageCtx; above: boolean; index: number }) {
  const key = o.key;
  const pose = useLiveStyle(ctx.live, (f) => {
    const now = overlayOf(f, 'passed', key);
    return now ? passedPose(now, ctx, f.camera, above, index) : null;
  });
  const dot = useLiveStyle(ctx.live, (f) => {
    const now = overlayOf(f, 'passed', key);
    return now ? passedDot(now, ctx, f.camera) : null;
  });
  return (
    <>
      <View ref={dot} testID="replay-passed-dot" pointerEvents="none" style={styles.dot} />
      <View ref={pose} pointerEvents="none" style={[styles.room, { justifyContent: above ? 'flex-end' : 'flex-start' }]}>
        <Text testID="replay-passed" accessibilityLiveRegion="polite" style={styles.passed}>{o.text}</Text>
      </View>
    </>
  );
}

/**
 * The places passed without stopping, named on the walk's last view (RC25): each beside its place, the more northern
 * of two over its place and the other under, so two close together keep their own room; more than two are one line
 * under the date.
 */
export function PassedNames({ items, ctx }: { items: PassedOverlay[]; ctx: StageCtx }) {
  const north = items.length > 1 ? Math.max(...items.map((o) => o.at?.[1] ?? -Infinity)) : null;
  return (
    <>
      {items.map((o, i) => (
        <PassedName key={o.key} o={o} ctx={ctx} above={north != null && o.at?.[1] === north && items.findIndex((x) => x.at?.[1] === north) === i} index={i} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  passed: { color: theme.ink, fontSize: 15, lineHeight: 20, fontWeight: '600', textAlign: 'center', backgroundColor: theme.glass, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4, overflow: 'hidden' },
  room: { position: 'absolute', width: PASSED.width, height: PASSED.height, alignItems: 'center' },
  dot: { position: 'absolute', width: PASSED.dot, height: PASSED.dot, borderRadius: PASSED.dot / 2, backgroundColor: theme.surface, borderWidth: 2, borderColor: theme.ink },
  whisper: {
    position: 'absolute', width: WHISPER_WIDTH, fontSize: 13, lineHeight: 17, fontStyle: 'italic', color: theme.ink,
    textShadowColor: theme.surface, textShadowRadius: 4, textShadowOffset: { width: 0, height: 0 },
  },
});
