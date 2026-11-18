import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { gridLayout } from '../../lib/ceremony/grid';
import type { CardOverlay } from '../../lib/ceremony/types';
import type { Trim } from '../../lib/mediaEdit';
import type { Faced } from '../../lib/moment';
import { useMediaUri } from '../../lib/useMediaUri';
import { MomentPicture } from '../chronicle/MomentPicture';
import { seekTo } from '../edit/EditedVideo';
import type { StageCtx } from './layout';

const GAP = 4;

/** Plays or pauses a muted grid video, from where its kept part starts (a player is a mutable native object, never touched in a component body). */
function setPlaying(player: ReturnType<typeof useVideoPlayer>, on: boolean, startS: number) {
  player.muted = true;
  if (!on) {
    player.pause();
    return;
  }
  if (startS > 0 && player.currentTime < startS) seekTo(player, startS);
  player.play();
}

/**
 * A video playing in its cell: muted, while the grid holds and the stage is not held (MS17). A trimmed one plays only
 * its kept part, as its card does (ME15): the grid holds for that long (fix trimmed-length 3), so from the file's start
 * the cell would show the part that was cut.
 */
function CellVideo({ uri, trim, play, size }: { uri: string; trim: Trim | null; play: boolean; size: number }) {
  const startS = (trim?.start_ms ?? 0) / 1000;
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = true;
    if (trim) p.timeUpdateEventInterval = 0.1;
  });
  const [ended, setEnded] = useState(false);
  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    if (trim && currentTime >= trim.end_ms / 1000 - 0.02 && !ended) {
      player.pause();
      setEnded(true);
    }
  });
  // A player asked to seek before it has loaded may not: once ready, it is brought to the start.
  useEventListener(player, 'statusChange', ({ status }) => {
    if (status === 'readyToPlay' && trim && player.currentTime < startS) seekTo(player, startS);
  });
  useEffect(() => {
    setPlaying(player, play && !ended, startS);
  }, [player, play, ended, startS]);
  return <VideoView player={player} style={{ width: size, height: size }} contentFit="cover" nativeControls={false} pointerEvents="none" />;
}

/**
 * A video's cell: its still until its file is at hand, then the player, made with the file (fix trimmed-length 3). A
 * player made empty and given the file afterwards is started by expo-video's web `replace()` whatever the grid says,
 * and its tag is loaded a second time once it draws again, which fails that start with a logged AbortError.
 */
function GridVideo({ piece, play, size }: { piece: Faced; play: boolean; size: number }) {
  const uri = useMediaUri(piece);
  if (!uri) return <MomentPicture capture={piece} style={{ width: size, height: size }} />;
  return <CellVideo key={uri} uri={uri} trim={piece.edit?.trim ?? null} play={play} size={size} />;
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
