<!-- Repo first: written from the owner's request in a session (Nov 11), not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Media gallery: every photo, video and memo in one grid

Nov 11, 2026 · @Miguel Guerrero

The owner wants to scroll quickly through everything they kept, as on an iPhone: a grid of pictures, videos and voice
memos without the captions. Today the only way through the corpus is Lately, one card per moment with its words, or a
walk's or a day's replay. The gallery is a fifth view of Chronicle, beside Memories, Walks, Days and Map, as Day One
has List, Calendar, Media and Map (`docs/research/ui-teardown.md`).

## Vision

Idea: A grid or gallery view of all my moments, pictures and voice memos without the captions, a media gallery much like the iPhone's, to scroll through quickly.
Verb: return (the corpus given back at a glance, and a quick way into any moment).
Touches: Always "A moment carries its context ... It never appears as a bare thumbnail, filename or count"; Never "Tallies" and Always "Counts are words" (Apple Photos heads a day with "124 Photos"); **[proposed]** "A row that could appear unchanged in a generic journal app is wrong" (cited as a reason, not a rule); precedent 0098 (Lately leaves out an open walk; strictly newest first, MC13), 0123 (a moment holds pieces); `ui-patterns.md` (a segmented control of at most five nouns, matrix 13).
Verdict: aligned if reshaped
Shape: A fifth section, Media. Bare square tiles, one per photo, video or memo piece, under a header per day that carries the context: the day, and where (its walks by time of day and area, or "Not on a walk"). No count anywhere: no "N photos", no total, no "i of n" in the viewer opened from it. A tile opens the moment whole in the viewer, with its place, time and walk. A memo tile is a mic and its length, never a filename. With nothing kept, one line in words.
Criteria: MG6, MG7, MG8, MG10 below come from the gate; MG6, MG7, MG8, MG15-MG17 were sharpened by the steward (plan, "Steward").
Open: none (answered Nov 11, see Decisions).

## Decisions (the owner's calls, Nov 11, decision 0139)

- **A fifth section, Media**: Memories | Walks | Days | Map | Media, as Day One's views; one tap from anywhere in Chronicle. The pills tighten to fit a phone.
- **Context lives in day headers**, never on the tiles: a tile is bare (no caption, no words); the header names the day and where; opening a tile shows the moment whole.
- **One tile per piece**: a moment holding three photos shows three tiles, as Apple Photos shows every picture. Notes (text only) have no tile.
- **A kind filter**: All, Photos, Videos, Memos, as Day One's Media view filters by kind.
- **Newest on top** by default (Nov 11, second round).
- **iOS Photos' basic sorting and view controls** (Nov 11, second round): Newest or Oldest First; Years, Months and Days; pinch to change the tile size; a square or an aspect-ratio grid. "Recently Added" is not offered: a piece's time is when it was kept, so it would sort as Newest First.
- **The look of a photo gallery** (Nov 11, second round): tiles edge to edge with hairline gaps and square corners; the gallery's controls in a slim bar the grid scrolls under.
- **Video thumbnails are the next slice** (Nov 11, second round): here a video tile is its glyph and length; a memo tile stays a mic and its length.

## Criteria

### Where it lives

1. **MG1 · A fifth section.** Chronicle's bar reads Memories | Walks | Days | Map | Media, and Media shows the gallery. Leaving Chronicle for another tab or the walk puts it back on Memories (RM1); a viewer opened from the gallery, and closing it, keeps it on Media.
2. **MG2 · The bar fits a phone.** At 320 px wide and the default text size, the five labels sit in one row, none wrapped or cut, each a target at least 44 pt tall; at 390 px they keep today's look.

### The grid

3. **MG3 · Every piece, newest first.** The gallery shows one tile for every photo, video and voice memo piece of every kept moment, loose or in a finished walk, newest first by default (Oldest First under Sort, MG18), ties by id. A moment holding three photos shows three tiles; a note has no tile; an open walk's pieces are left out, as on Lately (0098).
4. **MG4 · Bare tiles.** A tile shows only its picture: a photo its small copy, with its edits; a video its kind's glyph with a play mark and its length; a memo a mic glyph and its length ("0:42"). No caption, note, date, place or filename is drawn on a tile, and a photo's caption bar is not drawn on its tile.
5. **MG5 · Edge to edge.** In Days, tiles are square cells running to the screen's edges, with hairline gaps (1 pt) and square corners, on the app's background: three across on a phone at the default size, and more across as the screen widens, so a tile keeps about the same size.

### Context

6. **MG6 · A header for each day.** In Days, tiles sit under a header for each local day (midnight to midnight, as the Days list), in the Sort's order. Its title is "Today", "Yesterday", else "Tue, Nov 3", with the year added when it is not this year. Its line says where, from what is under it, in the order its tiles appear: each walk by its own title, or, untitled, by time of day and area ("A morning walk in Alfama"; with no area, "A morning walk", never a guessed place); up to three walks named, and with more the two latest named and the rest in words ("and another walk", "and two other walks"); moments outside a walk by their street once it is read ("Not on a walk, on Hope Street"; two streets named, then "and other streets"), and "Not on a walk" alone only when no street is known. Under a filter, the line names only the walks and streets whose pieces are shown. Every phrase is in `gallery/copy.ts` and asserted verbatim.
7. **MG7 · No counts.** Nothing on the gallery counts: no "N photos", no total, no number in a header, a month or year block, a tile's spoken label or the View menu, and no list size announced. The only digits are dates, times of day and a memo's or a video's length; the journey scans every visible text and accessibility label on Media in Days, Months and Years, with the View menu open, with a kind chosen, and on the viewer opened from it (no " of ", no "items"). The viewer opened from the gallery shows no "i of n".
8. **MG8 · A tile opens the moment whole.** A tap opens the viewer on the tile's moment at that piece, its info line carrying its kind, date and time and the place and walk line Memories' cards give it (MC1-MC5). The viewer shows every piece of the moment, its note and its caption, whatever the filter: "without the captions" is the grid's alone, and the filter chooses the tiles and which moments the viewer steps to, never what a moment shows. Stepping on goes through the gallery's moments in the gallery's order and Sort; Close returns to the gallery where it was scrolled.

### Sorting and viewing (iOS Photos' basics)

9. **MG9 · A kind filter.** The gallery's View menu shows All Items, Photos, Videos or Memos; each shows only that kind's tiles, and only the days, months and years that have them. With a kind chosen, the gallery's bar says so in words ("Videos only") with a way back to all. The choice holds while Chronicle is in front, and is All Items again when Chronicle opens anew (as RM1 resets the section).
18. **MG18 · Sort.** The View menu has Newest First (the default) and Oldest First, as iOS's Sort; it orders the days, months, years and the tiles within them, and the viewer steps in that order.
19. **MG19 · Years, Months, Days.** A control on the gallery's bar chooses Years, Months or Days (Days at first). Months shows a block per month and Years a block per year, in the Sort's order: its title ("November" this year, "November 2025" before; "2025"), its cover large, and a line naming where in words. The cover is the block's first piece of the shown kinds in the Sort's order (a photo's picture, else a video's or memo's glyph): a plain rule, never a "best" one. The line names the cover's own walk (its title, or untitled its area) or street first, then other places in the Sort's order, never repeated, an untitled walk with no area left out of the names; loose moments by street once read; after three names, the rest as "and another place" or "and other places"; moments outside a walk with no street known add ", and outside a walk" (up to three names); with nothing to name, "Not on a walk", never blank or guessed. A block is spoken by its title and the cover's place. A tap on a month opens Days at that month's first day in the Sort; a tap on a year opens Months at that year. Every phrase is in `gallery/copy.ts` and asserted verbatim.
20. **MG20 · Tile size.** In Days, pinching out shows fewer, larger tiles and pinching in more, smaller ones, in three steps (three, five and seven across on a phone); the View menu's Zoom In and Zoom Out do the same, so the gesture is never the only way. The scroll stays on the day that was at the top. A tile is never under 44 pt.
21. **MG21 · Square or aspect.** The View menu chooses Square Photo Grid (the default), where a photo fills its cell cropped, or Aspect Ratio Grid, where each photo shows whole inside its square cell on the background; the cells stay square either way, so MG12 holds.
22. **MG22 · The view is kept.** Sort, tile size and grid shape are kept on the device and are as they were when Media is next opened, after a relaunch too; the filter and Years, Months or Days are not (MG9, MG19).

### Empty, live and fast

10. **MG10 · Empty in words.** With nothing kept, the gallery is one line: "Photos, videos and voice memos you keep show here." A filter with nothing shows one line for its kind ("No videos kept yet."). Never sample content.
11. **MG11 · Small copies only.** A photo tile loads its small copy, never the full file while a copy exists; a photo with no copy yet shows its kind's glyph and gets one made, as other previews do (TH2).
12. **MG12 · Any point at once.** In every view and size, the gallery's layout gives every row's offset and height before it is drawn, so a jump or a fling to any point lays out only what is on screen; over 5,000 pieces it is worked out in one pass.
13. **MG13 · Deletes leave at once.** A moment or a piece deleted, from the viewer opened here or anywhere else, leaves the gallery at once, while Undo waits and after (D5, D8, MS13); Undo brings it back.
14. **MG14 · What is new arrives.** A moment kept, or a walk finished, while the gallery was not in front is in it when Media is next shown; an edit saved in the viewer (a crop, a filter) shows on its tile at once.
15. **MG15 · Spoken tiles.** A tile is a button spoken by its kind, its time and its own moment's walk (its title, or its time of day and area), or its street, or "Not on a walk" ("Photo, 9:41 AM, a morning walk in Alfama"); never the day's whole line and never another walk's name. A header and a month's or year's title are headers to a screen reader; a month or year block is a button spoken by its title and place line; Years, Months and Days are tabs with the chosen one selected; the View menu's chosen items are checked.
16. **MG16 · The day stays on screen.** The header of the day whose tiles are at the top stays pinned under the gallery's bar while its tiles scroll, so a day and its place line are on screen whenever a tile is, after a jump too.
17. **MG17 · Not a capture screen.** Media shows no capture stack (0112); with a walk minimized, the recording bar keeps its camera on Media, and a photo taken there files into that walk.

## Record

- Built Nov 11, 2026, test-first (22 of 22 by history). Unit tests in `src/lib/__tests__/gallery/` (layout, view,
  copy, shell); the `gallery` journey checks MG1, MG2, MG4, MG6-MG11, MG13, MG15-MG17, MG19-MG21 on the web build.
- Found while building: a pinch on the web was the browser's page zoom (the grid now takes it, `touch-action:
  pan-y`); a month's tap lost its landing when the list remounted (now its initial row); a month with moments outside
  a walk read as if every picture were a walk's (", and outside a walk", MG19).
- Deferred: `docs/DEFERRED.md`, "media gallery". Native: `docs/NATIVE_UNVERIFIED.md`, "Media gallery". Not audited.
