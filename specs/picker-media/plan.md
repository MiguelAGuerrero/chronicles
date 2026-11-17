# Picker media: plan

For the owner's review before any code (`/slice` step 3). Spec: `specs/picker-media/spec.md` (MP1-MP15).

## What it builds on

- **Data:** nothing new. Tiles are `galleryTiles` over the moments the picker already reads (`threads.moments()` returns
  `Faced[]` and walks); the gallery's saved view (sort, size, shape) is read through `gallery.loadView()` and never set (MP15).
  **No migration, no IndexedDB version, no new truth or cache.**
- **The grid:** Chronicle's own pure core (`lib/gallery/layout.ts`: `galleryTiles`, `galleryDays`, `dayRows`, `tileLabel`,
  `emptyLine`) and its `GalleryTile`, so the picker's grid is Chronicle's by construction (MP5, MP14). The day lines'
  streets come from `gallery.streetsFor` (the same read as Media), after one `gallery.load()` when Media is first shown.
- **No library, no new modal:** drawn inside the picker's card (MP13).

## Files

| File | Layer | What |
|---|---|---|
| `src/lib/threads/pickerMedia.ts` (new) | core | `pickerTiles(moments, walks, { hidden, self, show })`: Chronicle's tiles minus the moment in hand and what waits in Undo (MP4, MP6); `pickBar(view, now)`: the marked moment's place, date, time of day and walk, and its words or kind (MP9; a row's `contextLine` has no time, so the bar adds it); `markedKeys(tiles, momentId)`: every tile of a moment (MP9); `PICKER_TABS`, `PICKER_ACTION` (Connect, Mention) words (MP1, MP9) |
| `src/components/threads/PickerMedia.tsx` (new) | view | the switch (`PickerTabs`: List, Media), the kind row, the grid (`FlatList` over `dayRows`, sticky day headers), the mark and the bottom bar with its one button; props `{ pool, self, action, onPick }` |
| `src/components/threads/MomentPicker.tsx` | view | the switch under the title unless `only` is set (MP12); List is today's body, Media is `PickerMedia`; the search is List's (MP3); `action="Mention"` |
| `src/components/threads/AddToThread.tsx` | view | its second step gets the same switch and `PickerMedia` with `action="Connect"` (MP1); its pool becomes `useMomentPool()` so both read the same shape |
| `src/components/gallery/GalleryTile.tsx` | view | an optional `marked` (ink ring and a check mark, never colour alone) and a spoken "selected" (MP9, MP11); `onPress` unchanged |
| `src/components/threads/useMomentPool.ts` | view | also hold `moments: Faced[]` and `walkList: Walk[]` (what it already read) |
| `scripts/e2e/journeys/pickermedia.js` (new) | e2e | the journey for the screens (below) |
| `scripts/features.js` | | the spec under `threads` (done), the journey under `threads` (done), the spec in `IN_PROGRESS` (done) |
| docs | | `.claude/rules/threads.md` and `gallery.md` (the picker reuses the tiles), `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `docs/STATUS.md`, `docs/NATIVE_UNVERIFIED.md` |

About 7 source files and 1 journey. Hosts of the pickers, from `grep -rn "<MomentPicker\|<AddToThread" src`: `AddToThread` in
`CaptureView.tsx` (the viewer, every route into it: Memories, Lately, Walks, Days, Media, a note's mentions); `MomentPicker`
in `OpenLine.tsx` (the journal's open line), `NotePage.tsx` (the note's page: new, from the viewer's Edit, from Respond, a
journal entry) and `CaptureView.tsx` ("Notes that mention it", which gets no switch: a note has no tile, MP12).

## Tests per criterion

Feature folder: `src/lib/__tests__/threads/`; journey: `pickermedia`.

| Id | Where | Test name |
|---|---|---|
| MP1 | journey | `MP1: Add to a thread, A new thread: List and Media are the first thing under the title, in words; Media shows tiles and a tile connects its moment` |
| MP2 | journey; unit | journey `MP2: Mention a moment, from the journal's open line and from a note's page, has the same switch and grid`; unit `pickerMedia.test.ts` `MP2: both pickers import the one PickerMedia` (a source check) |
| MP3 | journey | `MP3: the picker opens on List with its search; Media has none; back on List the query is as it was` |
| MP4 | unit | `MP4: one tile per photo, video and memo piece, newest first; a note has none; the moment in hand, one waiting in Undo and an open walk's are left out` |
| MP5 | journey | `MP5: tiles carry no caption, date or place; each day has a header with where; the day header stays pinned` |
| MP6 | unit; journey | unit `MP6: a kind keeps only its tiles`; journey `MP6: Videos shows only videos, says "Videos only", All is the way back, and it is All again on reopening` |
| MP7 | journey | `MP7: no count in any visible text or label in Media, with a kind chosen, with a tile marked` |
| MP8 | unit; journey | unit `MP8: no tiles gives the gallery's empty line, a kind its own`; journey `MP8: with nothing kept the grid is one line` |
| MP9 | unit; journey | unit `MP9: the bar says the context line and the moment's words, or its kind`; journey `MP9: a tap marks a tile with ink and a check, the bar names its place, date and walk, nothing is written until Connect, closing writes nothing` |
| MP10 | journey | `MP10: Connect makes the thread of the two moments; Mention puts the same reference a row does` |
| MP11 | journey | `MP11: the switch and filter are tabs with one selected; a marked tile is spoken selected` |
| MP12 | journey | `MP12: Notes that mention it has no switch and no grid` |
| MP13 | journey | `MP13: Media is inside the picker's card (one dialog); the switch, filter and tiles are 44 px or more; at 320 px nothing wraps` |
| MP14 | journey; unit | journey `MP14: a photo tile loads its small copy`; unit `MP14: the grid's rows come from dayRows, with known heights` |
| MP15 | journey | `MP15: opening and using Media writes nothing to meta or IndexedDB` |

Every test is written first as a todo and committed alone (`Picker media: tests first (MP1-MP15, failing)`).

## Screens and actions (goal-to-control, `docs/research/ui-references.md` matrix 13, 18)

| Goal (how often, where) | Control | Matrix | Where the owner will look first, and what they will see |
|---|---|---|---|
| See the other moment as a picture, when connecting two moments (rare, at a desk or on a bench) | **List \| Media**, a two-segment control directly under the title | 13: a segmented control of two nouns, words in every segment; ui-teardown: Day One's List and Media views | At the top of the picker, under "Join it with another moment": two words, List selected |
| Narrow to photos, videos or memos | a row of **All, Photos, Videos, Memos** under the switch | 13 (four nouns); the gallery's own Show | Beside the grid, where the owner is looking for a video |
| Choose a moment from a picture | a tile, marked by a tap | 18: a selectable item | The grid |
| Commit the choice | **Connect** (or **Mention**), the one button in a bar fixed under the grid | one primary action per bar (`ui-patterns`) | The bottom of the card, naming the marked moment's place and date |
| Leave | the picker's Close | unchanged | The card's top right |

**Defaults taken that make a control quieter, for the owner to overrule:** (1) a tap on a tile marks and the bar picks, not a
tap that picks outright, because a bare tile in a dense grid is easy to mis-tap and a thread is a thing the owner
keeps; it is one tap more than a list row (MP9). (2) The picker's grid has no Years or Months, no View menu and no
pinch: it is Chronicle's Days, at the size and shape the owner set in Media, because the picker is for finding one picture;
a pinch or a menu in a card is a second place to look. (3) The filter row has no icons. (4) Media has no search: words
are List's job.

## Deferred, and why

- Years and Months in the picker, the View menu, and pinch (default 2 above). Kept off to stay a picker, not a second Media.
- A moment's preview on a long press (the viewer, whole): the bar says the moment's words and place; the viewer is a Modal and iOS can't stack one on one.
- Search over the grid's day lines.

## Native paths that will not run on a device

The grid's fling on a card in a Modal (iOS, Android); TalkBack and VoiceOver reading the switch and a marked tile. Added to
`docs/NATIVE_UNVERIFIED.md`.

## Steward (Nov 17), triage

Accepted into the spec: S1 (the mark is the moment's, every tile of it rings; the bar's space is kept), S2 (the bar's content as an outcome, with the time of day; the owner's-call sentence is in "Defaults" above), S3 (every note-page host, one in-walk host in the journey), S4 (criteria say what is seen, not the component), S5 (first paint, 320 px, keyboard open), S6 (a mark hidden by a filter stays; it survives List and back; the list's scroll is not promised), S7 (accessibility names scanned too).

Silent, answered in the spec or left to the owner: no Years/Months/menu/pinch is default 2 above (the owner may overrule); 0139's bare tiles in a picker is the gate's reshaping and is named for the decision record; a moment already in the thread is offered as the list does (MP4); a length is a time, not a count (MG7); a note found by its words in Media is out of scope (MP12).
