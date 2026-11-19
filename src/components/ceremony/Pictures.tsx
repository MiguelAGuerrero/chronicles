import { Pressable, StyleSheet, View } from 'react-native';
import { overlayOf } from '../../lib/ceremony/live';
import type { Frame, PictureOverlay } from '../../lib/ceremony/types';
import { webData } from '../edit/EditedPhoto';
import { theme } from '../ui';
import { PICTURE, picturePose, pictureTaps, type StageCtx } from './layout';
import { Still } from './Still';
import { useLive, useLiveStyle } from './useLive';

/**
 * One moment's picture standing at its place on the map (replay ceremony RC28, RC34): a small frame on a short stalk,
 * its foot on the place. Where it stands as the camera moves, whether a later one covers it, and its layered edge are
 * written on it frame by frame from the frame's camera (`picturePose`); no map listener, no render as time passes.
 * `o` is the picture as it came to stand, read only for what never moves (its moment, whether it is a video).
 *
 * It is a control (`replay-ceremony ui 1`, the UI review's U1): a tap opens its moment in the viewer, the replay
 * holding until the viewer closes, as the stack's does. Its target is 44 pt around the tile. Whether it takes the tap
 * is one flag read from the frame (`pictureTaps`: not under a later picture, not under a card), so the picture
 * renders when that changes and at no other time; a tap it does not take goes on to what lies under it.
 */
function Standing({ o, ctx, index }: { o: PictureOverlay; ctx: StageCtx; index: number }) {
  const key = o.key;
  // The pictures come first in a frame, in the order they came to stand: this one is where it was, or is looked up.
  const now = (f: Frame) => {
    const at = f.overlays[index];
    return at && at.kind === 'picture' && at.key === key ? at : overlayOf(f, 'picture', key);
  };
  const pose = useLiveStyle(ctx.live, (f) => {
    const p = now(f);
    // Placed by the camera, or, where the map is not the camera's to hold (reduce motion), by where it stands.
    return p ? picturePose(p, ctx, f.camera.center ? f.camera : f.still ?? f.camera) : null;
  });
  const edge = useLiveStyle(ctx.live, (f) => {
    const p = now(f);
    return p ? { opacity: p.layered ? 1 : 0 } : null;
  });
  const taps = useLive(ctx.live, (f) => {
    const p = f ? now(f) : null;
    return !!f && !!p && pictureTaps(f, p, ctx);
  });
  return (
    <View ref={pose} testID="replay-picture" pointerEvents="box-none" {...webData({ key })} style={styles.standing}>
      <View ref={edge} testID="picture-edge" pointerEvents="none" style={styles.under} />
      <View pointerEvents="none" style={styles.stalk} />
      <View pointerEvents="none" style={styles.frame}>
        <View style={styles.picture}>
          <Still capture={o.capture} mark={8} />
        </View>
      </View>
      <Pressable
        testID="picture-open"
        accessibilityRole="button"
        accessibilityLabel="Open this moment"
        accessibilityHint="Opens it full screen; the replay holds until you close it"
        // One under a later picture or under a card is no control: not to a finger, not to a screen reader.
        disabled={!taps}
        pointerEvents={taps ? 'auto' : 'none'}
        accessibilityElementsHidden={!taps}
        importantForAccessibility={taps ? 'yes' : 'no-hide-descendants'}
        onPress={() => ctx.open([o.capture])}
        style={styles.hit}
      />
    </View>
  );
}

/**
 * The pictures the replay leaves standing on the map (RC34): drawn by the stage over the map, never by the map's own
 * pins, which wait for the card and are unchanged on every other map (0154). The stage renders this when another one
 * comes to stand; which of two close together shows is each picture's own to write.
 */
export function Pictures({ items, ctx }: { items: PictureOverlay[]; ctx: StageCtx }) {
  return (
    <>
      {items.map((o, i) => (
        <Standing key={o.key} o={o} ctx={ctx} index={i} />
      ))}
    </>
  );
}

const STALK = PICTURE.lift - PICTURE.size / 2;
/** How far the control reaches past the tile on each side. */
const REACH = (PICTURE.hit - PICTURE.size) / 2;

const styles = StyleSheet.create({
  // From the frame's top to the place its stalk stands on.
  standing: { position: 'absolute', width: PICTURE.size, height: PICTURE.size + STALK },
  // The control: 44 pt around the 36 px tile, over all the picture draws.
  hit: { position: 'absolute', left: -REACH, top: -REACH, width: PICTURE.hit, height: PICTURE.hit, borderRadius: 6 },
  frame: {
    position: 'absolute', left: 0, top: 0, width: PICTURE.size, height: PICTURE.size, backgroundColor: theme.surface, borderRadius: 4, padding: 2,
    shadowColor: theme.ink, shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 3,
  },
  picture: { flex: 1, borderRadius: 2, overflow: 'hidden', backgroundColor: theme.line },
  stalk: { position: 'absolute', left: PICTURE.size / 2 - 1.5, top: PICTURE.size - 1, width: 3, height: STALK + 1, backgroundColor: theme.surface, borderRadius: 1.5 },
  // A second edge showing under the frame: a moment of several pieces, or one standing over an earlier picture.
  under: {
    position: 'absolute', left: -3, top: -3, width: PICTURE.size, height: PICTURE.size, backgroundColor: theme.surface, borderRadius: 4, transform: [{ rotate: '-6deg' }],
    shadowColor: theme.ink, shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },
});
