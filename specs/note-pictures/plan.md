# Note pictures: plan (NI1-NI12)

For the owner's review before any code. The vision gate and your three calls are in `spec.md`.

## What changes, in one paragraph

Nothing stored. A page already knows which moments it mentions (`refIds(body)`). A new view hook reads those moments,
and for each photo or video makes a small in-memory picture (a `data:` URL, about 720 px long edge) and passes it, as
JSON, to the editor beside the cards it already gets for the reader. The editor's mention node view draws a picture
block when it has one, in both the composer and the reader, and the chip or card when it has not.

## Files

| File | Layer | What |
|---|---|---|
| `src/lib/notePage/pictures.ts` | core | `pictureKind(view)`: which moments are drawn as pictures (photo, video; not note, voice, text); `pictureSpoken(kind, what, line)`; `Picture` JSON type (`{ src, video, spoken }`); `picturesWanted(ids, views, hidden)` decides per id: picture wanted, card, or gone. No clock, no I/O |
| `src/lib/media/pictureData.ts` | adapter | `pictureData(capture)`: the photo's file, with its edit applied, downscaled to 720 px, as a `data:image/jpeg` URL; a video's still (the 720 px one already made, `THUMB.videoEdge`) read as data. Nothing written to disk. Built on `expo-image-manipulator` as `media/thumb.ts` is (to read from `node_modules/expo-image-manipulator/build/*.d.ts` first); web uses the same module |
| `src/components/notePage/useMentionPictures.ts` | view | `useMentionPictures(body)`: ids from `refIds(body)`; reads the pool when the *set of ids* changes (not each keystroke); makes each picture once per photo and edit (a ref map); returns `Record<id, Picture \| {gone}>` or undefined while loading. Extends `useMentionCards` rather than a second pool read: the card hook gains an optional `picture` |
| `src/components/notePage/JournalEditor.tsx` | view (DOM) | `pictures` prop; `MentionView` draws `<figure>` (an `img` with `alt` = the spoken name, rounded corner, hairline edge, play mark for a video) when the id has a picture. Today a node view exists only for the reader; the composer gets one too, for picture ids only, so chips are untouched. CSP stays as it is (`img-src data: blob:`) |
| `src/components/notePage/NotePage.tsx` | view | passes `useMentionPictures(shown body)` to the editor (composer); `NoteReader` passes the same hook's result with its cards |
| `src/components/notePage/NewNotePage.tsx` | view | no change expected; the camera already hands back `{ id, label }` and the pool re-reads when the id set grows |
| `scripts/features.js` | map | `specs: [..., 'note-pictures']` on `notes`; `IN_PROGRESS['note-pictures']` while built |
| Docs | | `.claude/rules/note-pages.md` (a mention's picture, the data-URL rule, the CSP), `docs/PRODUCT.md`, `docs/ARCHITECTURE.md` (media adapter), `docs/DEFERRED.md` (answer "A mention's card has no picture"; add what is left), `docs/NATIVE_UNVERIFIED.md` |

## Data

No new truth, no cache on disk, no migration (SQLite none, IndexedDB none). The picture is a derived view of a
moment, rebuilt when the page opens.

## Why 720 px and not the stored 240 px thumbnail

A full-width block on a phone is about 350 pt, 700-1000 px on the screen; the stored photo copy (240 px, decision 0038)
would look soft. The video still is already 720 px (VS1). A 720 px JPEG at 0.7 is roughly 60-120 KB as data, so a
page of ten pictures is about 1 MB through the WebView bridge, once. The cost the deferral named. If a device shows it
is slow, the fallback is a smaller edge for pictures beyond the first few (recorded, not built).

## Tests, one per criterion (all todo first; `check:test-first`)

| Id | Where | Name |
|---|---|---|
| NI1 | `__tests__/notes/pictures.test.ts` (core: a photo is a picture) and journey `notepage` (camera on the page adds a picture where the cursor was; keyboard/focus back) | `NI1: ...` |
| NI2 | journey `notepage` shot + a check on the figure's width, rounding, no caption/button | `NI2: ...` |
| NI3 | core (video wants its still; the play mark flag); journey (a video's mention has the play mark; a tap changes nothing) | `NI3: ...` |
| NI4 | journey: type before/after; Backspace after removes the mention; undo brings it back | `NI4: ...` |
| NI5 | journey: the reader shows the picture; a tap opens its moment; a tap on words opens the page | `NI5: ...` |
| NI6 | `__tests__/notes/pictures.test.ts` (the body of a page with a picture is the token; `toBody(toDoc(body)) === body`); journey (the stored body ends `@[id|A photo]`) | `NI6: ...` |
| NI7 | journey: no request is made while a page with pictures is drawn (the harness's request log); `notes/csp.test.ts` reads the CSP string | `NI7: ...` |
| NI8 | core: `picturesWanted` returns gone for a hidden or missing id and nothing while not ready; journey: delete the moment, Undo | `NI8: ...` |
| NI9 | core: a note, a voice memo and a text moment are not pictures; an undecodable file falls back to the card | `NI9: ...` |
| NI10 | core (`pictureSpoken`); journey (the figure's `alt` / aria-label) | `NI10: ...` |
| NI11 | shell test with fakes: one picture made per photo and edit across edits of the body; none on a keystroke; nothing written | `NI11: ...` |
| NI12 | journey: the new page, a note's Edit page, the reader, a reply's page each show the picture; a grep test that `NoteText` is unchanged is not written (a decision, not a behaviour) | `NI12: ...` |

No new journey: `notepage` covers these files and already drives the camera with a file chooser (`np-04-camera-mention`).
A new core feature file `__tests__/notes/pictures.test.ts` inside the existing `notes` feature.

## Screens and actions (UI rules)

| Goal | Where it happens | Control | Matrix row / precedent |
|---|---|---|---|
| See the photo I just took in my page | on the page, under the words above it | none: it appears | Apple Journal / Day One show media in the entry; ui-teardown notes it (to cite) |
| Add a photo | Camera in the page's bar (as NP14) | unchanged | the bar's labelled tools (T5) |
| Remove a photo from the page | Backspace after it, like any one character | the keyboard | not a control; the moment stays in the Chronicle (it is its own moment) |
| Open the photo's moment | in the reader, a tap on the picture | the picture | RF4's card |

Where the owner will look first: the page under the text just typed. Defaults that make something quieter, named for
overruling: **no caption** (your call), **no remove button** (Backspace only), **a tap does nothing while writing**
(your call).

## Steward

Run on this spec and plan before you read it; its findings are triaged below.

## Deferred, with why

- The mention cards in a thread's bubbles, the memory preview and the replay keep the card: other screens, a
  separate gate.
- Drag to reorder, resize, caption: out by the Nov 12 call.
- Removing a picture from the page without removing the words after it: Backspace is the way.
- A smaller picture for pages with many: only if the device shows it is slow.

## Native paths that have never run on a device

- The WebView drawing a `data:` image from the bridge (CSP `img-src data:`), the 720 px manipulator output on a
  phone, EXIF orientation, the caret around the picture, Backspace removing it, iOS keyboard behaviour over a figure.
  Each goes in `docs/NATIVE_UNVERIFIED.md` as a **Do / Expect** line.

## Risks

- A block-looking node inside a paragraph in a contenteditable: caret placement and Backspace can differ across
  WebKit and Chromium. The journey checks Chromium; the phone is unverified.
- The pool read for a just-kept photo: the hook re-reads when the id set changes; the camera's save must land first
  (NP14 already waits for the kept photo before it mentions it).
