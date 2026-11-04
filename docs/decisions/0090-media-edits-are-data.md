# 0090. Photo and video edits are data on the original, rendered into one file when saved out

Date: 2026-11-04 · Status: accepted · Area: captures, media

## Context
Photos could carry a caption (decision 0012); nothing else could be changed, and videos couldn't even carry that. The owner asked for the basic edits any photo app has, from Expo or a well-supported library. The investigation (Nov 4) found:
- expo-image-manipulator crops and rotates but has no colour filters;
- react-native-svg's `FeColorMatrix` filters photos on iOS, Android and the web, but not a playing video;
- React Native's CSS `filter` is off on iOS behind an experimental flag;
- Skia would do both, at the cost of a new native dependency and a multi-MB web download;
- no Expo module re-encodes a video.

## Decision
The owner's calls, Nov 4:
- **Edits are data.** Rotate, crop, filter, drawing, caption and trim are stored with the capture. The file is never changed, and saving out renders everything into one file.
- **Stay in React Native**, with react-native-svg and expo-image-manipulator. No Skia.
- **Saving out includes everything, videos too.** A local Expo module (Swift on AVFoundation, Kotlin on Media3 Transformer) makes the video on phones; the web re-records it through a canvas and MediaRecorder.
- **Filters are fixed presets**, the set people expect from their phone's photo app: Original, Vivid, Warm, Cool, Dramatic, Fade, Mono, Noir and Sepia. Each is one colour matrix.
- **Videos get everything but filters**, so a video looks the same on every platform.
- **Drawing follows the iPhone's Markup:** Pen, Marker and Eraser, three thicknesses, Black, White, Blue, Green, Yellow and Red, Undo and Redo.
- **Editing happens in one Edit screen with a tool row**, opened from the viewer and from an Edit pill shown for 6 s after every photo or video on the three places that take them. The editor never opens by itself.
- **Previews show the edits but not the caption.**

## Consequences
- The spec is `specs/media-editing/spec.md` (ME1-ME23); the plan is `specs/media-editing/plan.md`.
- `Capture.edit` is truth: SQLite migration 17. IndexedDB stores the record whole, so it needs no version bump. The small copy is remade after an edit (cache).
- Supersedes nothing. 0012 still holds, and captions now also reach other open views through the capture bus.
- Native (the SVG filters, the baker over SVG, video transforms and the local module) has never run on a device: `docs/NATIVE_UNVERIFIED.md`.
