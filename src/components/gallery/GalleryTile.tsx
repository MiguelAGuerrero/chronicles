import { memo, useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Tile } from '../../lib/gallery/layout';
import { lengthLabel } from '../../lib/gallery/layout';
import { thumbShown } from '../../lib/thumbPlan';
import { useMediaUri } from '../../lib/useMediaUri';
import { Icon, KIND_ICON } from '../icons';
import { theme } from '../ui';

/** The ground of a tile with no picture: a video's or a memo's, and a photo's while its copy is made. */
export const TILE_GROUND = '#ebe7df';

/**
 * One tile of the gallery (MG4, MG11, MG21): bare. A photo is its small copy, cropped to fill the square or whole
 * inside it; a video or a memo is its kind's glyph and its length. No caption, note, date or place is drawn here:
 * the day's header carries them (the gate). Spoken by `label` (MG15).
 */
export const GalleryTile = memo(function GalleryTile(props: {
  tile: Tile;
  size: number;
  fit: 'cover' | 'contain';
  label: string;
  onPress: (tile: Tile) => void;
  /** A photo with no small copy asks for one (MG11). */
  onWantsThumb: (pieceId: string) => void;
}) {
  const { tile, size } = props;
  const face = tile.face;
  const [copyBroken, setCopyBroken] = useState(false);
  const [broken, setBroken] = useState<string | null>(null);
  const ref = tile.kind === 'photo' ? thumbShown(face, copyBroken) : null;
  const uri = useMediaUri(ref ? { ...face, file_path: ref } : null);
  const wants = tile.kind === 'photo' && !!face.file_path && !face.thumb_path;
  const onWantsThumb = props.onWantsThumb;
  useEffect(() => {
    if (wants) onWantsThumb(tile.key);
  }, [wants, tile.key, onWantsThumb]);
  return (
    <Pressable
      testID="gallery-tile"
      accessibilityRole="button"
      accessibilityLabel={props.label}
      onPress={() => props.onPress(tile)}
      style={({ pressed }) => [styles.tile, { width: size, height: size }, pressed && styles.pressed]}
      {...({ dataSet: { kind: tile.kind, piece: tile.key, moment: tile.momentId, ref: ref ?? '' } } as object)}
    >
      {uri && broken !== uri ? (
        <Image
          testID="gallery-img"
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode={props.fit}
          onError={() => (ref === face.thumb_path && ref !== face.file_path ? setCopyBroken(true) : setBroken(uri))}
        />
      ) : (
        <Icon name={KIND_ICON[tile.kind]} size={Math.min(32, size / 3)} color={theme.muted} />
      )}
      {tile.kind !== 'photo' && tile.lengthMs != null ? (
        <View style={styles.length} accessible={false}>
          {tile.kind === 'video' ? <Icon name="play" size={11} color={theme.ink} /> : null}
          <Text testID="gallery-length" style={styles.lengthText} numberOfLines={1}>
            {lengthLabel(tile.lengthMs)}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  tile: { backgroundColor: TILE_GROUND, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  pressed: { opacity: 0.75 },
  length: { position: 'absolute', right: 5, bottom: 4, flexDirection: 'row', alignItems: 'center', gap: 2 },
  lengthText: { color: theme.ink, fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
