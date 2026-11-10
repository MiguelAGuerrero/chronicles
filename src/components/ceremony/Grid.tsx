import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { gridLayout } from '../../lib/ceremony/grid';
import type { CardOverlay } from '../../lib/ceremony/types';
import type { Faced } from '../../lib/moment';
import { useMediaUri } from '../../lib/useMediaUri';
import { MomentPicture } from '../chronicle/MomentPicture';
import type { StageCtx } from './layout';

const GAP = 4;

/** Plays or pauses a muted grid video (a player is a mutable native object, never touched in a component body). */
function setPlaying(player: ReturnType<typeof useVideoPlayer>, on: boolean) {
  player.muted = true;
  if (on) player.play();
  else player.pause();
}

/** A video in its cell: muted, playing while the grid holds and the stage is not held (MS17). */
function GridVideo({ piece, play, size }: { piece: Faced; play: boolean; size: number }) {
  const uri = useMediaUri(piece);
  const player = useVideoPlayer(uri ?? null, (p) => {
    p.loop = false;
    p.muted = true;
  });
  useEffect(() => {
    setPlaying(player, play);
  }, [player, play]);
  if (!uri) return <MomentPicture capture={piece} style={{ width: size, height: size }} />;
  return <VideoView player={player} style={{ width: size, height: size }} contentFit="cover" nativeControls={false} pointerEvents="none" />;
}

/**
 * A stack's grid in its replay card (moment stacks MS17, decision 0123): the closest square up to 3×3, each picture
 * cropped to fill its square, each piece swiping in a beat after the one before, the grid held, and past nine it
 * scrolls slowly through the hold (the frame's `shown` and `scroll`). Videos play muted in their cells. No dots, numbers,
 * position or progress bar: the pieces are the content.
 */
export function StackGrid({ o, ctx, width }: { o: CardOverlay; ctx: StageCtx; width: number }) {
  const pieces = o.pieces ?? [];
  const g = gridLayout(pieces.length);
  const cell = (width - GAP * (g.cols - 1)) / g.cols;
  const windowH = g.rows * cell + GAP * (g.rows - 1);
  const totalRows = Math.ceil(pieces.length / g.cols);
  const totalH = totalRows * cell + GAP * (totalRows - 1);
  // The frame says how far each piece has swiped in and how far the grid has scrolled (the rhythm's timing).
  const scroll = g.scrolls ? (o.scroll ?? 0) * (totalH - windowH) : 0;
  const play = o.playing && !ctx.held && !ctx.paused;
  return (
    <View testID="replay-grid" style={{ width, height: windowH, overflow: 'hidden' }} pointerEvents="none" accessible={false}>
      <View style={[styles.wrap, { width, transform: [{ translateY: -scroll }] }]}>
        {pieces.map((p, i) => {
          const u = ctx.reduceMotion || o.fade ? 1 : (o.shown?.[i] ?? 1);
          return (
            <View
              key={p.piece_id}
              testID="grid-cell"
              style={{ width: cell, height: cell, opacity: u, transform: [{ translateX: (1 - u) * 18 }] }}
            >
              {p.kind === 'video' ? <GridVideo piece={p} play={play} size={cell} /> : <MomentPicture capture={p} style={{ width: cell, height: cell }} />}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
});
