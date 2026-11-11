import { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Block } from '../../lib/gallery/layout';
import { BLOCK_TEXT_H } from '../../lib/gallery/layout';
import { useMediaUri } from '../../lib/useMediaUri';
import { Icon, KIND_ICON } from '../icons';
import { theme } from '../ui';
import { TILE_GROUND } from './GalleryTile';

/**
 * A month or a year (MG19): its title, where in words, and its cover large (the first photo in the Sort's order, else
 * its first piece's glyph). A tap goes one level in: a month to its days, a year to its months.
 */
export const PeriodBlock = memo(function PeriodBlock(props: { block: Block; width: number; coverH: number; fit: 'cover' | 'contain'; onPress: (b: Block) => void }) {
  const { block } = props;
  const cover = block.cover.face;
  const uri = useMediaUri(block.cover.kind === 'photo' ? cover : null);
  return (
    <Pressable
      testID="gallery-block"
      accessibilityRole="button"
      accessibilityLabel={`${block.title}, ${block.coverPlace}`}
      onPress={() => props.onPress(block)}
      style={({ pressed }) => [styles.block, pressed && styles.pressed]}
      {...({ dataSet: { key: block.key, cover: block.cover.key } } as object)}
    >
      <View style={styles.text}>
        <Text testID="gallery-block-title" style={styles.title} accessibilityRole="header" numberOfLines={1}>{block.title}</Text>
        {block.line ? <Text testID="gallery-block-line" style={styles.line} numberOfLines={1}>{block.line}</Text> : null}
      </View>
      <View style={[styles.cover, { width: props.width, height: props.coverH }]}>
        {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode={props.fit} /> : <Icon name={KIND_ICON[block.cover.kind]} size={40} color={theme.muted} />}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  block: { paddingBottom: 12 },
  pressed: { opacity: 0.8 },
  text: { height: BLOCK_TEXT_H, justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 8 },
  title: { color: theme.ink, fontSize: 22, fontWeight: '700' },
  line: { color: theme.muted, fontSize: 14 },
  cover: { backgroundColor: TILE_GROUND, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
