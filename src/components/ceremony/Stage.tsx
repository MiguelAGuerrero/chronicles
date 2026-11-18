import { createElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Frame, Overlay } from '../../lib/ceremony/types';
import { theme } from '../ui';
import { heldShown, STAGE_SIDE, type StageCtx } from './layout';
import { OVERLAY_ORDER, OVERLAYS } from './overlays';
import { RollingClock } from './RollingClock';

/**
 * Draws one frame of any ceremony over the map (RR21): the dim of a cut, the
 * clock and the line under it, "Held", and the overlays by kind. It knows
 * nothing of how a ceremony decides what a frame holds.
 */
export function Stage({ frame, ctx }: { frame: Frame; ctx: StageCtx }) {
  return (
    <>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.dim, { opacity: frame.dim }]} />
      {OVERLAY_ORDER.map((kind) => {
        const items = frame.overlays.filter((o: Overlay) => o.kind === kind);
        if (!items.length) return null;
        // Each view takes the overlays of its own kind.
        return createElement(OVERLAYS[kind] as (p: { items: Overlay[]; ctx: StageCtx }) => React.ReactNode, { key: kind, items, ctx });
      })}
      <View pointerEvents="none" style={[styles.top, { top: ctx.insets.top + 12 }]}>
        {frame.clock != null && <RollingClock time={frame.clock} still={ctx.reduceMotion} />}
        {frame.line ? (
          // Between Hold and the controls under Skip: a passed place's line can be long (RY21).
          <Text testID="replay-later" style={[styles.line, { opacity: frame.lineOpacity, maxWidth: Math.max(120, ctx.width - 2 * STAGE_SIDE) }]}>{frame.line}</Text>
        ) : null}
        {heldShown(ctx.held, frame.line) ? (
          <Text testID="replay-held" accessibilityLiveRegion="polite" style={styles.held}>Held · tap to go on</Text>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  dim: { backgroundColor: theme.ink },
  top: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 8 },
  line: { backgroundColor: theme.ink, color: theme.surface, fontSize: 12, fontWeight: '600', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14, overflow: 'hidden', textAlign: 'center' },
  held: { backgroundColor: theme.glass, color: theme.ink, fontSize: 12, fontWeight: '600', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
});
