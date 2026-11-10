---
paths:
  - "src/components/Capture*.tsx"
  - "src/components/{Caption,Baker}*.tsx"
  - "src/lib/media/**"
  - "src/lib/{useCaptures,thumbPlan,useMediaUri,captureBus}.ts"
  - "src/lib/here/**"
  - "src/lib/audioMode*.ts"
  - "src/lib/export/**"
  - "src/lib/__tests__/captures/**"
  - "src/components/edit/**"
  - "src/lib/{mediaEdit,editSession,editOffer}.ts"
  - "src/lib/{captureEdits,videoEdit}/**"
  - "modules/**"
---
# Captures and media

Captures (photo, video, voice memo, note), their viewer, captions and baking, thumbnails, saving keepers, the backup bundle, and the voice-memo and web-video traps. The codemap is in `docs/ARCHITECTURE.md`; the decisions and their history are in `docs/decisions/`.

## The viewer (decision 0112)

- **Top bar, toolbar, menu; nothing over the moment.** `CaptureViewer` draws its top bar (Remind, Go here, More, Close), and `ReplyDock` docks a toolbar under the moment (Respond, and Edit for a photo or video with `onSaveEdit`, or a note with `onSaveNote`). `CaptureContent` takes `dock` and leaves that room clear: the strip and the note card sit above it, and a photo or video starts under the top bar (`TOP_BAR_H`). More holds Save, Open in Maps, Add to a thread, Open its thread and Delete.
- **Screenshots are taken after the Modal's fade** (`waitForTimeout(800)`): a picture taken during it shows the screen beneath through the viewer.

## Video

- **Video** comes from the camera button (the system camera's own video mode),
  capped at 30 s on phones and 15 s on web. The mic stays the separate pocket
  recorder.

## What happened here

- **What happened here:** a long press on the walk screen (so stray taps do
  nothing), a tap on the replay card. The reach is 44 px at the current zoom,
  clamped to 15–150 m (`pressRadiusM`). The open walk's captures are passed in as
  shown, because an unstamped one has no stored place until stop. Web taps wait
  300 ms so a double-tap zoom isn't also a press.

## Captions, baking, keepers, the backup zip

- **Captions are data** (`caption`, `caption_y`) and are baked in only when saved
  out. Sizes are fractions of the photo's width with no pixel minimums
  (`CAPTION_STYLE`, `captionMetrics`, `captionTop`), shared by `CaptionBar` and
  both bakers, so the saved photo matches the screen. The bar is centered on `y`
  by its measured height. 80 characters at most. The canvas baker breaks words
  too wide alone character by character (CJK).
- **iOS can't present a Modal over a Modal.** The caption editor opens inside
  the viewer as an overlay (`CaptionEditor overlay`), never as a sibling Modal.
- **Native baking** sizes the view in points (`px / PixelRatio`), passes the pixel
  `width`/`height` to `captureRef`, uses `useRenderInContext` on iOS, sits behind
  the viewer's cover instead of off screen, and runs one bake at a time. Not tried
  on a device.
- **Saving keepers** uses expo-media-library's `Asset.create` (the legacy
  `saveToLibraryAsync` throws), with `requestPermissionsAsync(true)` (write-only).
  The plugin's read permissions are blocked in `app.json`. Media is always reached
  through `resolveMedia`, so legacy absolute and `data:` refs still work.
- **The backup zip (deferred, not in the UI) is streamed** (`writeWalkBundle`: fflate `Zip` +
  `ZipPassThrough`, 1 MB chunks, written to a file handle on native and kept as
  Blob parts on web). Missing media is counted, marked in walk.json and reported.
  There is no import yet.

## Media editing (ME1-ME23, decision 0090)

- **Edits are data** on the untouched file (`Capture.edit`, `lib/mediaEdit`):
  rotate, crop (against the original, so a later turn keeps the same part),
  filter (photos), lines (original fractions; thickness against its shorter
  side), trim (videos). One order everywhere: rotate, crop, filter, lines,
  caption. `exportPlan` is the one transform the screen (`EditedPicture`'s SVG,
  `VideoPicture`'s view transforms), both bakers and the video module follow.
- **The editor** (`edit/MediaEditor`) is an overlay inside the viewer (iOS:
  no Modal over a Modal) and its own Modal from the Edit offer on Navigate's
  ready screen and the recording bar. Its state is `editSession` (core): Done
  with no change writes nothing; Close with changes asks. After Done on a
  photo, the small copy is remade from a bake without the caption.
- **The viewer unmounts the shown capture while the editor is up.** On the
  web, closing an editor drawn over a mounted `CaptureContent` left a stale
  copy of it in the DOM each time (Nov 4; never explained, reproduced in
  Chromium; `ME4` check in the `edit` journey). It also keeps a video from
  playing under the editor.
- **No drag may start a text selection on the web**: react-native-web ends the
  responder on `selectionchange`, so a pen line kept one move (Nov 4). The
  editor's root is `userSelect: 'none'`.
- **Never mutate a player in a component body or its closures** (React
  Compiler lint): `seekTo(player, s)` and `playWithSound` sit at module level.
- **Video sizes:** expo-video's track size is the encoded one (a portrait clip
  reads landscape) and the web player has none, so `useVideoSize` asks a
  first-frame thumbnail on phones and `probeVideoSize` reads the metadata on
  the web.
- **The replay's cards show the edits** (`ceremony/Cards`: `CardPhoto` fills the
  card with the edited picture; `CardVideo` is turned, cropped and plays only the
  kept part, its wait timed on the kept length). The pile shows the edited small copy.
- **A loose moment's change goes on the bus's `LOOSE_MOMENTS` channel**
  (`captureBus.patch(null, ...)`); the ready screen listens, so a moment
  edited from its Edit offer shows on its pin (audit 2).
- **An edited small copy is named by its edit** (`editedThumbName`): pins key
  their picture by the ref, so the same name never reloaded (audit 3). The
  capture-time copy stands down once a photo has a copy or an edit (audit 8).
- **Escape and Back go through the editor's own Close** (`requestClose`), which
  asks before discarding (audit 5). Choices (pens, colours, filters, aspects,
  thicknesses) are radios with `aria-checked`; react-native-web ignores
  `aria-selected` on a button (audit 11).
- **Saving out:** photos through `bakers.bake` (the web applies the matrix to
  the pixels); videos through `exportVideo` with the lines and caption as a
  clear PNG (`bakers.bakeOverlay`): the local module on phones, canvas +
  MediaRecorder on the web (real time; MP4 or WebM as the browser records).

## Thumbnails

- **Thumbnails** (TH1-TH5, the owner's calls, Nov 1: save a small copy, with
expo-image-manipulator; `lib/thumbPlan.ts` pure, `media/thumb.ts`).
- Each new photo gets a 240 px JPEG copy, made after the capture is kept and
  never holding it up. Older photos get theirs the first time a preview shows
  them, read fresh from storage first.
- The copy is stored as `Capture.thumb_path` (SQLite migration 12;
  IndexedDB stores the record whole, so no version bump). It is named by the
  capture (`<id>.thumb.jpg` under its walk or `moments`), never cut from an
  old ref.
- One decode, bounded as it loads (`manipulate(uri, { maxWidth, maxHeight })`),
  and the manipulator's context and image are released after. On iPhone web,
  an unreleased one leaves full-size canvases behind.
- `THUMB.none` marks a photo that won't decode, so it isn't tried again. Two
  asks at once share one job. A leftover copy is replaced (`keepFile`
  `replace`).
- Previews show the copy, the icon while it is being made, and the photo
  when the copy's file is gone (`thumbShown`). The reminder card uses it
  too. The backup bundle leaves `thumb_path` out.
- The memory preview is keyed by its first capture, so a new pin never shows
  the last one's photo.
- **Native** (unverified on a device): migration 12, the manipulator, and
  whether EXIF orientation survives the copy.

## Voice memos

- Voice memos stop when the phone locks unless `setAudioModeAsync` gets
  `allowsBackgroundRecording: true` and the expo-audio plugin has
  `enableBackgroundRecording`.

- **A failed photo or video is held** (SA8, decision 0107): `useCaptures` keeps every one (`held`, the
  file's kept path once it is), the walk screen and Navigate, ready show "Photo not saved" with Retry
  (`heldLabel`), Retry saves each with its stamp, and Stop warns once before ending without them. Every
  save failure is worded by `saveFailLine` (lack of room told apart by `isOutOfSpace`), never the raw error.

- All voice actions (start, save, discard, undo, retry) run on one promise queue in
  `useCaptures`, so taps never interleave. Stop waits for that queue.
- Never call `stop()` on a recorder that already stopped by itself: on web it waits
  forever for `dataavailable`. `stopRecorder` checks `isRecording` and races a 3 s
  timeout.
- `getStatus().durationMillis` is 0 once a native recorder has stopped. Judge
  "accidental tap" by wall-clock time, never by that number.
- The web image picker reports video `duration` in seconds; native reports
  milliseconds.

- expo-video's web `VideoView` puts its `style` straight on the `<video>` tag. A
  video doesn't stretch to left/right/top/bottom, so size it with `width` and
  `height` of 100% (`styles.fill`), or it sits at its own size in a corner. Pass
  `playsInline` too.

- Browsers refuse to start sound without a tap; iOS refuses every time, and the
  replay reaches its stops on its own clock. expo-video's web `play()` doesn't
  even catch the refusal. So on web a video that hasn't started 800 ms after
  `play()` plays muted with a "Tap for sound" button, and a refused memo (its
  play button still showing) moves on after 4 s in a replay that advances by
  itself. iOS also draws no frame of a video that hasn't played. Headless
  Chromium allows sound regardless (any earlier tap counts), so the e2e copies
  iOS's rule into a fresh page by overriding `HTMLMediaElement.prototype.play`.
- **On web, never wait for `readyToPlay` before `play()`** (fix ios-video, Nov 5:
  the replay's video never loaded on the owner's iPhone). expo-video's web
  `play()` reaches only the `<video>` tags already mounted, and iOS Safari
  loads nothing until `play()` is called, so it never gets to `readyToPlay`
  (`readyState >= 3`) on its own: a gate on it waits forever. Call `play()`
  from an effect of the component that renders the `VideoView` (a parent's
  effect runs after its children's, so the tag is mounted), and again when a
  different `VideoView` swaps in (a sized or edited one after the size probe):
  the new tag starts paused at 0, so the viewer seeks it to where the old one
  had got to (the last `timeUpdate`). Phones still start on `readyToPlay`. The
  `chronicle` journey's fresh page copies iOS's rule by holding a `<video>`'s
  `readyState` at 1 until a `play()` is let through (Chromium loads a `blob:`
  video whatever its `preload` says).
- **Edit a note** (QL24, QL25): the viewer's docked toolbar offers Edit for a note
  when the screen passes `onSaveNote` (it was in More until decision 0112); `NoteEditor` opens inside the viewer's Modal (as
  the caption and reminder editors do). `noteText` (`lib/noteEdit.ts`, pure) trims,
  cuts to 500 and refuses blank. The viewer keeps edited bodies and merges them into
  what it shows, so the text changes at once and rolls back on a failed save. Screens
  store the body, patch their own list, and send `captureBus.patch(walkId, id, { body },
  null)`: a null sender reaches every listener, for screens without `useCaptures`.
  The walk screen goes through `useCaptures.setNote`. Navigate's live walk has no
  viewer; "Memories here" has no Edit note. Captions and edits go on the bus since Media editing (`captureEdits`, `useCaptures.setEdit`).
