import { Pressable, StyleSheet, View } from 'react-native';
import { overlayOf } from '../../lib/ceremony/live';
import { stackBound } from '../../lib/ceremony/stack';
import type { StackEntry, StackOverlay } from '../../lib/ceremony/types';
import { webData } from '../edit/EditedPhoto';
import { theme } from '../ui';
import { STACK, STAGE_BOTTOM, stackPose, type StageCtx } from './layout';
import { Still } from './Still';
import { useLiveStyle } from './useLive';

/**
 * One moment in the stack: its small picture in a white frame, a second edge under it for a moment of several pieces,
 * a play mark for a video. Where it stands as it lands, gives and drops off is written on it frame by frame
 * (`stackPose`, replay ceremony RC7, RC32); `e` is the entry as it arrived, read only for what never moves.
 */
function Entry({ e, ctx, base }: { e: StackEntry; ctx: StageCtx; base: number }) {
  const key = e.key;
  const pose = useLiveStyle(ctx.live, (f) => {
    const now = overlayOf(f, 'stack', 'stack')?.entries.find((x) => x.key === key);
    return now ? stackPose(now, base) : null;
  });
  return (
    <View ref={pose} testID="stack-entry" {...webData({ key })} style={styles.entry}>
      {e.several ? <View style={styles.under} /> : null}
      <View style={styles.frame}>
        <View style={styles.picture}>
          <Still capture={e.capture} />
        </View>
      </View>
    </View>
  );
}

/**
 * The photos and videos so far, gathered at the right edge: one entry for each moment, the newest on top (replay
 * ceremony RC29). It grows upward, and when one more would reach the controls at the top the oldest drops off the
 * bottom (RC30). It is one control: a tap opens every one so far, the latest first, dropped ones among them, and the
 * replay holds until the viewer closes (RC31, RR13). It draws pictures and marks and no word or figure: its height
 * is the one thing in the path that grows with what was kept (decision 0206).
 *
 * What it holds and which entries the screen shows are part of the stage's shape (`shapeOf`), so the stage renders it
 * when an entry arrives or has dropped off, with the stack as it is then.
 */
export function Stack({ items, ctx }: { items: StackOverlay[]; ctx: StageCtx }) {
  const stack = items[0];
  if (!stack || stack.captures.length === 0) return null;
  const { captures, entries } = stack;
  // As tall as the entries the screen holds: one dropping off sinks out under it.
  const rows = Math.max(1, Math.min(entries.length, stackBound(ctx)));
  const base = (rows - 1) * STACK.pitch;
  return (
    <Pressable
      testID="replay-stack"
      accessibilityRole="button"
      accessibilityLabel="Photos and videos so far"
      accessibilityHint="Opens them full screen; the replay holds until you close them"
      // Newest first: the one that just landed (audit 7).
      onPress={() => ctx.open([...captures].reverse())}
      style={[styles.stack, { right: ctx.insets.right + STACK.right, bottom: ctx.insets.bottom + STAGE_BOTTOM, height: base + STACK.h }]}
    >
      {entries.map((e) => (
        <Entry key={e.key} e={e} ctx={ctx} base={base} />
      ))}
    </Pressable>
  );
}

const FRAME = { side: 3, top: 3, foot: 7 } as const;

const styles = StyleSheet.create({
  stack: { position: 'absolute', width: STACK.w },
  entry: { position: 'absolute', left: 0, width: STACK.w, height: STACK.h },
  frame: {
    width: STACK.w, height: STACK.h, backgroundColor: theme.surface, borderRadius: 3, paddingHorizontal: FRAME.side, paddingTop: FRAME.top, paddingBottom: FRAME.foot,
    shadowColor: theme.ink, shadowOpacity: 0.22, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  picture: { flex: 1, overflow: 'hidden', backgroundColor: theme.line },
  // A moment of several pieces: a second edge showing under the first.
  under: {
    position: 'absolute', left: -3, top: -3, width: STACK.w, height: STACK.h, backgroundColor: theme.surface, borderRadius: 3, transform: [{ rotate: '-5deg' }],
    shadowColor: theme.ink, shadowOpacity: 0.18, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },
});
