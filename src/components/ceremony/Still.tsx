import { StyleSheet, View } from 'react-native';
import type { Faced } from '../../lib/moment';
import { THUMB } from '../../lib/thumbPlan';
import { useStill } from '../../lib/thumbs/useStill';
import { useMediaUri } from '../../lib/useMediaUri';
import { Icon } from '../icons';
import { COLORS } from '../map/types';
import { Picture } from '../Picture';
import { theme } from '../ui';
import { VideoMark } from '../VideoMark';

/** A photo's small copy where it has one (a map never decodes full photos; nor does the replay's stack or a picture on its map). */
const small = (c: Faced): Faced => (c.kind === 'photo' && c.thumb_path && c.thumb_path !== THUMB.none ? { ...c, file_path: c.thumb_path } : c);
/** A video's still, or nothing: no video's file is ever loaded for a small picture (VS3, VS5). */
const still = (c: Faced): Faced | null => (c.kind === 'video' && c.thumb_path && c.thumb_path !== THUMB.none ? { ...c, file_path: c.thumb_path } : null);

/**
 * A moment's small picture, filling the box it is put in (replay ceremony RC29, RC34): a photo's small copy, a video's
 * still under its play mark, or, for a video with no still yet, a tile in the video's own colour. Never a player, and
 * it asks for no still itself (VS2): the stack and the pictures on the map are drawn many at once.
 */
export function Still({ capture: row, mark = 10 }: { capture: Faced; mark?: number }) {
  // The row's copy or still, or one made since it was read.
  const capture = useStill(row, { ask: false });
  const uri = useMediaUri(capture.kind === 'photo' ? small(capture) : still(capture));
  return uri ? (
    <View style={StyleSheet.absoluteFill}>
      <Picture uri={uri} style={StyleSheet.absoluteFill} fit="cover" accessibilityIgnoresInvertColors />
      {capture.kind === 'video' ? <VideoMark size={mark} style={styles.mark} /> : null}
    </View>
  ) : (
    <View style={[StyleSheet.absoluteFill, styles.video]}>
      <Icon name="videocam" size={mark + 6} color={theme.surface} />
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { position: 'absolute', right: 2, bottom: 2 },
  video: { backgroundColor: COLORS.video, alignItems: 'center', justifyContent: 'center' },
});
