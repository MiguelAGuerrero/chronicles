import { Image } from 'expo-image';
import type { StyleProp, ViewStyle, ImageStyle } from 'react-native';

/**
 * Every picture the app shows on screen (pictures through expo-image, EI1-EI5): a moment's photo or a video's still,
 * a pin's small copy, a gallery tile, the replay's cards, stack and pictures on its map, a memory preview, a reminder card.
 *
 * - Kept, decoded, in memory and on disk once drawn (EI2): React Native's `Image` decoded the file again on every mount.
 * - No transition (EI4): a picture appears as it always did (VISION, Always: restraint in motion).
 * - `fit` is what `resizeMode` was (EI5); `recyclingKey` keys a list cell's picture to what it shows (EI3).
 * - The web draws an `<img>` (its `object-fit` the fit), where React Native's was a `div` with a background.
 *
 * Not for the off-screen baker (`Baker.native.tsx`) or an edited photo (`EditedPicture`, an SVG image).
 */
export function Picture(props: {
  uri: string;
  fit: 'cover' | 'contain';
  style?: StyleProp<ImageStyle | ViewStyle>;
  testID?: string;
  recyclingKey?: string;
  accessibilityIgnoresInvertColors?: boolean;
  pointerEvents?: 'none' | 'auto' | 'box-none' | 'box-only';
  onLoad?: () => void;
  onError?: () => void;
}) {
  return (
    <Image
      source={{ uri: props.uri }}
      contentFit={props.fit}
      cachePolicy="memory-disk"
      recyclingKey={props.recyclingKey}
      style={props.style as StyleProp<ImageStyle>}
      testID={props.testID}
      accessibilityIgnoresInvertColors={props.accessibilityIgnoresInvertColors}
      pointerEvents={props.pointerEvents}
      onLoad={props.onLoad ? () => props.onLoad?.() : undefined}
      onError={props.onError ? () => props.onError?.() : undefined}
    />
  );
}
