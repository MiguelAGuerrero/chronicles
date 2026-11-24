---
paths:
  - "src/components/edit/**"
  - "src/lib/{mediaEdit,editSession,editOffer}.ts"
  - "src/lib/{captureEdits,videoEdit}/**"
  - "modules/**"
  - "src/lib/__tests__/captures/{mediaEdit,mediaEditAudit,editSession,captureEdits}.test.ts"
---
# Captures: media editing

## Media editing (ME1-ME23, decision 0090)

- **Edits are data** on the untouched file (`Capture.edit`, `lib/mediaEdit`):
  rotate, crop (against the original, so a later turn keeps the same part),
  filter (photos), lines (original fractions; thickness against its shorter
  side), trim (videos). One order everywhere: rotate, crop, filter, lines,
  caption. `exportPlan` is the one transform the screen (`EditedPicture`'s SVG,
  `VideoPicture`'s view transforms), both bakers and the video module follow.
- **The editor** (`edit/MediaEditor`) is an overlay inside the viewer (iOS:
  no Modal over a Modal) and its own Modal after a capture (decision 0240): once
  a new moment's photo or video is kept, the walk screen, Navigate's ready
  screen, the recording bar, Memories' line and the walk planner's capture
  stack (on the planner and the outing page; 0240's addendum) open it by
  themselves; Respond's and the note page's cameras never do (the owner's call)
  (`useEditAfterCapture`, `editAfter` and `editingOf` in `lib/editOffer`), a
  piece added to an open moment on that piece (`facedAt`). It says "Photo
  kept" until the first edit and names ✕ for what it does (`keptWords`,
  `justKept`; not beside Draw's Undo and Redo, audit 8); none opens while the
  walk is stopping or has ended, or once the bar has asked for the walk screen
  (each host's guard, read from the syntax tree by `editAfterCapture.test.ts`;
  the bar's `back` and `photo` run there in a phone's order, audit 5). It is
  keyed by `piece_id` (a moment's pieces share its id, audit 9). In Memories'
  composer it is an overlay inside the composer's Modal, the field blurred under
  it and focused again after (audit 7). Its state is `editSession` (core): Done
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
- **Video sizes:** expo-video's track size is the encoded one (a portrait clip
  reads landscape) and the web player has none, so `useVideoSize` asks a
  first-frame thumbnail on phones and `probeVideoSize` reads the metadata on
  the web.
- **The replay's cards show the edits** (`ceremony/Cards`: `CardPhoto` fills the
  card with the edited picture; `CardVideo` is turned, cropped and plays only the
  kept part, its wait timed on the kept length). The stack shows the edited small copy.
- **A loose moment's change goes on the bus's `LOOSE_MOMENTS` channel**
  (`captureBus.patch(null, ...)`); the ready screen listens, so a moment
  edited as it is taken shows on its pin (audit 2).
- **An edited small copy is named by its edit** (`editedThumbName`): pins key
  their picture by the ref, so the same name never reloaded (audit 3). The
  capture-time copy stands down once a photo has a copy or an edit (audit 8).
- **Escape and Back go through the editor's own Close** (`requestClose`), which
  asks before discarding (audit 5). Choices (pens, colours, filters, aspects,
  thicknesses) are radios with `aria-checked`; react-native-web ignores
  `aria-selected` on a button (audit 11).
- **The editor after a capture holds the shot from the camera's return** (tend captures T62): a host passes
  `editAfter.camera` to `takePhoto` and draws `AfterCaptureEditor` (`edit/EditOffer`), never a `MediaEditor` of its own.
  The held shot and its editor are one element keyed by the shot's turn (`afterCapture`, `lib/editOffer`): a remount
  would replay the Modal's fade over the map and lose the shot. The held shot owns the picked file until it leaves the
  view (tend captures audit 8): the keep is told `keepSource` (native copies, the web keeps the blob) and the hook lets
  it go once the shot is closed, replaced or unmounted, if it was kept. A host's `opens` repeats its own guard on
  `editAfter.open`, asked as the camera returns. The cover ends in the same turn as the keep only because the host's
  `open` follows it in microtasks, before React renders: put no await between `takePhoto`'s answer and `editAfter.open`.
- **react-native-web draws a new Modal's first frame transparent** (tend captures audit 10): `ModalAnimation` sets its
  style in a passive effect, so a frame painted between the commit and that effect shows what is under it, whatever the
  `animationType`. The held shot's frame check reads from its first opaque frame and allows only that mount frame before
  it. Native's Modal with `animationType="none"` is not affected (unverified). Drawing the held shot outside RNW's Modal
  would be a web exception to native-first, so the one frame is left (DEFERRED, captures).
- **While the shot is held, its ✕ alone shows and works** (tend captures audit 7, confirmed by the owner in 0263): named
  `keptWords(kind).close` ("Close, the photo stays as it is") from the start of the hold (audit 11); it closes the held
  shot, the shot is still kept (0240's "Close with no change keeps it as taken"), and no editor opens for it after. The
  rest of the editor keeps its place hidden: `dispatch` takes only `close`, the chips and tools leave the Tab order
  (`tabIndex` -1: react-native-web's Pressable ignores `focusable`), and only the empty `edit-kept` live line is read, so
  "Photo kept" is announced when it fills (audits 12, 13).
- **Saving out:** photos through `bakers.bake` (the web applies the matrix to
  the pixels); videos through `exportVideo` with the lines and caption as a
  clear PNG (`bakers.bakeOverlay`): the local module on phones, canvas +
  MediaRecorder on the web (real time; MP4 or WebM as the browser records).
