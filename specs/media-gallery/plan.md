# Media gallery: the plan

The spec is `specs/media-gallery/spec.md` (MG1-MG15). The owner reviews this before any code.

## Files

| File | Layer | What |
|---|---|---|
| `src/lib/gallery/layout.ts` | core | `galleryTiles(moments, walks, filter)`: one tile per photo, video or memo piece, newest first, no notes, no open walk (MG3, MG9); `galleryDays(tiles, walks, now)`: a section per local day with its title and place line (MG6); `galleryRows(days, width, size)`: columns from the width and the size step, rows of tiles, each row's offset and height (MG5, MG12, MG20); `galleryBlocks(tiles, walks, 'month' | 'year', now)`: a block per month or year with its title, newest photo and place line (MG19); `sorted(…, order)` (MG18); `lengthLabel(ms)` ("0:42"); `tileLabel(tile)` (MG15). Reads only its arguments. |
| `src/lib/gallery/view.ts` | core | The saved view `{ order, size, shape }`, its default and codec (MG22); `zoom(size, ±1)` clamped to three steps (MG20); `anchorAfter(rows, topKey)`: the row to keep at the top after a size change (MG20). |
| `src/lib/gallery/copy.ts` | core | Every sentence: the empty lines (MG10), "Not on a walk", "and outside a walk", "and others". Numbers as words, as in `lib/resurface/lines.ts`. |
| `src/lib/gallery/shell.ts` | shell | `createGallery({ db, clock })`: a `Store` of `{ status, moments, walks, filter, zoom, view }`; `loadView()`/`setView()` through `metaStore` under a new `META` key `gallery_view` (MG22); `load()` reads `db.momentsBetween(0, MAX)` and `db.listWalks()` once per show (MG14); `patch(id, patch)` applies an edit at once (MG14); `setFilter`, `setZoom`, and `reset()` back to All Items and Days on a new open of Chronicle (MG9, MG19). Latest read wins, as `useResurface`. |
| `src/lib/gallery/index.ts` | shell, `@instance` | `export const gallery = createGallery(ports)`. |
| `src/lib/resurface/section.ts` | core | `Section` gains `'media'`; `sectionOnRoute` is unchanged (it already resets to Memories). |
| `src/components/chronicle/SectionBar.tsx` | view | A fifth pill, Media; the pills share the row so five fit at 320 px (MG1, MG2). |
| `src/app/(tabs)/index.tsx` | view | `section === 'media'` mounts `MediaScreen`, as `memories` mounts `MemoriesScreen`. |
| `src/components/gallery/MediaScreen.tsx` | view | The filter, then a `FlatList` over `galleryRows` with `getItemLayout` from the rows' offsets (MG12) and the headers' indices as `stickyHeaderIndices` (MG16), `windowSize` kept small; the empty lines; the viewer. Filters `useHidden()` (MG13). Asks the streets of loose moments for the days on screen through `resurface.contextFor` (MG6). |
| `src/components/gallery/GalleryTile.tsx` | view | A square `Pressable`: a photo through `MomentPicture`'s small-copy path (MG11) with its edit; a video or memo as glyph and length (MG4). Spoken by `tileLabel` (MG15). |
| `src/components/gallery/GalleryBar.tsx` | view | The slim bar the grid scrolls under: Years, Months, Days as a segmented control (MG19), the View menu's button, and "Videos only" with Show All when a kind is chosen (MG9). |
| `src/components/gallery/ViewMenu.tsx` | view | A pull-down menu from the bar: Sort (Newest First, Oldest First), Show (All Items, Photos, Videos, Memos), Zoom In, Zoom Out, Square Photo Grid, Aspect Ratio Grid; chosen items checked (MG9, MG18, MG20, MG21). Drawn with the app's own menu (`MemoryMenu`'s pattern), no new library. |
| `src/components/gallery/PeriodBlock.tsx` | view | A month's or year's block: title, its newest photo large, the place line; a button into the next level (MG19). |
| `src/components/gallery/usePinch.ts` | view | Two-finger pinch on the grid through React Native's `PanResponder` (no gesture library): one step per pinch past a threshold (MG20). |
| `src/components/CaptureView.tsx` | view | `CaptureViewer` gains `startAt?: { id, piece }` (opens on that moment and piece, MG8), `position?: false` (no "i of n", MG7) and `onShown?(id)` (so the gallery can ask the shown moment's context line). Nothing changes for its other callers. |

The viewer's place and walk line (MG8) is the one Memories' cards use: the gallery calls `resurface.contextFor([id])` for the moment shown and passes the result in the viewer's existing `context` map. Nothing new is derived.

## Data

- No new truth, no cache, no migration, no IndexedDB version: the gallery reads moments and walks as the days list does (`momentsBetween`, rows only, never media).
- The filter and Years, Months or Days are store fields, never saved (MG9, MG19).
- Sort, size and shape are one meta key, `gallery_view` (declared in `META`), saved as they change (MG22). Meta, not a table: no migration.

## Tests, by criterion

New feature `gallery` in `scripts/features.js` (source `src/lib/gallery/**`, `src/components/gallery/**`; journey `gallery`; spec `media-gallery`; rule `.claude/rules/gallery.md`, new). Unit tests go in `src/lib/__tests__/gallery/`.

| Id | Test | Name |
|---|---|---|
| MG1 | journey `gallery` (and `resurface/section.test.ts` for the reset) | `MG1: Media is the fifth section and resets to Memories` |
| MG2 | journey `gallery`, at 320 px | `MG2: five labels in one row at 320 px` |
| MG3 | `gallery/layout.test.ts` | `MG3: one tile per photo, video and memo piece, newest first, no notes, no open walk` |
| MG4 | journey `gallery` (no caption, no text on tiles) and `layout.test.ts` (`lengthLabel`) | `MG4: tiles are bare` |
| MG5 | `layout.test.ts` | `MG5: three across on a phone, more as it widens, none under 100 pt` |
| MG6 | `layout.test.ts` | `MG6: a header per day, with the year off this year, and the place line from what is under it` |
| MG7 | `layout.test.ts` (no digit leaves `copy.ts`, headers or tile labels but dates, times and lengths) and journey (every text and accessibility label on Media and its viewer: no " of ", no "items") | `MG7: nothing counts` |
| MG8 | journey `gallery` | `MG8: a tile opens its moment at its piece, with its context; steps follow the gallery; Close keeps the scroll` |
| MG9 | `layout.test.ts` and `gallery/shell.test.ts` (reset) | `MG9: the filter shows one kind and is All on a new open` |
| MG10 | `layout.test.ts` (copy) and journey (the empty line) | `MG10: empty in words` |
| MG11 | journey `gallery` (the tile's image is the small copy's ref) | `MG11: a photo tile loads its small copy` |
| MG12 | `layout.test.ts` | `MG12: every row's offset is known; 5,000 pieces in one pass` |
| MG13 | journey `gallery` (delete in the viewer, Undo) | `MG13: a delete leaves at once and Undo brings it back` |
| MG14 | `gallery/shell.test.ts` over `fakePorts()` | `MG14: a load reads what is new; a patch shows at once` |
| MG15 | `layout.test.ts` (`tileLabel`) and journey (roles) | `MG15: a tile is spoken by its own walk or street, never the day's line` |
| MG18 | `layout.test.ts` | `MG18: Oldest First reverses days, blocks and tiles; the viewer's order follows` |
| MG19 | `layout.test.ts` (`galleryBlocks`) and journey (a month opens its days) | `MG19: months and years with their newest photo and place in words` |
| MG20 | `view.test.ts` (`zoom`, `anchorAfter`) and journey (Zoom In/Out from the menu; a synthetic two-touch pinch) | `MG20: three sizes, the day kept at the top` |
| MG21 | journey `gallery` (the tile's image fits whole in Aspect) | `MG21: square or aspect, cells stay square` |
| MG22 | `gallery/shell.test.ts` over `fakePorts()` (saved and read back; a bad value falls back to the default) | `MG22: sort, size and shape are kept` |
| MG16 | journey `gallery` (scroll into a long day; its header is on screen) | `MG16: the day's header stays pinned while its tiles scroll` |
| MG17 | journey `gallery` (no band; the bar's camera with a walk minimized) | `MG17: no capture stack; the bar keeps its camera` |

The journey seeds moments through the app's own stores, as `resurface` does, and calls `shot()` on the gallery, the filter on Memos, the viewer from a tile, and the empty state.

## Each action on the screen

| Action | Goal, how often, situation | Control | Matrix row | Precedent |
|---|---|---|---|---|
| Go to the gallery | Browse everything kept; often, after walks, at rest | A fifth pill in Chronicle's segmented bar | 13 (two to five related views, nouns) | Day One: List, Calendar, Media, Map along the top |
| Scroll the grid | Find a picture by eye; every visit | A grid (collection) under day headers | L1 (collections for images) | Apple Photos' library grid |
| Filter by kind | Only memos, only videos; occasional | Show, in the View menu; "Videos only" with Show All on the bar | 15 (pull-down for a short list) | Apple Photos' filter menu; Day One's Media: "filter between Photos, Video, Audio, and PDF" |
| Sort | Oldest first to go back to the start; occasional | Sort, in the View menu | 15 | Apple Photos' Sort menu |
| Zoom out in time | Jump to a month or year; often in a big library | Years, Months, Days segmented control on the gallery's bar | 13 | Apple Photos' Years, Months, All Photos |
| Change the tile size | More or fewer across; occasional | Pinch, with Zoom In and Zoom Out in the View menu | 4 and 25 (a gesture only as a shortcut to a visible route) | Apple Photos' pinch on the grid |
| Square or aspect | See the whole photo; rare | Square Photo Grid and Aspect Ratio Grid in the View menu | 15 | Apple Photos' Aspect Ratio Grid |
| Open a tile | See the moment whole; every visit | Tap the tile; the full-screen viewer | 2 and 11 | Apple Photos: tap a thumbnail to open it |
| Step through | Look at the next one; constant in the viewer | The viewer's own swipe and arrows | 2 | Apple Photos: "Swipe left or right on the photo to keep browsing" |
| Close the viewer | Back to the grid where it was | The viewer's Close | 23 | Apple Photos' Back |

No control the matrix avoids. Two segmented controls are stacked (Chronicle's sections and the gallery's Years, Months, Days), both nouns, as Apple Photos sits its Years, Months, All Photos under the app's own tabs; everything rarer is in one View menu.

## Steward (Nov 11): triage

| # | Finding | Call |
|---|---|---|
| S1 | A header that scrolls away leaves bare tiles (breach of "never a bare thumbnail") | Accepted: MG16, the day's header stays pinned |
| S2 | A tile spoken by the whole day's place | Accepted: MG15, its own walk or street |
| S3 | Under a filter the viewer might show only part of a moment | Accepted: MG8, the viewer always shows the moment whole |
| S4 | The header renames a titled walk | Accepted: MG6, a walk's own title first; no area, no guessed place |
| S5 | "Not on a walk" gives no place | Accepted: MG6, loose moments by street once read (the existing context shell, for the days on screen); "Not on a walk" kept, as the responses sheet and `here/shell.ts` say it (Memories' "On its own" is a card label, not a place line) |
| S6 | "and others" stands for one walk | Accepted: MG6, up to three named, then words |
| S7 | MG7's test misses labels and the screen reader | Accepted: MG7 and its journey scan; a TalkBack item in `docs/NATIVE_UNVERIFIED.md` |
| S8 | The header names walks opposite to the tiles | Accepted: MG6, newest first, as the tiles |
| S9 | Media and the capture row | Accepted: MG17 |
| Silent 1 | A piece at 1 am: which day's header? | Midnight to midnight, as the Days list (MG6); the viewer's "late Tuesday night" stays as it is |
| Silent 2, 3 | Is the gallery Chronicles' own enough; memo tiles look alike | Put to the owner below |

## Deferred, and why

- **A video's small copy: the next slice** (the owner, Nov 11). Videos have no thumbnail today (TH covers photos), so a video tile is its glyph and length. A frame needs `expo-video`'s thumbnail on phones and a web exception (a `<video>` frame to a canvas). Recorded in `docs/STATUS.md` as next.
- **A date scrubber, select many, share, Recently Added**: Apple Photos has them; none was asked (Recently Added would sort as Newest First here).
- **Filters by place or walk**: Walks, Days and Map do that.
- **Notes as tiles**: the owner's call, Nov 11.

## Native, never run on a device

- The grid's `FlatList` with `getItemLayout` and many `Image`s on a phone (memory and fling speed).
- The small copies made for older photos as the grid shows them.
- The pinned day headers (`stickyHeaderIndices`) and TalkBack over the grid: no list size spoken (MG7, MG16).
Each goes into `docs/NATIVE_UNVERIFIED.md` as a **Do:** / **Expect:** item (MG11, MG12).

## Answered by the owner (Nov 11, second round)

1. Video tiles: a glyph and length here; video thumbnails are the next slice.
2. Order: newest on top, with Oldest First under Sort.
3. Memo tiles stay a mic and its length.
4. iOS's basics: Sort, Years, Months and Days, pinch, Square or Aspect (MG18-MG22); the look of a photo gallery, edge to edge (MG5).
