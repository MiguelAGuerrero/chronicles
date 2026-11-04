# Media editing: plan

For the owner to review before any code.

## Order of the edits

One order everywhere: on screen, in the native baker, in the web canvas and in the video module.

1. **rotate** (0, 90, 180 or 270° clockwise) the original picture;
2. **crop** to a rectangle kept in the original picture's coordinates (fractions), mapped through the rotation;
3. **filter** (photos only) as a colour matrix;
4. **drawing**: lines kept in the original's coordinates, mapped through 1 and 2 and clipped to the crop;
5. **caption** bar, placed against the result (as today).

## Files

### Core (pure, `@layer core`, test first)

- `src/lib/mediaEdit.ts`:
  - the `MediaEdit` type: `{ v: 1, rotate, crop, filter, strokes, trim }`;
  - `FILTERS` (four 4×5 matrices), `applyMatrix`, `PEN_COLORS`, `PEN_WIDTH_FRAC`, `MAX_STROKES`;
  - `parseEdit` / `serializeEdit` / `isEmptyEdit`;
  - `clampCrop`, `aspectCrop`, `editedSize`, `toFrame` (original to edited coordinates, for strokes);
  - `simplifyStroke` (Ramer-Douglas-Peucker, tolerance a fraction of the width);
  - `clampTrim` (at least 1 s), `trimLabel`;
  - `exportPlan` (output size with even sides, at most 1920 px on the long side for video and 1600 px wide for photos on phones; the source rectangle, rotation and overlay size).
- `src/lib/editSession.ts`: the editor's own state as a small reducer (tool, draft edit, draft caption, stroke undo and clear, revert, `changed`), so Done, Discard and "no change writes nothing" are tested without a screen (ME2, ME3).

### Views

- `src/components/edit/EditedPhoto.tsx` (new): one react-native-svg `<Svg>` with a `viewBox` on the crop, a `<G>` rotation, an `<Image>` with an `FeColorMatrix` filter, and the strokes as `<Polyline>`s. `CaptionBar` sits on top. Used by the viewer, the editor and the native baker, so screen and file match. On web it carries `data-edit` for the e2e.
- `src/components/edit/EditedVideo.tsx` (new): the expo-video `VideoView` in a clipping view, rotated and scaled to the crop. The strokes and caption sit in a `pointerEvents="none"` layer over it. Trim is applied with `timeUpdate` and `currentTime` (start at the start, stop and `onFinished` at the end, pull back a seek outside). It takes over `VideoPlayer` in `CaptureView.tsx`, keeping its autoplay and "Tap for sound" handling.
- `src/components/edit/MediaEditor.tsx` (new): the editor with the tool row, Close, Done, Revert, and the discard confirm. It opens on a given tool: Crop from the after-capture pill, the first tool from the viewer. It works two ways: as an overlay inside the viewer, or as a Modal of its own where no viewer is open (Navigate's ready screen, the recording bar).
- `src/components/edit/CropTool.tsx`, `FilterTool.tsx`, `DrawTool.tsx`, `TrimTool.tsx` (new). Built with `PanResponder` and `Animated` only (no Reanimated, decision 0039); timings from `lib/motionTokens`.
- `src/components/Caption.tsx`: the bar-editing part of `CaptionEditor` becomes the Text tool, and `CaptionEditor` itself goes.
- `src/components/CaptureView.tsx`:
  - Edit replaces the caption button;
  - `onSaveCaption` becomes `onSaveEdit(c, { edit, caption, caption_y })`;
  - `CaptureContent` renders `EditedPhoto` / `EditedVideo`;
  - `saveCurrent` bakes edited photos and exports edited videos.
- `src/components/Baker.native.tsx`: renders `EditedPhoto` instead of `Image` plus bar. It gains `bakeOverlay(plan, edit, caption)`: the strokes and caption alone, on a transparent PNG at the video's output size, for the video module.
- `src/components/Baker.web.tsx`:
  - draws rotate and crop with `drawImage`;
  - runs `applyMatrix` over the pixels, the same function the tests check (`ctx.filter` is not dependable in Safari);
  - draws the strokes as canvas paths and the caption as today;
  - gains `bakeOverlay` for video too.
- Screens: `src/app/walk.tsx`, `src/components/walk/useReady.tsx`, `src/app/(tabs)/chronicle.tsx` and `src/app/replay/[id].tsx` pass `onSaveEdit` instead of `onSaveCaption`.
- After capture (ME23):
  - `src/app/walk.tsx`: `justTook` holds photos and videos. The pill's "Aa Caption" becomes "Edit", and the video's toast becomes the same pill;
  - `src/components/MomentBar.tsx` and `src/components/RecordingBar.tsx`: the same 6 s pill after `takePhoto` resolves, opening `MediaEditor` as its own Modal;
  - `src/lib/editOffer.ts` (core): which capture is offered and when the offer ends, so a new capture replaces it and the 6 s is tested once for all three. The timer itself stays in the views.

### Shell and adapters

- `src/lib/useCaptures.ts`: `setCaption` becomes `setEdit(id, { edit, caption, caption_y })`. It writes the row, patches the list, then sends one `captureBus.patch`.
- `src/lib/captureBus.ts`: `CapturePatch` carries `edit`, `caption` and `caption_y`. This also closes DEFERRED item 9 ("captions are not sent on the capture bus").
- `src/lib/media/thumb.ts`: `makeThumb` applies the crop and rotation through the manipulator. A new `remakeThumb(c, bakedUri)` downsizes the edited bake to 240 px and keeps it with `replace` (ME20). The viewer calls it after Done, where the baker is mounted.
- `src/lib/videoEdit/` (new adapter: `index.ts`, `index.native.ts`, `index.web.ts`, `types.ts`): `exportVideo(sourceUri, plan, overlayUri) => outputUri`.
  - Native calls the local module.
  - Web plays the kept part into a canvas (rotate, crop, overlay), records `canvas.captureStream()` plus the video's audio track with `MediaRecorder`, and resolves a Blob URL. Real time: at most 15 s on the web.
- `src/lib/export/index.native.ts` / `index.web.ts`: `saveKeeper` takes the made video like a baked photo. `dropBaked` deletes it after.
- `modules/chronicles-video-edit/` (new local Expo module, found by autolinking from `./modules`):
  - `expo-module.config.json`, `index.ts`;
  - `ios/ChroniclesVideoEditModule.swift`: an `AVMutableComposition` for the trim, an `AVMutableVideoComposition` for rotate, crop and render size, `AVVideoCompositionCoreAnimationTool` for the overlay PNG, and `AVAssetExportSession` to MP4 in the cache. It honours the source's `preferredTransform` (phone videos are often stored sideways);
  - `android/.../ChroniclesVideoEditModule.kt`: Media3 `Transformer` with `ClippingConfiguration` (trim), `ScaleAndRotateTransformation`, `Crop` and `OverlayEffect` with a `BitmapOverlay`, to MP4 in the cache;
  - `android/build.gradle`: `media3-transformer` and `media3-effect` at expo-video's `androidxMedia3Version`, so the app carries one Media3.

### Docs

- `docs/decisions/0084-media-edits-are-data.md`: the calls above.
- `docs/ARCHITECTURE.md`:
  - codemap entries;
  - the data model;
  - "Web exceptions to native first": web video export through canvas and MediaRecorder (no Expo module covers it); the web baker's existing entry extended.
- `docs/PRODUCT.md`, `docs/STATUS.md`, `docs/DEFERRED.md`, `docs/NATIVE_UNVERIFIED.md`.
- `.claude/rules/captures-and-media.md`: its `paths` gain `src/components/edit/**`, `src/lib/mediaEdit.ts`, `src/lib/videoEdit/**` and `modules/**`.

## Data

- **Truth, kept with the capture**: `Capture.edit?: MediaEdit | null`. Edits are what the person decided, so they're truth like a caption: never recomputed and never cleared by a map update.
- **SQLite migration 17**: `ALTER TABLE capture ADD COLUMN edit TEXT`, JSON through `serializeEdit` / `parseEdit` in `db/index.native.ts`, and added to `CAPTURE_COLUMNS` and the insert.
- **IndexedDB**: the record is stored whole, so no `VERSION` bump (as with `thumb_path`).
- **Db contract**: a new case for `updateCapture` with `edit` round-tripping on both stores (`dbContract.ts`).
- **The backup bundle's `walk.json`** keeps `edit` (it's truth). Its media stay the originals.
- **The small copy** (`thumb_path`) is cache: remade after an edit, never patched.

## Tests per criterion

| Id | Test |
|---|---|
| ME1 | e2e `edit`: `viewer-edit` on a photo and a video, no caption button; tool rows differ by kind |
| ME2 | `editSession.test.ts`: `ME2: done with no change writes nothing`, `ME2: close with changes asks first`; e2e: the discard confirm |
| ME3 | `editSession.test.ts`: `ME3: revert clears every edit and the caption`; e2e: reopen shows the current edits |
| ME4 | e2e `edit`: the replay stop's `data-edit` matches the viewer's |
| ME5 | `mediaEdit.test.ts`: `ME5: four quarter turns come back to none`; e2e: the rotate button |
| ME6 | `mediaEdit.test.ts`: `ME6: a crop never leaves the picture or goes under a tenth`, `ME6: aspect crops are centred and fit`; e2e: Square gives a square `data-size` |
| ME7 | `mediaEdit.test.ts`: `ME7: rotating after cropping keeps the same part of the picture` |
| ME8 | e2e `edit`: Black & white, then the saved bake's sampled pixels have r = g = b |
| ME9 | `mediaEdit.test.ts`: `ME9: …` one per preset, plus clamping |
| ME10 | `editSession.test.ts`: `ME10: undo removes the last line, clear removes all`; e2e: a mouse drag adds a stroke in the chosen colour |
| ME11 | `mediaEdit.test.ts`: `ME11: a line stays on its spot through a later crop and rotation`, `ME11: simplify keeps the ends and drops collinear points`, `ME11: no more than 50 lines` |
| ME12 | e2e `edit`: the video's overlay layer has `pointer-events: none` and holds the stroke |
| ME13 | e2e `edit`: text on a video; the walk's `add-caption` opens the editor on Text (the existing caption steps move to it) |
| ME14 | `mediaEdit.test.ts`: `ME14: a trim keeps at least a second`, `ME14: trim label`; e2e: dragging the end handle changes the label |
| ME15 | e2e `edit`: a trimmed video's `currentTime` starts at the start; the replay's video stop finishes at the trimmed end |
| ME16 | e2e `edit`: the downloaded JPEG's size matches the crop and its pixels the filter |
| ME17 | e2e `edit`: the download is a video whose duration is the kept part's (±0.5 s) and which has an audio track |
| ME18 | e2e `edit`: "Saving…" shows; with `MediaRecorder` made to fail, "The video could not be saved" and no download |
| ME19 | `mediaEdit.test.ts`: `ME19: …` even sides, the caps, a rotated source rect |
| ME20 | e2e `edit`: after Done, the pin's preview `src` is a new copy; `mediaEdit`/thumb test for the crop on a lazy remake |
| ME21 | `mediaEdit.test.ts`: `ME21: round trip`, `ME21: bad or newer input reads as none`; `dbContract.ts`: `ME21: updateCapture keeps an edit`; a `captureBus` test that the patch carries the edit |
| ME22 | e2e `edit`: roles and labels on every control |
| ME23 | `editOffer.test.ts`: `ME23: a new capture replaces the offer`, `ME23: the offer ends after 6 s`; e2e `edit`: `capture-edit` after a photo on the walk screen, after a video on Navigate's ready screen and after a photo from the recording bar, each opening the editor on Crop |

There's one e2e journey, `edit` (`E2E_ONLY=edit`). It uses the existing `clip-4s.webm` fixture and a photo fixture. The existing caption checks in the main flow (`add-caption`) move to `capture-edit` and then the editor's Text tool.

## Deferred, and why

- **Filters on video** (the owner's call: no consistent way on iOS without Skia or an experimental flag).
- **A copy remade later only has the crop and rotation**, not the filter or drawing: those need the mounted baker, which only the viewer has. This is rare: it happens only when the copy's file is gone.
- **Screen-reader ways to draw and to drag the crop frame** (ME22).
- **More than one undo step**, redo, other pen widths, text styles and colours, free-placed text, stickers and flip: out of scope by the owner's call.
- **Frames along the trim bar**: the handles show the frame they're on instead.

## Native paths that won't run on a device

All of it is written blind, as every native path in this app so far:

- `FeColorMatrix` on an SVG `Image` on iOS and Android, and its speed on a full-size photo;
- view-shot capturing the SVG;
- the transparent overlay PNG;
- `VideoView` under transforms and clipping;
- trim through `timeUpdate`;
- migration 17;
- the whole local module: Swift and Kotlin, `preferredTransform`, Media3 versions, audio passthrough.

Each goes into `docs/NATIVE_UNVERIFIED.md`. The Kotlin and Swift can't even be compiled here. Typecheck covers only the module's TypeScript face.

## Points to confirm

1. **Edits as data, file untouched** (the recommendation from the investigation; your answers fit it, but you didn't pick it explicitly). The other way, writing a new photo file on Done, would be simpler to show but would lose the original and break "Capture is append-only truth".
2. **Filters:** exactly Original, Black & white, High contrast and Vivid?
3. **Pen colours:** White, Black, Red, Yellow and Blue, one width, Red first?
4. **The small copy shows the edits but not the caption**, as previews do today?
5. **Size:** this is the largest slice yet in files touched. I'd build it in this order, each green before the next:
   1. core;
   2. photo editing and photo export, with the after-capture pill;
   3. video display, trim and text;
   4. web video export;
   5. the native module.
