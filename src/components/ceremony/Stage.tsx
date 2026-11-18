import { createElement, useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Overlay } from '../../lib/ceremony/types';
import { perfCount } from '../../lib/perfCount';
import { theme } from '../ui';
import { heldShown, STAGE_SIDE, type StageCtx } from './layout';
import { OVERLAY_ORDER, OVERLAYS } from './overlays';
import { RollingClock } from './RollingClock';
import { useLive, useLiveStyle } from './useLive';

/**
 * Draws the frame on stage, of any ceremony, over the map (RR21): the dim of a cut, the clock and the line under it,
 * "Held", and the overlays by kind. It knows nothing of how a ceremony decides what a frame holds.
 *
 * It reads the frame from `ctx.live`, where the replay's loop puts one every frame (replay ceremony RC7), and renders
 * only when an overlay arrives or leaves or the telling is rebuilt. What moves every frame is each leaf's own to
 * write (`useLiveStyle`); what a leaf shows is its own to read (`useLive`).
 */
export function Stage({ ctx }: { ctx: StageCtx }) {
  const { live } = ctx;
  // Counted for the e2e and the harness (only when measuring).
  perfCount('render:stage');
  useSyncExternalStore(live.subscribe, live.shape, live.shape);
  const dim = useLiveStyle(live, (f) => ({ opacity: f.dim }));
  const frame = live.frame();
  if (!frame) return null;
  return (
    <>
      <View ref={dim} pointerEvents="none" style={[StyleSheet.absoluteFill, styles.dim]} />
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
    </>
  );
}

/** The clock, by the minute it shows: it renders when the minute changes, and its digits roll by themselves. */
function Clock({ ctx }: { ctx: StageCtx }) {
  const minute = useLive(ctx.live, (f) => (f?.clock == null ? null : Math.floor(f.clock / 60_000)));
  return minute == null ? null : <RollingClock time={minute * 60_000} still={ctx.reduceMotion} />;
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
  dim: { backgroundColor: theme.ink },
  top: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 8 },
  line: { backgroundColor: theme.ink, color: theme.surface, fontSize: 12, fontWeight: '600', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14, overflow: 'hidden', textAlign: 'center' },
  held: { backgroundColor: theme.glass, color: theme.ink, fontSize: 12, fontWeight: '600', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
});
