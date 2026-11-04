import { Image, Pressable, StyleSheet, View } from 'react-native';
import type { PileOverlay } from '../../lib/ceremony/types';
import { THUMB } from '../../lib/thumbPlan';
import type { Capture } from '../../lib/types';
import { useMediaUri } from '../../lib/useMediaUri';
import { COLORS } from '../map/types';
import { Icon } from '../icons';
import { PILE, pileCenter, tiltOf, type StageCtx } from './layout';

/** A photo's small copy where it has one (a map never decodes full photos; nor does the pile). */
const small = (c: Capture): Capture => (c.kind === 'photo' && c.thumb_path && c.thumb_path !== THUMB.none ? { ...c, file_path: c.thumb_path } : c);

function Thumb({ capture }: { capture: Capture }) {
  const uri = useMediaUri(capture.kind === 'photo' ? small(capture) : null);
  return (
    <View style={[styles.thumb, { transform: [{ rotate: `${tiltOf(capture.id)}deg` }] }]}>
      {capture.kind === 'photo' && uri ? (
        <Image source={{ uri }} style={styles.img} resizeMode="cover" accessibilityIgnoresInvertColors />
      ) : (
        <View style={[styles.img, styles.video]}>
          <Icon name="videocam" size={18} color="#ffffff" />
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
      onPress={() => ctx.open(captures)}
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
    position: 'absolute', left: 4, top: 4, width: PILE.thumb, backgroundColor: '#ffffff', paddingTop: 3, paddingHorizontal: 3, paddingBottom: 9, borderRadius: 3,
    shadowColor: '#000000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  img: { width: '100%', aspectRatio: 4 / 5 },
  video: { backgroundColor: COLORS.video, alignItems: 'center', justifyContent: 'center' },
});
