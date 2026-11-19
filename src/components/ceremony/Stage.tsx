import { createElement, useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Overlay } from '../../lib/ceremony/types';
import { perfCount } from '../../lib/perfCount';
import { theme } from '../ui';
import { DATE_TOP, dateOf, heldShown, STAGE_SIDE, type StageCtx } from './layout';
import { OVERLAY_ORDER, OVERLAYS } from './overlays';
import { RollingClock } from './RollingClock';
import { useLive, useLiveStyle } from './useLive';

/**
 * Draws the frame on stage, of any ceremony, over the map (RR21): the clock and the line under it, "Held", and the
 * overlays by kind. It knows nothing of how a ceremony decides what a frame holds. Nothing here dims the map: a break
 * is crossed on the map itself (replay ceremony RC17). On the last view it shows the day walked (RC26).
 *
 * It reads the frame from `ctx.live`, where the replay's loop puts one every frame (replay ceremony RC7), and renders
 * only when an overlay arrives or leaves, the pile holds something else, or the telling is rebuilt. What moves every frame is each leaf's own to
 * write (`useLiveStyle`); what a leaf shows is its own to read (`useLive`).
 */
export function Stage({ ctx }: { ctx: StageCtx }) {
  const { live } = ctx;
  // Counted for the e2e and the harness (only when measuring).
  perfCount('render:stage');
  // The frame its shape came with, handed over by the store: a frame read here from the store would be kept by the
  // React Compiler from the first render on (decision 0207), and the stage would stay empty.
  const frame = useSyncExternalStore(live.subscribe, live.staged, live.staged);
  if (!frame) return null;
  return (
    <>
      {OVERLAY_ORDER.map((kind) => {
        const items = frame.overlays.filter((o: Overlay) => o.kind === kind);
        if (!items.length) return null;
        // Each view takes the overlays of its own kind.
        return createElement(OVERLAYS[kind] as (p: { items: Overlay[]; ctx: StageCtx }) => React.ReactNode, { key: kind, items, ctx });
      })}
      <View pointerEvents="none" style={[styles.top, { top: ctx.insets.top + 12 }]}>
        <Clock ctx={ctx} />
        <Lines ctx={ctx} />
      </View>
      <DateLine ctx={ctx} />
    </>
  );
}

/**
 * The clock, by the minute it shows: it renders when the minute changes, and its digits roll by themselves. Across a
 * break it dissolves from one time to the other (replay ceremony RC19): its fade is written frame by frame, and while
 * it is faded the digits change in place, so nothing rolls through the break.
 */
function Clock({ ctx }: { ctx: StageCtx }) {
  const minute = useLive(ctx.live, (f) => (f?.clock == null ? null : Math.floor(f.clock / 60_000)));
  const dissolving = useLive(ctx.live, (f) => (f?.clockFade ?? 1) < 1);
  // Faded out (before the opening's dive ends, on the last view), it is not drawn: its figures are the one thing on
  // the stage larger than body text (replay ceremony RC26). Its room stays, so nothing under it moves.
  const shown = useLive(ctx.live, (f) => (f?.clockFade ?? 1) > 0);
  const fade = useLiveStyle(ctx.live, (f) => ({ opacity: f.clockFade }));
  if (minute == null) return null;
  return shown ? (
    <View ref={fade} testID="replay-clock-fade">
      <RollingClock time={minute * 60_000} still={ctx.reduceMotion || dissolving} />
    </View>
  ) : (
    <View style={styles.clockRoom} />
  );
}

/**
 * The day walked, on the last view (replay ceremony RC26): where the first beat's headline stood, in body ink no larger
 * than body text. It renders when the day comes or goes; its coming in is written on it frame by frame.
 */
function DateLine({ ctx }: { ctx: StageCtx }) {
  const day = useLive(ctx.live, (f) => f?.date ?? null);
  const fade = useLiveStyle(ctx.live, (f) => ({ opacity: f.dateOpacity }));
  return day == null ? null : (
    <View pointerEvents="none" style={[styles.dateRow, { top: ctx.insets.top + DATE_TOP }]}>
      <Text ref={fade} testID="replay-date" accessibilityLiveRegion="polite" style={styles.date}>{dateOf(day)}</Text>
    </View>
  );
}

/** The line under the clock ("43 min later", a passed place) and "Held": the words by render, the line's fade by itself. */
function Lines({ ctx }: { ctx: StageCtx }) {
  const line = useLive(ctx.live, (f) => f?.line ?? null);
  const fade = useLiveStyle(ctx.live, (f) => ({ opacity: f.lineOpacity }));
  return (
    <>
      {line ? (
        // Between Hold and the controls under Skip: a passed place's line can be long (RY21).
        <Text ref={fade} testID="replay-later" style={[styles.line, { maxWidth: Math.max(120, ctx.width - 2 * STAGE_SIDE) }]}>{line}</Text>
      ) : null}
      {heldShown(ctx.held, line) ? (
        <Text testID="replay-held" accessibilityLiveRegion="polite" style={styles.held}>Held · tap to go on</Text>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  date: { color: theme.ink, fontSize: 15, fontWeight: '600', backgroundColor: theme.glass, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6, overflow: 'hidden', textAlign: 'center' },
  dateRow: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  // The clock's own height (`lib/ceremony/room` STACK_TOP counts it): kept while it is not drawn.
  clockRoom: { height: 36 },
  top: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 8 },
  line: { backgroundColor: theme.ink, color: theme.surface, fontSize: 12, fontWeight: '600', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14, overflow: 'hidden', textAlign: 'center' },
  held: { backgroundColor: theme.glass, color: theme.ink, fontSize: 12, fontWeight: '600', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
});
