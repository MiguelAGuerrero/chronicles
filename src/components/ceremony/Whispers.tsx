import { StyleSheet, Text } from 'react-native';
import { overlayOf } from '../../lib/ceremony/live';
import type { WhisperOverlay } from '../../lib/ceremony/types';
import { theme } from '../ui';
import { WHISPER_WIDTH, whisperPose, type StageCtx } from './layout';
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

const styles = StyleSheet.create({
  whisper: {
    position: 'absolute', width: WHISPER_WIDTH, fontSize: 13, lineHeight: 17, fontStyle: 'italic', color: theme.ink,
    textShadowColor: theme.surface, textShadowRadius: 4, textShadowOffset: { width: 0, height: 0 },
  },
});
