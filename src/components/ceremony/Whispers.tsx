import { StyleSheet, Text, View } from 'react-native';
import { overlayOf, stackUp } from '../../lib/ceremony/live';
import type { PassedOverlay, WhisperOverlay } from '../../lib/ceremony/types';
import { theme } from '../ui';
import { PASSED, passedDot, passedPose, passedWidth, WHISPER, whisperPose, type StageCtx } from './layout';
import { useLive, useLiveStyle } from './useLive';

/**
 * One passed place's line, on a ground of its own (`replay-ceremony ui 5`: text over a map needs one, V4, X1), lighter
 * than the name the last view gives the same place. Where its room stands under its place (or over it) as the camera
 * moves, short of the stack while that is up (ui 3), and its fade, are written on it frame by frame (`whisperPose`,
 * replay ceremony RC7); its words sit at the edge of the room nearer the place. Beside a way that runs up or down the
 * screen (`w.beside`, ui 13) its room is that wide, at the line's left, and its words are at the room's right edge.
 */
function Whisper({ w, ctx }: { w: WhisperOverlay; ctx: StageCtx }) {
  const key = w.key;
  // Under its place (and under the clock, where no camera places it) the words hang from the room's top; over it,
  // they stand on its foot; beside the line they are level with the place, at the edge by the line.
  const over = w.above && !ctx.reduceMotion;
  const beside = ctx.reduceMotion ? undefined : w.beside;
  const pose = useLiveStyle(ctx.live, (f) => {
    const now = overlayOf(f, 'whisper', key);
    return now ? whisperPose(now, ctx, f.camera, stackUp(f)) : null;
  });
  return (
    <View
      ref={pose}
      // A tap on it holds the replay like any tap on the stage (audit 37).
      pointerEvents="none"
      // Under the clock until its first frame is written on it, before it is seen; and where no camera places it.
      style={[
        styles.said,
        { left: (ctx.width - WHISPER.width) / 2, top: ctx.insets.top + 100, justifyContent: over ? 'flex-end' : 'flex-start' },
        beside != null && { width: beside, alignItems: 'flex-end', justifyContent: 'center' },
      ]}
    >
      <Text testID="replay-whisper" accessibilityLiveRegion="polite" style={styles.whisper}>{w.text}</Text>
    </View>
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
  // Its room ends short of the stack while that is up (replay-ceremony ui 3): one flag, so it renders if the stack comes or goes.
  const stack = useLive(ctx.live, stackUp);
  const pose = useLiveStyle(ctx.live, (f) => {
    const now = overlayOf(f, 'passed', key);
    // By the camera, or, where the map is not the camera's to hold (reduce motion), by where it stands.
    return now ? passedPose(now, ctx, f.camera.center ? f.camera : f.still ?? f.camera, above, index, stackUp(f)) : null;
  });
  const dot = useLiveStyle(ctx.live, (f) => {
    const now = overlayOf(f, 'passed', key);
    return now ? passedDot(now, ctx, f.camera.center ? f.camera : f.still ?? f.camera) : null;
  });
  return (
    <>
      <View ref={dot} testID="replay-passed-dot" pointerEvents="none" style={styles.dot} />
      <View ref={pose} pointerEvents="none" style={[styles.room, { width: passedWidth(ctx, stack), justifyContent: above ? 'flex-end' : 'flex-start' }]}>
        <Text testID="replay-passed" accessibilityLiveRegion="polite" style={styles.passed}>{o.text}</Text>
      </View>
    </>
  );
}

/**
 * The places passed without stopping, named on the walk's last view (RC25): each beside its place, over it or under
 * as the telling says (`lib/ceremony/said` `lastNames`: of two the more northern over its place, so two close
 * together keep their own room); more than two, or those with no room beside their places, are one line clear of the
 * walk (`replay-ceremony ui 14`).
 */
export function PassedNames({ items, ctx }: { items: PassedOverlay[]; ctx: StageCtx }) {
  return (
    <>
      {items.map((o, i) => (
        <PassedName key={o.key} o={o} ctx={ctx} above={o.above} index={i} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  passed: { color: theme.ink, fontSize: 15, lineHeight: 20, fontWeight: '600', textAlign: 'center', backgroundColor: theme.glass, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4, overflow: 'hidden', flexGrow: 0, flexShrink: 0 },
  room: { position: 'absolute', height: PASSED.height, alignItems: 'center' },
  dot: { position: 'absolute', width: PASSED.dot, height: PASSED.dot, borderRadius: PASSED.dot / 2, backgroundColor: theme.surface, borderWidth: 2, borderColor: theme.ink },
  said: { position: 'absolute', width: WHISPER.width, height: WHISPER.height, alignItems: 'center' },
  whisper: { color: theme.ink, fontSize: 13, lineHeight: 17, fontStyle: 'italic', fontWeight: '500', textAlign: 'center', backgroundColor: theme.glass, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden', flexGrow: 0, flexShrink: 0 },
});
