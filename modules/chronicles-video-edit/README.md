# chronicles-video-edit

A local Expo module (autolinked from `./modules`) that renders an edited copy of a
video to MP4: rotate, crop, scale to an exact size, trim, and draw a transparent PNG
(the drawing and caption) over every frame. Audio is kept, trimmed to the same range.

```ts
import { exportEditedVideo, isAvailable } from '../modules/chronicles-video-edit';
```

`isAvailable()` is false where the native module isn't linked (web, Expo Go);
`exportEditedVideo` then rejects. On failure it rejects with a message and deletes
any partial output.

## Transform order

All sizes are pixels. The crop is in the upright-then-rotated frame.

1. **Upright**: the source's own orientation (iOS `preferredTransform`, Android
   rotation metadata).
2. **Rotate** clockwise by `rotate`.
3. **Crop** to `crop`.
4. **Scale** the crop to exactly `out` (stretch; the caller keeps the aspect).
5. **Overlay** the PNG (`out.w` x `out.h`) over the frame.

iOS: `AVMutableComposition` (trim) + `AVMutableVideoComposition` whose layer
instruction transform is preferredTransform, rotation, translate(-crop), scale;
`AVVideoCompositionCoreAnimationTool` for the overlay; `AVAssetExportSession`
(HighestQuality, `.mp4`; `export(to:as:)` on iOS 18+, `exportAsynchronously` before).

Android: Media3 Transformer, `ClippingConfiguration` for the trim, video effects
in order `ScaleAndRotateTransformation`, `Crop` (NDC), `Presentation`
(`LAYOUT_STRETCH_TO_FIT`), `OverlayEffect` with a `BitmapOverlay`. Media3's version
follows expo-video's (see `android/build.gradle`).

## Never compiled or run

Neither side has been compiled or run on a device. Assumptions to check first:

- Media3's `setRotationDegrees` is counterclockwise (we pass `360 - rotate`), and
  Transformer hands effects frames already upright.
- Media3 `Crop` NDC: y runs from -1 at the bottom to 1 at the top.
- iOS overlay: `isGeometryFlipped = true` on the parent layer. If the drawing comes
  out upside down, that is the line to change.
- HDR sources on Android (output keeps the input's codec; overlays on HDR frames
  are untested).
