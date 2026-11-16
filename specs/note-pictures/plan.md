# Note pictures: plan (NI1-NI18)

For the owner's review before any code. The vision gate and your calls are in `spec.md`.

## What changes, in one paragraph

Nothing about a note is stored differently. A page already knows which moments it mentions (`refIds(body)`). One view
hook reads those moments and, for each photo or video, makes a small in-memory picture (a `data:` URL, about 720 px on
the long edge) and passes it, as JSON, to the editor beside the cards it already sends the reader. The editor draws a
picture where it has one (composer and reader) and the chip or card where it has not. In the composer a tap on a
picture tells the app, which opens a one-entry menu (Edit); Edit mounts the existing `MediaEditor` as an overlay inside
the page; its Done saves the edit on the moment and the picture is made again.

## Design calls made in the plan (named so you can overrule them)

1. **One hook, not two.** `useMentionCards` (the reader's) gains an optional `picture` and `context`; the composer
   calls it too, keyed on the *set of ids* of the stored body, never on the words (steward P2, P4). No second pool read.
2. **The mention stays an inline atom** (`schema.ts` `level: 'inline'`); the picture node view is a `span` with
   `display:block`, so the schema, Markdown and `toBody` do not change (steward P1). Because the camera also writes
   a space after the mention, NI4 says Backspace takes the space first.
3. **The picture is baked, not just resized,** so it matches the viewer (steward S7, NI15). Unedited photo: the file
   downscaled to 720 px by `expo-image-manipulator`. Edited photo (crop, rotation, filter, lines): the page mounts the
   app's own `useBaker` element (`components/Baker`), as the editor and viewer do, and bakes at 720 px without the
   caption (as `keepEditedThumb` does at 240). Video: its stored still (720 px, VS1), which already follows the trim.
   In memory only; nothing is written.
4. **The menu is a small sheet drawn inside the page** (never a Modal): a row "Edit" with a 44 pt target, closed by a tap
   outside, Back or Escape (`requestClose` closes it before the page, as the picker and panels do).
5. **Edit = the viewer's editor, not a copy.** `NotePage` gets an optional `media` prop `{ onEdit(capture, patch) }`; each
   host passes its `setEdit` (`NewNotePage` through `cap.setEdit`, the viewer's page through `onSaveEdit`). The editor is
   an `overlay` inside the page's own Modal. The page's editor is hidden while the media editor is up and the caret is
   restored after (the viewer unmounts its capture while editing for the same reason).
6. **After Done the picture is made again,** keyed by the piece id and the edit's serial (steward P2), so a second
   edit replaces it and keystrokes do not.

## Files

| File | Layer | What |
|---|---|---|
| `src/lib/notePage/pictures.ts` | core | `pictureKind(view)` (photo and video are pictures; note, voice, text are not); `pictureSpoken(kind, what, line)` (a default label is not said twice, S6); `showsContext(moment, head)` (other day or other walk, NI16); `picturesWanted(ids, views, hidden, ready)` returns picture / card / gone / nothing-yet per id; `pictureKey(c)` (piece id and edit) |
| `src/lib/media/pictureData.ts` | adapter | `pictureData(capture, baker)`: a `data:image/jpeg` URL at 720 px for a photo (baked when it has an edit), a video's still read as data; null when it cannot be drawn (NI9, NI15). Built on `expo-image-manipulator`, as `media/thumb.ts` is; the API is read from `node_modules/expo-image-manipulator/build/*.d.ts` before it is written |
| `src/components/notePage/useMentionCards.ts` | view | gains `picture` and `context` per card; made once per `pictureKey`, held in a ref map; the object identity is stable unless a picture changes, so the bridge is not re-sent on a keystroke (steward P3) |
| `src/components/notePage/JournalEditor.tsx` | view (DOM) | the mention node view is drawn in the composer too, for ids that have a picture; a `figure` with `img` (`alt` = spoken name), a rounded corner, a hairline edge, the play mark for a video, and an optional muted `figcaption` for NI16. `.mention` class and `data-id` on the image only, so a tap beside it still asks to edit (steward S5). Composer: a tap calls `onPictureTap(id)`; reader: unchanged `onOpenMention`. Its `Card` and `Picture` types are duplicated by hand as `Card` is today, because a `'use dom'` file imports no app code beyond `schema` (steward P7). CSP is unchanged |
| `src/components/notePage/NotePage.tsx` | view | passes the cards to the composer; holds `menu` and `editing` state; renders the one-entry sheet and `<MediaEditor overlay>`; `requestClose` closes editor, then menu, then picker, then page; renders the baker element |
| `src/components/notePage/NewNotePage.tsx`, `src/components/CaptureView.tsx` | view | pass `media.onEdit` (`cap.setEdit`, `onSaveEdit`); `Cap` gains `setEdit` |
| `scripts/features.js` | map | done: `note-pictures` in `notes`, in `IN_PROGRESS` while built |
| Docs | | decision record (NI18, numbered by `book:next-decision` when written); `.claude/rules/note-pages.md` (a mention's picture, data URLs, the menu, the editor overlay) and `media-editing.md` (a new host); `docs/PRODUCT.md`; `docs/ARCHITECTURE.md`; `docs/DEFERRED.md` (the "photos inline" line rewritten, "A mention's card has no picture" answered, what is left) and `docs/NATIVE_UNVERIFIED.md`, both through `npm run records` |

## Data

No new truth, no new cache on disk, no migration (SQLite none, IndexedDB none). An edit made from the page is the
moment's existing `Capture.edit` through `setEdit` (decision 0090): the page is one more place to reach the editor. The
picture is a derived view of the moment, rebuilt when the page opens.

## Why 720 px and not the stored 240 px copy

A full-width block on a phone is about 350 pt, 700-1000 px on the screen; the stored copy would look soft. A 720 px
JPEG at 0.7 is about 60-120 KB as data, so a page of ten pictures is about 1 MB through the WebView bridge, once (the
cost the deferral named). The size is not a ranking: if a device is slow, the fallback (recorded, not built) lowers the
size of every picture beyond a count, never hides one (NI17).

## Tests, one per criterion (todo first; `check:test-first`)

| Id | Where | Name |
|---|---|---|
| NI1 | core (a photo is a picture) + journey `notepage` (the page's camera adds a picture at the cursor; keyboard back) | `NI1: ...` |
| NI2 | journey: figure width, rounded, no button over it; shot | `NI2: ...` |
| NI3 | core (a video has the mark) + journey (still under the mark, no player on the page) | `NI3: ...` |
| NI4 | journey: type before/after; Backspace twice; undo | `NI4: ...` |
| NI5 | journey: the reader's picture opens its moment; a tap on the margin asks to edit | `NI5: ...` |
| NI6 | core (`toBody(toDoc(body)) === body` for a picture's token) + journey (stored body ends `@[id|A photo]`, no migration) | `NI6: ...` |
| NI7 | journey: no request while a page with pictures draws; a core test on the exported CSP constant (the CSP is applied on phones only, so Chromium cannot test it; `IS_DOM` note, steward P6) | `NI7: ...` |
| NI8 | core (`picturesWanted`: gone, hidden, not ready) + journey (delete, Undo) | `NI8: ...` |
| NI9 | core (note, voice, text are not pictures; an undrawable one is a card) | `NI9: ...` |
| NI10 | core (`pictureSpoken`) + journey (the figure's name and role) | `NI10: ...` |
| NI11 | shell over fakes: one picture per `pictureKey` across many edits of the body; none written | `NI11: ...` |
| NI12 | journey: the new page, a note's Edit page, a reply's page and the reader each show it; the reader has no menu | `NI12: ...` |
| NI13 | journey: a tap opens the menu with one entry; outside, Back and Escape close it; the keyboard bar stays | `NI13: ...` |
| NI14 | journey: Edit opens the one editor over the page with its tools; Done keeps the edit on the moment, returns to the page; Close asks with changes; Escape closes the editor before the page | `NI14: ...` |
| NI15 | core (`pictureKey` changes with the edit) + journey (an edited photo's picture differs from the original's) | `NI15: ...` |
| NI16 | core (`showsContext`) + journey (an @-mention of an older photo shows the line; the camera's does not) | `NI16: ...` |
| NI17 | core (every wanted id gets a picture, in order; none collapsed) + journey (a page of several keeps all) | `NI17: ...` |
| NI18 | `check:docs` and a core test that the DEFERRED line and a decision record exist | `NI18: ...` |

No new journey: `notepage` covers these files and already drives the camera with a file chooser. The new core tests go in
`src/lib/__tests__/notes/pictures.test.ts`, inside the existing `notes` feature.

## Screens and actions (UI rules)

| Goal | Where | Control | Matrix / precedent |
|---|---|---|---|
| See the photo I just took in my page | on the page, under the words above it | none: it appears | Apple Journal and Day One draw media in the entry |
| Add a photo | Camera in the page's bar (NP14) | unchanged | labelled tools in one bar (T5) |
| Edit a photo from the page | tap the picture, then Edit | the picture itself, then one row | menus and sheets, never loose buttons over content (T7); a tap on the thing is the way in |
| Remove a photo from the page | Backspace after it | the keyboard | not a control; the moment stays in the Chronicle |
| Open the photo's moment | in the reader, a tap on the picture | the picture | RF4's card |

Where you will look first: the picture on the page, and a tap on it. Defaults that make something quieter, named for
overruling: **the menu has one entry** (your pick; one row is thin, and Remove from page or Open the moment would
be natural second rows), **no caption beneath a picture from the page's own walk** (your call), **removal is the keyboard
only**, **no play on the page**.

## Steward (a8dd29274b6fc6524, Nov 16), triaged

| # | Finding | Triage |
|---|---|---|
| S1 | "photos inline: out" is reinterpreted with no decision record | accept: NI18; the record is written with the code, and the DEFERRED line rewritten |
| S2 | a picture from another day or walk is bare under the page's head | accept, the owner chose "a line only when it differs": NI16 |
| S3 | no photo skipped, collapsed, chosen as a cover; the lows stay in | accept: NI17; the size fallback never hides |
| S4 | a play mark that does nothing is chrome | accept in a changed form: the tap now opens the menu (NI13); the mark stays part of the still |
| S5 | the reader's tap handler would send an untagged picture to Edit | accept: NI5 narrows the hit target; `.mention` and `data-id` on the image |
| S6 | "Photo: A photo" stutters | accept: NI10 |
| S7 | the picture would lack filter and lines | accept: NI15, baked as the viewer shows it |
| P1 | block inside an inline node; Backspace after the space | accept: design call 2; NI4 amended |
| P2 | two hook designs in one row; key | accept: design calls 1 and 6 |
| P3 | the bridge is re-sent on a keystroke | accept: stable identity; NI11 |
| P4 | the composer passes no `mentions` today; shown body is not the stored body | accept: ids from the stored body |
| P5 | a reply's page has no camera | accept: NI12 says so |
| P6 | the CSP is not applied on the web | accept: NI7 tests the constant, the journey checks no request |
| P7 | the `Picture` type is duplicated in the DOM file | accept: noted in the table |
| Silent 1-4 | the index draws one moment two ways; a picture-only page; sharing; autoplay | 1: the Chronicle's index and threads keep the card (NI12); 2: kept as today (NI17); 3: out of scope; 4: stills only (spec decision) |

## Deferred, with why

- Mention cards in thread bubbles, the memory preview, the replay and the Chronicle's index keep the card: other
  screens, each its own gate.
- Drag, resize, a caption of the page's own on a picture: out by the Nov 12 call.
- A Remove from page row and an Open the moment row in the menu: not chosen on Nov 16; cheap to add.
- A smaller picture for pages with many: only if a device shows it is slow.

## Native paths that have never run on a device

- The WebView drawing a `data:` image from the bridge, the 720 px manipulator and baker output, EXIF orientation, the
  caret around the picture, Backspace removing it, a tap on a picture inside the WebView, the editor overlay over the
  page's Modal with the keyboard up, Back closing editor then menu then page. Each goes in `docs/NATIVE_UNVERIFIED.md`
  as a **Do / Expect** line.

## Risks

- A block-looking inline node in a contenteditable: caret placement and Backspace differ across WebKit and Chromium; the
  journey checks Chromium; the phone is unverified.
- Raising the editor over the page while the WebView keeps focus: the keyboard may stay up under the editor on iOS; the
  page's editor is blurred before the overlay mounts, and refocused on close.
- The baker is a mounted element (`useBaker`); the page must render it for edited photos to bake. If it cannot be
  mounted in the page's Modal on a phone, the fallback is the unedited picture (NI15's "never a broken one").
