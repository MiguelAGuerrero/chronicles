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
