import { StyleSheet, Text } from 'react-native';
import type { WhisperOverlay } from '../../lib/ceremony/types';
import { theme } from '../ui';
import { project, type StageCtx } from './layout';

const WIDTH = 180;

/** A place passed without stopping, said beside it as the walker goes by (RR15). Without a following map, under the clock. */
export function Whispers({ items, ctx }: { items: WhisperOverlay[]; ctx: StageCtx }) {
  return (
    <>
      {items.map((w) => {
        const p = project(ctx, w.at);
        const right = !p || p[0] < ctx.width / 2;
        const left = p ? Math.min(ctx.width - WIDTH - 8, Math.max(8, right ? p[0] + 10 : p[0] - 10 - WIDTH)) : (ctx.width - WIDTH) / 2;
        const top = p ? Math.min(ctx.height - 120, Math.max(ctx.insets.top + 100, p[1] - 30)) : ctx.insets.top + 100;
        return (
          <Text
            key={w.key}
            testID="replay-whisper"
            accessibilityLiveRegion="polite"
            style={[styles.whisper, { left, top, opacity: w.opacity, textAlign: p ? (right ? 'left' : 'right') : 'center' }]}
          >
            {w.text}
          </Text>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  whisper: {
    position: 'absolute', width: WIDTH, fontSize: 13, lineHeight: 17, fontStyle: 'italic', color: theme.ink,
    textShadowColor: 'rgba(255,255,255,0.95)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 0 },
  },
});
