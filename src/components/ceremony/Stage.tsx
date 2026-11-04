import { createElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Frame, Overlay } from '../../lib/ceremony/types';
import { theme } from '../ui';
import type { StageCtx } from './layout';
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
          <Text testID="replay-later" style={[styles.line, { opacity: frame.lineOpacity }]}>{frame.line}</Text>
        ) : null}
        {ctx.held ? (
          <Text testID="replay-held" accessibilityLiveRegion="polite" style={styles.held}>Held · tap to go on</Text>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  dim: { backgroundColor: theme.ink },
  top: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 8 },
  line: { backgroundColor: theme.ink, color: theme.surface, fontSize: 12, fontWeight: '600', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  held: { backgroundColor: theme.glass, color: theme.ink, fontSize: 12, fontWeight: '600', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
});
