import type { Faced } from '../../lib/moment';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import type { PileOverlay } from '../../lib/ceremony/types';
import { THUMB } from '../../lib/thumbPlan';

import { useMediaUri } from '../../lib/useMediaUri';
import { COLORS } from '../map/types';
import { Icon } from '../icons';
import { VideoMark } from '../VideoMark';
import { theme } from '../ui';
import { PILE, pileCenter, tiltOf, type StageCtx } from './layout';

/** A photo's small copy where it has one (a map never decodes full photos; nor does the pile). */
const small = (c: Faced): Faced => (c.kind === 'photo' && c.thumb_path && c.thumb_path !== THUMB.none ? { ...c, file_path: c.thumb_path } : c);
/** A video's still, or nothing: the pile never loads a video's file for its card (VT3, VT5). */
const still = (c: Faced): Faced | null => (c.kind === 'video' && c.thumb_path && c.thumb_path !== THUMB.none ? { ...c, file_path: c.thumb_path } : null);

function Thumb({ capture }: { capture: Faced }) {
  const uri = useMediaUri(capture.kind === 'photo' ? small(capture) : still(capture));
  return (
    <View style={[styles.thumb, { transform: [{ rotate: `${tiltOf(capture.id)}deg` }] }]}>
      {uri ? (
        <View style={styles.img}>
          <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors />
          {capture.kind === 'video' ? <VideoMark size={10} style={styles.mark} /> : null}
        </View>
      ) : (
        <View style={[styles.img, styles.video]}>
          <Icon name="videocam" size={18} color={theme.surface} />
        </View>
      )}
    </View>
  );
}

/** The photos and videos so far, the last three dropped in a pile; no count (RR11, RR19). A tap opens them (RR13). */
export function Pile({ items, ctx }: { items: PileOverlay[]; ctx: StageCtx }) {
  const captures = items[0]?.captures ?? [];
  if (!captures.length) return null;
  const [cx, cy] = pileCenter(ctx);
  return (
    <Pressable
      testID="replay-pile"
      accessibilityRole="button"
      accessibilityLabel="The photos and videos so far"
      accessibilityHint="Opens them full screen; the replay holds until you close them"
      // Newest first: the one just tucked away (audit 7).
      onPress={() => ctx.open([...captures].reverse())}
      style={[styles.pile, { left: cx - PILE.w / 2, top: cy - PILE.h / 2 }]}
    >
      {captures.slice(-3).map((c) => (
        <Thumb key={c.id} capture={c} />
      ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pile: { position: 'absolute', width: PILE.w, height: PILE.h },
  thumb: {
    position: 'absolute', left: 4, top: 4, width: PILE.thumb, backgroundColor: theme.surface, paddingTop: 3, paddingHorizontal: 3, paddingBottom: 9, borderRadius: 3,
    shadowColor: theme.ink, shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  img: { width: '100%', aspectRatio: 4 / 5, overflow: 'hidden' },
  mark: { position: 'absolute', right: 3, bottom: 3 },
  video: { backgroundColor: COLORS.video, alignItems: 'center', justifyContent: 'center' },
});
