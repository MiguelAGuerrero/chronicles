import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon } from './icons';
import { theme } from './ui';

/**
 * The play mark over a video's still (video thumbnails VS4): a white play glyph, and in the gallery the length, on a
 * solid ink ground of its own, edged in white, so it reads over any frame, dark ones too (V4: its own ground, 3:1 and more) and a video never passes
 * for a photo (X3: never colour alone). Decorative: the words around a preview say "Video".
 */
export function VideoMark(props: { length?: string | null; size?: number; style?: StyleProp<ViewStyle>; testID?: string }) {
  const size = props.size ?? 12;
  return (
    <View testID={props.testID ?? 'video-mark'} style={[styles.mark, props.length ? styles.withLength : { width: size + 10, height: size + 10 }, props.style]} accessible={false} pointerEvents="none">
      <Icon name="play" size={size} color="#ffffff" />
      {props.length ? (
        <Text testID="gallery-length" style={styles.length} numberOfLines={1}>
          {props.length}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // A white hairline keeps the ground's edge on a dark frame too (video-thumbnails ui 3; the pin's ring, everywhere).
  mark: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: theme.ink, borderWidth: 1, borderColor: '#ffffff' },
  withLength: { gap: 2, paddingHorizontal: 6, paddingVertical: 2 },
  length: { color: '#ffffff', fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
