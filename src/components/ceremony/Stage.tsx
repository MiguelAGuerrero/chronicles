import { createElement, useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Overlay, OverlayKind } from '../../lib/ceremony/types';
import { perfCount } from '../../lib/perfCount';
import { theme } from '../ui';
import { DATE_TOP, dateOf, heldShown, topRow, type StageCtx } from './layout';
import { OVERLAY_ORDER, OVERLAYS, UNDER_SCRIM } from './overlays';
import { RollingClock } from './RollingClock';
import { useLive, useLiveStyle } from './useLive';

/**
 * Draws the frame on stage, of any ceremony, over the map (RR21): the clock and the line under it, "Paused", and the
 * overlays by kind. It knows nothing of how a ceremony decides what a frame holds. A break never dims the map: it is
 * crossed on the map itself (replay ceremony RC17); under a card the map, and the pictures standing on it, darken by
 * what the frame says (RC35). On the last view it shows the day walked (RC26).
 *
 * It reads the frame from `ctx.live`, where the replay's loop puts one every frame (replay ceremony RC7), and renders
 * only when an overlay arrives or leaves, the stack holds or shows something else, or the telling is rebuilt. What moves every frame is each leaf's own to
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
  const drawn = (kind: OverlayKind) => {
    const items = frame.overlays.filter((o: Overlay) => o.kind === kind);
    if (!items.length) return null;
    // Each view takes the overlays of its own kind.
    return createElement(OVERLAYS[kind] as (p: { items: Overlay[]; ctx: StageCtx }) => React.ReactNode, { key: kind, items, ctx });
  };
  return (
    <>
      {OVERLAY_ORDER.filter((kind) => UNDER_SCRIM.includes(kind)).map(drawn)}
      <Scrim ctx={ctx} />
      {OVERLAY_ORDER.filter((kind) => !UNDER_SCRIM.includes(kind)).map(drawn)}
      <View pointerEvents="none" style={[styles.top, { top: ctx.insets.top + 12 }]}>
        <Clock ctx={ctx} />
        <Lines ctx={ctx} />
      </View>
      <DateLine ctx={ctx} />
    </>
  );
}

/**
 * The scrim under a card (replay ceremony RC35): ink over the map and what stands on it, as strong as the frame says, a
 * fifth at the most; written frame by frame, never rendered. Taps go through it, to the stage.
 */
function Scrim({ ctx }: { ctx: StageCtx }) {
  const shade = useLiveStyle(ctx.live, (f) => ({ opacity: f.scrim }));
  return <View ref={shade} testID="replay-scrim" pointerEvents="none" style={[StyleSheet.absoluteFill, styles.scrim]} />;
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
 * The day walked, on the last view (replay ceremony RC26): where the clock stood, between Pause and Skip, in body ink no
 * larger than body text and always one line (`dateOf` words it for the room). The clock has faded out before it
 * comes. It renders when the day comes or goes; its coming in is written on it frame by frame.
 */
function DateLine({ ctx }: { ctx: StageCtx }) {
  const day = useLive(ctx.live, (f) => f?.date ?? null);
  const fade = useLiveStyle(ctx.live, (f) => ({ opacity: f.dateOpacity }));
  // What the top row leaves between its buttons (`replay-ceremony ui 10`): less beside the longer "Skip to end".
  const room = topRow(ctx.width).room;
  return day == null ? null : (
    <View pointerEvents="none" style={[styles.dateRow, { top: ctx.insets.top + DATE_TOP }]}>
      <Text ref={fade} testID="replay-date" accessibilityLiveRegion="polite" numberOfLines={1} style={[styles.date, { maxWidth: room }]}>{dateOf(day, room)}</Text>
    </View>
  );
}

/** The line under the clock ("43 min later", a passed place) and "Paused": the words by render, the line's fade by itself. */
function Lines({ ctx }: { ctx: StageCtx }) {
  const line = useLive(ctx.live, (f) => f?.line ?? null);
  const fade = useLiveStyle(ctx.live, (f) => ({ opacity: f.lineOpacity }));
  return (
    <>
      {line ? (
        // Between Pause and the controls at the right: a passed place's line can be long (RY21).
        <Text ref={fade} testID="replay-later" style={[styles.line, { maxWidth: topRow(ctx.width).room }]}>{line}</Text>
      ) : null}
      {heldShown(ctx.held, line) ? (
        <Text testID="replay-held" accessibilityLiveRegion="polite" style={styles.held}>Paused · tap to play</Text>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: theme.ink },
  date: { color: theme.ink, fontSize: 15, lineHeight: 20, fontWeight: '600', backgroundColor: theme.glass, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, overflow: 'hidden', textAlign: 'center' },
  dateRow: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  // The clock's own height (`lib/ceremony/room` STACK_TOP counts it): kept while it is not drawn.
  clockRoom: { height: 36 },
  top: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 8 },
  line: { backgroundColor: theme.ink, color: theme.surface, fontSize: 12, fontWeight: '600', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14, overflow: 'hidden', textAlign: 'center' },
  held: { backgroundColor: theme.glass, color: theme.ink, fontSize: 12, fontWeight: '600', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
});
