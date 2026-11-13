import { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Block } from '../../lib/gallery/layout';
import { BLOCK_TYPE } from '../../lib/gallery/layout';
import { useMediaUri } from '../../lib/useMediaUri';
import { Icon, KIND_ICON } from '../icons';
import { theme } from '../ui';
import { TILE_GROUND } from './GalleryTile';
import { thumbShown } from '../../lib/thumbPlan';
import { useStill } from '../../lib/thumbs/useStill';
import { VideoMark } from '../VideoMark';

/**
 * A month or a year (MG19): its title, where in words, and its cover large (the first photo in the Sort's order, else
 * its first piece's glyph). A tap goes one level in: a month to its days, a year to its months.
 */
export const PeriodBlock = memo(function PeriodBlock(props: { block: Block; width: number; textH: number; coverH: number; fit: 'cover' | 'contain'; onPress: (b: Block) => void }) {
  const { block } = props;
  // A video cover's still is the row's or one made since; a cover lacking one asks for it (video-thumbnails audit 5).
  const cover = useStill(block.cover.face, { ask: block.cover.kind === 'video' });
  // A photo cover is the photo; a video cover (a block with no photo, MG19) is its 720 px still, never its file (VS3, VS5).
  const still = block.cover.kind === 'video' ? thumbShown(cover, false) : null;
  const uri = useMediaUri(block.cover.kind === 'photo' ? cover : still ? { ...cover, file_path: still } : null);
  return (
    <Pressable
      testID="gallery-block"
      accessibilityRole="button"
      accessibilityLabel={`${block.title}, ${block.coverPlace}`}
      onPress={() => props.onPress(block)}
      style={({ pressed }) => [styles.block, pressed && styles.pressed]}
      {...({ dataSet: { key: block.key, cover: block.cover.key } } as object)}
    >
      <View style={[styles.text, { height: props.textH }]}>
        <Text testID="gallery-block-title" style={styles.title} accessibilityRole="header" numberOfLines={1}>{block.title}</Text>
        {block.line ? <Text testID="gallery-block-line" style={styles.line} numberOfLines={1}>{block.line}</Text> : null}
      </View>
      <View style={[styles.cover, { width: props.width, height: props.coverH }]}>
        {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode={props.fit} /> : <Icon name={KIND_ICON[block.cover.kind]} size={40} color={theme.muted} />}
        {uri && block.cover.kind === 'video' ? <VideoMark size={16} style={styles.mark} /> : null}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  block: { paddingBottom: 12 },
  pressed: { opacity: 0.8 },
  // The row's height is made from these numbers (BLOCK_TYPE); neither text may shrink to fit.
  text: { justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: BLOCK_TYPE.padTop, paddingBottom: BLOCK_TYPE.padBottom },
  title: { color: theme.ink, fontSize: BLOCK_TYPE.titleSize, lineHeight: BLOCK_TYPE.titleLine, fontWeight: '700', flexShrink: 0 },
  line: { color: theme.muted, fontSize: BLOCK_TYPE.lineSize, lineHeight: BLOCK_TYPE.lineLine, flexShrink: 0 },
  mark: { position: 'absolute', right: 12, bottom: 12 },
  cover: { backgroundColor: TILE_GROUND, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
