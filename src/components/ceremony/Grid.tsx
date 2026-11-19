import { StyleSheet, View } from 'react-native';
import { gridLayout } from '../../lib/ceremony/grid';
import { overlayOf, type StageLive } from '../../lib/ceremony/live';
import type { CardOverlay } from '../../lib/ceremony/types';
import { MomentPicture } from '../chronicle/MomentPicture';
import type { StageCtx } from './layout';
import { useLiveStyle } from './useLive';

const GAP = 4;

/** A piece's cell: it swipes in as the frame says, written on it frame by frame (replay ceremony RC7). */
function GridCell({ live, card, index, still, width, height, children }: { live: StageLive; card: string; index: number; still: boolean; width: number; height: number; children: React.ReactNode }) {
  const swipe = useLiveStyle(live, (f) => {
    const now = overlayOf(f, 'card', card);
    if (!now) return null;
    const u = still || now.fade ? 1 : (now.shown?.[index] ?? 1);
    return { opacity: u, translateX: (1 - u) * 18 };
  });
  return (
    <View ref={swipe} testID="grid-cell" style={{ width, height }}>
      {children}
    </View>
  );
}

/**
 * A stack's grid in its replay card (moment stacks MS17, decision 0123): its photos, the closest square up to 3×3,
 * each picture cropped to fill its cell, each swiping in a beat after the one before, the grid held, and past nine it
 * scrolls slowly through the hold (the frame's `shown` and `scroll`). Its cells are square, but in a moment with
 * videos, where `height` gives it the room of the pictures that play in turn after it and its cells fill that
 * (replay ceremony RC37). No video plays in a cell. No dots, numbers, position or progress bar: the pieces are the
 * content.
 */
export function StackGrid({ o, ctx, width, height }: { o: CardOverlay; ctx: StageCtx; width: number; height?: number }) {
  const pieces = o.pieces ?? [];
  const g = gridLayout(pieces.length);
  const cell = (width - GAP * (g.cols - 1)) / g.cols;
  const tall = height != null ? (height - GAP * (g.rows - 1)) / g.rows : cell;
  const windowH = g.rows * tall + GAP * (g.rows - 1);
  const totalRows = Math.ceil(pieces.length / g.cols);
  const totalH = totalRows * tall + GAP * (totalRows - 1);
  // The frame says how far each piece has swiped in and how far the grid has scrolled (the rhythm's timing): each is
  // written on its own element as the frames come, and the grid itself never renders as time passes.
  const { live } = ctx;
  const key = o.key;
  const span = g.scrolls ? totalH - windowH : 0;
  const scroll = useLiveStyle(live, (f) => {
    const now = overlayOf(f, 'card', key);
    return now ? { translateY: -(now.scroll ?? 0) * span } : null;
  });
  return (
    <View testID="replay-grid" style={{ width, height: windowH, overflow: 'hidden' }} pointerEvents="none" accessible={false}>
      <View ref={scroll} style={[styles.wrap, { width }]}>
        {pieces.map((p, i) => (
          <GridCell key={p.piece_id} live={live} card={key} index={i} still={ctx.reduceMotion} width={cell} height={tall}>
            <MomentPicture capture={p} style={{ width: cell, height: tall }} />
          </GridCell>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
});
