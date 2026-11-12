# Note types: plan (NY1-NY17)

For the owner's review before any code. Nothing is built yet.

## Files

| Criterion | Files |
|---|---|
| NY1, NY2, NY3, NY13 | `src/lib/noteType.ts` (new, `@layer core`): `NOTE_TYPES` (eight, fixed order), `noteTypeOf(raw)` (null for anything outside the set), `markOf(capture)` (glyph name and spoken name for a note with a type, null otherwise) |
| NY4, NY5, NY14 | `src/lib/types.ts` (`Capture.note_type?: NoteType \| null`), `src/lib/moment.ts` (`PieceRow.p_note_type`, `facePiece`, `Faced.note_type`), `src/lib/db/migrations.ts` (entry 25: `ALTER TABLE capture ADD COLUMN note_type TEXT`), `src/lib/db/sqliteStore.ts` (`PIECE_COLUMNS`, the SELECT list, both INSERTs), `src/lib/db/index.web.ts` (`VERSION` 20, `oldVersion < 20` step that changes no data: pieces live inside the moment record, so only the version moves), `src/lib/captureBus.ts` (`CapturePatch` gains `note_type`) |
| NY6-NY8 | `src/components/NoteEditor.tsx` (a "Type" row: current glyph and name; opens a menu of the eight and "No type"; `onSave(body, type)`), `src/components/CaptureView.tsx` (passes the type through `onSaveNote(c, body, type)`; rolls it back on failure beside the text), `src/lib/resurface/shell.ts`, `src/lib/ready/shell.ts`, `src/lib/useCaptures.ts` (`setNote`), `src/app/day/[key].tsx`, `src/app/walk.tsx`, `MediaScreen.tsx`, `MemoriesScreen.tsx` (the twelve call sites of `onSaveNote` (steward): `walk/useReady.tsx:323`, `replay/[id].tsx` (2), `(tabs)/index.tsx` (2), `walk.tsx` (2), `MemoriesScreen.tsx` (2), `MediaScreen.tsx`, `day/[key].tsx`; each writes `{ body, note_type }` through `db.updatePiece`). `ReplyDock` (Respond → Note) keeps its composer; a response note is made with no type and takes one through Edit |
| NY9, NY17 | `src/components/CaptureView.tsx` (the note card: glyph and spoken name above the text); NY17: `src/components/threads/NoteText.tsx` and the bubbles in `chronicle/ThreadScreen.tsx`, `threads/OwnThreadScreen.tsx`, `chronicle/MomentCard.tsx`, `threads/ResponseEntry.tsx` draw `markOf(note)` (glyph and name) before the text |
| NY10 | `src/components/icons.tsx` (`captureIcon(c)`: `KIND_ICON[kind]`, or the type's glyph for a note), `CapturePinView.tsx`, `chronicle/MomentPicture.tsx`; `src/lib/pins.ts`: only a pin of exactly one capture that is a note wears a type; a pin of several keeps its kind (or mixed) glyph and its count |
| NY11 | spoken names on the glyphs (`accessibilityLabel` where a glyph stands alone; the pin's and the card's labels read "Question note" etc.) |
| NY12 | nothing is built: a test asserts no module under `src/lib` counts or filters by `note_type` (a grep-style core test) |

## Data

- **Truth, one nullable column**: `capture.note_type TEXT` (SQLite `MIGRATIONS` entry 25, never editing an old one); IndexedDB `VERSION` 19 -> 20 with an `oldVersion < 20` step. A note kept before reads as no type (NY4).
- No cache, no derived table, no `SNAP_RULES`/`STREET_CODE` bump. The type is stored raw and read through `noteTypeOf`, so a value from a newer build reads as no type (NY2).

## Tests per criterion (feature `captures`, `src/lib/__tests__/captures/`)

- `noteType.test.ts` (new): **NY1** (eight, fixed order, sad and dislike present, names), **NY2** (unknown reads null), **NY3** (generic glyph without a type, a photo/video/memo never takes one), **NY11** (every type has a non-empty spoken name and a distinct glyph), **NY13** (no function in `noteType.ts` takes text, time or place).
- `noteTypeStore.test.ts` (new, runs against `dbContract.ts` on both fakes): **NY4** (set, change, clear, a pre-slice row reads null), **NY5** (two notes in one stacked moment hold different types), and the migration list test that already pins `MIGRATIONS.length`.
- `bundle.test.ts` (extended): **NY14**.
- `noteSave.test.ts` (new, a shell over `fakePorts()`): **NY7** (text and type written together; a failed write leaves both as they were), **NY8** (saving with the type untouched keeps it; the composers' `saveNote` writes no type).
- `noteType.noCount.test.ts` (new, core): **NY12** (no exported function takes types and returns a count, a filter or a sort key; no lens or search input accepts a type), **NY16** (a scan of `onSaveNote` call sites: each passes the type on).
- `noteSave.test.ts` also holds **NY15** (Respond's `saveNote` writes no type).
- On screen, in the `chronicle` journey (`scripts/e2e/journeys/chronicle.js`, already covers `NoteEditor`): **NY6** (the Type row, the menu of nine entries, the choice shown), **NY9**, **NY17** (the card's and the thread bubble's glyph and name, none without a type), **NY10** (the picture's glyph; the pin's, through the map's captured markers if the journey can reach them, otherwise `CapturePinView` is checked by a render of its label). Screenshots at 390 x 844 with the longest note text for the UI review.

## Screens and their controls (matrix: `docs/research/ui-references.md`, section 2)

- **Choose a type in the note editor.** Goal: say why the note was made. Occasional, while writing or editing, one hand, not walking (an edit happens in the viewer). Control: one labelled "Type" row opening a menu of eight and "No type". Matrix row 15 (pick one of a list; nine entries is past the matrix's seven, accepted: a menu is still the matrix's control, and the order is fixed: a pull-down or menu); a row of eight glyph buttons would be matrix row 13's "segmented control" with icon-only segments, which row 13 avoids, and its precedent is iMessage's tapback, which is a reaction (the thing this slice keeps out). Precedent: the More menu in the viewer (`docs/research/ui-teardown.md`, the viewer). A reason to depart, if the owner wants the row of glyphs: one tap fewer.
- **See the type.** Goal: read why a note was made at a glance. Every visit, passive. No control: a glyph in ink with a name, on the pin, the picture and the card. Matrix row 19 (a status that needs no action: inline, near the thing it describes, announced to the screen reader).
- **Clear a type.** Goal: take a mark back. Rare. "No type" is the menu's first row, the same control.

## Deferred

- A type chosen while writing in the capture band, the stack's note, the walk's note and Respond: the owner asked for capture to stay one tap, so these make a note with no type and Edit sets it. Recorded in `docs/DEFERRED.md`.
- Searching or lining up notes by type (threads of questions): a later slice's call; here nothing filters or counts (NY12).
- A type on a photo, video or memo (the owner chose notes only).

## Native paths that will not run on a device

- The SQLite migration 25 and `updatePiece` writing `note_type` (the web store is the e2e's).
- The menu on a phone (the web build draws the same component), and Ionicons names on a device font (they are the same as the existing icons').
Each goes in `docs/NATIVE_UNVERIFIED.md` as a first-phone-run item.

## Questions the owner may want to overrule

1. The glyphs: question (`help-circle-outline`), emphasis (`alert-circle-outline`), idea (`bulb-outline`), happy (`happy-outline`), neutral (no neutral face in Ionicons that I know of: to be checked against the installed font when `node_modules` is present, else a plain `remove-circle-outline`), sad (`sad-outline`), like (`thumbs-up-outline`), dislike (`thumbs-down-outline`). None of the names is verified yet: this checkout has no `node_modules`.
2. A menu in the editor (matrix) rather than a row of eight glyph buttons; with nine entries a row would not fit a phone's width at tap size, which is why the menu holds.
