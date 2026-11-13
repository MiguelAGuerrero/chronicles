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
  - "src/lib/transcript/**"
  - "src/lib/useTranscript.ts"
  - "src/components/MemoTranscript.tsx"
  - "src/lib/__tests__/transcript/**"
  - "src/lib/notePage/**"
  - "src/components/notePage/**"
  - "src/lib/noteEdit.ts"
  - "src/lib/__tests__/notes/**"
  - "src/components/edit/**"
  - "src/lib/{mediaEdit,editSession,editOffer}.ts"
  - "src/lib/{captureEdits,videoEdit}/**"
  - "modules/**"
---
# Captures and media

Captures (photo, video, voice memo, note), their viewer, captions and baking, thumbnails, saving keepers, the backup bundle, and the voice-memo and web-video traps. The codemap is in `docs/ARCHITECTURE.md`; the decisions and their history are in `docs/decisions/`.

## The viewer (decision 0114)

- **Top bar, toolbar, menu; nothing over the moment.** `CaptureViewer` draws its top bar (More, Close; Remind me here and Go here are More's items since UC9, and a set reminder says so in the info line, UC12), hides its bars on a tap on a photo (`chrome`, UC7; never with a screen reader, UC8), says a kept reply or an added thread in the info line rather than a pill (`statusOf`, UC10), and `ReplyDock` docks a toolbar under the moment (Respond, and Edit for a photo or video with `onSaveEdit`, or a note with `onSaveNote`). `CaptureContent` takes `dock` and leaves that room clear: the strip and the note card sit above it, and a photo or video starts under the top bar (`TOP_BAR_H`). More holds Remind me here, Go here, Save, Open in Maps, Responses (when it has any, decision 0131), Add to a thread, Open its thread and Delete (no confirm; Undo on the pill, UC4).
- **Screenshots are taken after the Modal's fade** (`waitForTimeout(800)`): a picture taken during it shows the screen beneath through the viewer.

## Video

- **Video** comes from the camera button (the system camera's own video mode),
  capped at 30 s on phones and 15 s on web. The mic stays the separate pocket
  recorder.

## A moment's pieces (decision 0123)

- **Screens read `Faced` moments** (`lib/moment`): the moment's id, walk, time and place with its face's media and
  `piece_id`. Media writes name `piece_id` (`db.updatePiece`), place writes the moment (`db.updateMoment`). A
  piece's small copy and files are named by the piece's id; a moment's first piece shares the moment's id.
- **The viewer shows a stacked moment piece by piece** (`facedAt`): edits and note text are kept by `piece_id`;
  the footer's "i of n" is for moments, never over pieces (MS9). A piece waiting in the Undo window is hidden by
  `pieceKey(id)`, never its id, or the whole moment would vanish with its first piece.
- **Split out** (MS16): `lib/split` through the one Undo window (kind `split`): the piece is hidden from its stack by
  `pieceKey` and shown at once as its own moment (the viewer reads `split.store`, inserting it after its original);
  `db.splitPiece` stores it once the window has passed, so Undo never joins two moments. Never the first piece.
  Placed by `splitPlace` (the trace at its time, a pause's start, the last fix before a gap; off a walk the original's
  place).
- **Group captures** (MS18-MS21): `momentPill.grouping` (meta `group_captures`); the edge stack passes
  `momentPill.edgeTarget()`, null with the setting off, so the edge makes a new moment by default.
- **Adding a piece takes no fix** (`pieceStamp.stampFor` with `into`; MS3, 0036).

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
- **A video's still** (video thumbnails VS1-VS9): a 720 px JPEG of the frame where the kept part starts (`frameAt`:
  the trim's start, else 0), with its crop and rotation, as the piece's `thumb_path`, made after capture, on an edit's
  Done (named by the edit) and on first show (the gallery, the memory preview, Memories' cards through `lib/thumbs`).
  `videoFrame` takes it from expo-video on phones and from a detached `<video>` on the web (a listed exception).
  Previews draw it under `VideoMark`; a video's file is never a preview: no still yet, or `THUMB.none`, is the glyph.
  - **Trap: a MediaRecorder WebM has no duration** in its header, and a seek into it may never land: the web's
    `videoFrame` seeks past the end first (`1e101`) to learn it. iOS Safari loads nothing until `play()`: it plays
    muted, then pauses, before the seek (unverified on an iPhone).
  - **One shell, one queue, one hook** (video-thumbnails audit 2-6, 9): `lib/thumbs` makes every preview's copy or
    still (`ask`, read fresh, written only if the piece is as it was read) and an edit's still (`remake`, which
    replaces the still stored now and, with none made, drops it); a preview reads its piece through `useStill`, which
    shows a still made or replaced since its row was read (`shownStill`) and asks for one it lacks (a pin and the pile
    never ask). An edit remakes the still only when its trim, crop or turn moved (`stillChanged`), after Done closes.
  - **A timeout is transient** (audit 1): `videoFrame` rejects with `transient: true` and `thumbJob` returns null (asked
    again later); only a file that will not decode is `THUMB.none`.
  - **A media URL is let go two seconds after its last use** (`useMediaUri`, video-thumbnails ui 1): revoking a
    `blob:` URL the moment a preview's file changed left a picture still loading it to fail, logged by the browser.
  - **Trap (e2e): `waitForFunction` with an async predicate** resolves at once with its pending promise; poll a stored
    row from the test side instead (the videothumbs journey).
- Previews show the copy, the icon while it is being made, and the photo
  when the copy's file is gone (`thumbShown`). The reminder card uses it
  too. The backup bundle leaves `thumb_path` out.
- The memory preview is keyed by its first capture, so a new pin never shows
  the last one's photo.
- **Native** (unverified on a device): migration 12, the manipulator, and
  whether EXIF orientation survives the copy.

## Voice memos

- **A memo can be trimmed** (voice trim VT1-VT12, Nov 12): Edit in the viewer opens `MediaEditor` on a `voice` kind (`editSession`
  `TOOLS.voice = ['trim']`, no picture), the same `Capture.edit.trim` a video has, on the untouched recording. Everything that plays
  a memo or says its length goes through `lib/voiceTrim` (`voiceSpan`, `voiceClock`, `voiceState`, `memoWords`, `trimmedLine`);
  a test fails when a file calling `useAudioPlayer` does not import it (VT12). A trimmed memo's player asks `updateInterval: 100`
  (the default 500 ms stops it up to half a second past the end handle), seeks to the start before `play()`, and pauses and says
  finished at the end handle (`VoicePlayer`, the replay's `MemoBubble`). A player is only mutated from module-level helpers.
- **A change to a moment's other piece is that piece's** (voice-trim audit 1): `captureBus.patch` and `applyPatch` take the piece's id
  (`c.piece_id`); a piece that is not the face's lands in `pieces` and the face keeps its own edit, caption and copy, or a memo's trim
  overwrote its photo's crop. Every `onSaveEdit` path passes it. Note text is still patched on the face (docs/DEFERRED.md).
- **A restart names the position it left** (audit 2): a seek is async, so one more status can carry the old end position; the press
  stores it (`restartedFrom`) and `voiceReachedEnd` ignores that position until the player moves off it. The whole length is
  `wholeMs(body, file)`: the stored one, the file's only when none is on record (audit 3, 4).

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
- **A note is a page** (note pages NP1-NP14, decision 0151; it replaced the note card and `NoteEditor`). The pencil (Navigate's
  `MomentBar`, the walk's `walk.tsx`, Memories' open line through Open as a page, `journal/OpenLine`), Respond → Note (`ReplyDock`) and Add to this moment open
  `NewNotePage` in a non-transparent `Modal`; the viewer's Edit opens `NotePage` inside its own Modal (iOS: never a Modal
  over a Modal), and the viewer reads a note as `NoteReader` (`CaptureContent`'s `note` prop). The editor is TipTap in an
  Expo DOM component (`notePage/JournalEditor.tsx`, `'use dom'`: plain DOM on the web, `@expo/dom-webview` on phones),
  whose default export must be a plain function taking `ref` as a prop (lint `expo/use-dom-exports`); everything it
  takes or gives back is JSON, and its handle (`format`, `insertMention`, `focus`) takes JSON arguments.
  - **The document** is `lib/notePage/schema.ts` (adapter): StarterKit without code, link, strike, underline or rule;
    task lists; the mention as `@[id|words]` (0125) through its own Markdown tokenizer; a paragraph's leading `#`, `1.`,
    `-`, `>` kept as text. `toDoc(body, format)` reads a body the page wrote (`body_format` 'md') as Markdown and any
    other note literally (a paragraph per line); `toBody` always writes Markdown. Unit tests run it in Node.
  - **Words elsewhere** come from `plainNote(body, body_format)` (`lib/refs.ts`), which drops the marks of a page with
    `marked`, the lexer `@tiptap/markdown` uses (a pure package in core). Every reader of a note passes `body_format`;
    one that doesn't reads a page's marks as words.
  - **Saving as it is written** is `lib/notePage/autosave.ts`'s reducer, run by `NotePage`'s `useAutosave`: a pause of
    `NOTE_SAVE_PAUSE`, leaving, the background; an emptied page never writes an empty body, and only leaving it empty
    deletes (`deleteNoteNow`, with Undo). A new note is stamped at the tap (`useCaptures.beginNote`) and kept by
    `keepNote`; every host's `onSaveNote` stores `notePatch(body)` (the body and `body_format: 'md'`).
  - **Ticks only on the page**: TaskItem's `onReadOnlyChecked` refuses while reading (the steward's S1, 0114).
  - **On a phone, nothing loads** (NP13): the DOM document adds a Content-Security-Policy meta when `IS_DOM`; the
    schema has no image, frame or link, so a paste keeps none. `@expo/dom-webview` can't refuse a navigation.
  - **Leaving** (the audit): Done is the one way out; Escape and system Back go through `requestClose` and keep too. The page
    closes only once what is written is kept (`closable`): a failed save keeps it open, "Not saved yet" in its top bar.
  - **Mentions** read as cards in the reader (RF4): `useMentionCards` gives JSON to the DOM, drawn by TipTap's
    `ReactNodeViewRenderer` under a React context; while writing, a chip. A gone moment's token is relabelled by `withGone`.
  - **E2E:** `E2E_ONLY=notepage`. The editor is a contenteditable: `fill()` works, `inputValue()` doesn't (read
    `innerText()`); the page is `note-page`, Done `note-done`, the body `note-input` being written and `note-text` read
    (a reply's page sits over a read note). The web's viewer takes no Escape: leave a page in the viewer by Done.
- **Note types** (NY1-NY17, decision 0161): `Capture.note_type` (SQLite migration 27, IndexedDB 20; raw as stored, read through `noteTypeOf`, so an unknown value is no type) is the owner's mark on a note: one of eight ink glyphs in `lib/noteType` (fixed order, spoken names). The note's page offers a Type tool in its bar only for an edit (`NotePage` given `type` and `onType`; never a new note's page or Respond's), opening `NoteTypeMenu`; a choice is kept at once through `onSaveNote(c, body, type, typeOnly)`. `notePatch(body, type, typeOnly)` (`lib/noteEdit`) is the one write: text and type together, or, `typeOnly`, the type alone (the body and its `body_format` stay as kept). Every `onSaveNote` call passes it on (`noteTypeScan.test` fails a call site that takes two arguments). `NoteMark` draws the glyph and name above the viewer's note and in the owner-thread bubble; `captureIcon` and `pinMark` put it on a pin of exactly one note (a pin of several keeps its count). Never count, sort, filter, search or infer a type, and never read one for a place (NY12, NY13): `noteTypeReaders.test` lists the files that may mention a type; a new reader goes through `/vision` and then onto that list.
  - Since `tend map T14` a pin of several shows its kinds fanned and says them in words, never its count (`map.md`, "A pin of several moments").
  - **A note save names its piece** (note-types audit 1, 12, 13): screens, the bus and `applyPatch` take `c.piece_id` (as voice trim's edits do); `patchFaced` (`lib/moment`) applies it: on the row's copy of that piece in `pieces` always (what a reopened stack and a split read), and on the face's own fields only when the piece is the face. Never patch a row's face fields from a note shown at another piece. A spoken label says the type only where its mark is drawn (`momentSpoken(..., typed)`).

## Memo transcripts (TX1-TX18, decision 0166)

- **The words are a cache beside the memo** (`transcript` table, SQLite migration 28, IndexedDB 21; `capture_id`, `text`, `lang`, `from_ms`, `to_ms`, `made_at`), never in the memo's `body`, `caption` or `edit`. `''` means the engine heard none, so the memo is not read again. A row read from another span than `spanOf(memo)` is stale (`isStale`): not served, and read again.
- **Read in the background, one at a time** (`transcript/shell.ts`): after a memo is kept (`useCaptures.saveMemo`) and for older ones at launch (`backfillTranscripts`, `_layout`). It waits while a walk or a memo records or plays (`busy`), asks for the speech permission only for a memo kept this session on a quiet moment, never at launch, and remembers a refusal (meta `transcript_off`). Nothing is said when it cannot read.
- **On the device only**: every request is `onDevice: true` (the type allows nothing else) and `supportsOnDevice(lang)` is asked before each read. The engine adapter and the cutter are `.native.ts`; the web has none (`engine.ts`).
- **A trimmed memo is read from a cut copy** of its kept span (`exportTrimmedAudio` in the local module `chronicles-video-edit`), written to the cache and removed after the read.
- **Shown as a caption** (`MemoTranscript`, `testID` `memo-transcript`, label "Read by your phone: ..."): nothing while pending or empty, no count, no confidence. A hit in search shows the moment's normal card, never a snippet. No edit or hide: a wrong word is part of the memo.
- **Chronicle reads it through `resurface`'s `transcript` option** (`wordsOf`); `THREAD_RULES` is `resurface-2`.
- **Audit (Nov 13):** a delete of one piece clears its row (`deletePieces`); a read checks `kept` before it writes; an engine `end` with no result is null, never "no speech"; a recording beginning aborts the read (`interrupt`) and the memo waits; Memories refreshes once when the queue is quiet (`onSettled`); `onDeviceReady` (core) gates on API 33 and an installed pack on Android and on the device locale's on-device flag on iOS, never on iOS's supported-locale list; the web engine's permission is `'unavailable'`, so it stores nothing. The caption says "Read by your phone" in view (`memo-transcript-label`) and sets its words in italics.
