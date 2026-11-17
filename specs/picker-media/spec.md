<!-- Repo first: written from the owner's request in a session (Nov 17), not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Picker media: browse photos, videos and memos when connecting moments

Nov 17, 2026 · @Miguel Guerrero

Connecting a moment to another (Add to a thread, "A new thread") or mentioning one in a note means choosing a second moment from
a list of rows: its words, its place and date. A photo, a video or a voice memo with no words is a row that says "Photo" or
"Voice memo", so the owner cannot tell which one it is without leaving the picker. The owner asks for a media gallery in the picker,
very like Chronicle's Media (`specs/media-gallery`), to scroll through photos, videos and voice memos by what they look like.

## Vision

Idea: When connecting a moment to another to make a thread, browsing for videos and photos is hard because there is no preview; a media gallery, like Chronicle's Media, to scroll through photos, videos and voice memos.
Verb: return (a moment brought back by what it looks like, to be joined to another in a thread).
Touches: Always "A moment carries its context ... It never appears as a bare thumbnail, filename or count"; Never "Tallies" and Always "Counts are words" (0052); 0139 (Media: bare tiles, the day header says where); 0125 (a note references moments with @); owner-threads OT5, OT6 (nothing is made without two kept moments); `ui-patterns.md` (one modal at a time, a segmented control of few nouns, targets 44 pt).
Verdict: aligned if reshaped
Shape: In the two pickers that choose a moment (Join it with another moment; Mention a moment), a List | Media switch under the title. Media is Chronicle's Media grid (bare square tiles, one per photo, video or memo piece, under a pinned header per day that says where), with a kind filter. A tile is never a bare pick: a tap marks it and a bar under the grid says the moment's place, date, walk and its own words (or its kind), with the one action (Connect, or Mention); only that action picks. No count anywhere. The list and its search stay the default.
Criteria: MP2-MP5, MP7, MP12 below come from the gate.
Open: none (the owner chose the switch, both pickers, and every photo, video and memo, Nov 17).

## Decisions (the owner's calls, Nov 17)

- **"Canonical speech" is Chronicle's Media** (the grid of photos, videos and memos under day headers): the picker's gallery is that grid.
- **A List | Media switch at the top** of the picker; the list and its search stay, the grid is the other half.
- **Both pickers**: Join it with another moment (Add to a thread, from the viewer) and Mention a moment (a note, a journal entry). One shared gallery, so they stay alike.
- **The baseline view controls are in** (Nov 17): Years, Months and Days, the View menu (Sort, Size, Grid) and pinch, as Chronicle's Media has them; sort, size and shape are local to the picker.
- **Every photo, video and voice memo**, captioned or not: the same pieces as Chronicle's Media; each tile is bare.

## Criteria

### The task, and where it is found

1. **MP1 · Browse by picture to connect.** In "Join it with another moment" (the viewer's More, Add to a thread, A new thread) a person can scroll photos, videos and voice memos as tiles and connect the moment of one to the moment they came from. Someone not told where the grid is finds it from the picker's screen: a two-word switch, **List** and **Media**, in words (never a symbol alone), sits directly under the picker's title, the first thing under it.
2. **MP2 · Every place a moment is mentioned from.** The same switch and grid are in Mention a moment wherever a note page or the journal offers it: the journal's open line, a new note page, a note opened from the viewer's Edit or Respond, a journal entry, and a note written from the walk's pencil, Navigate's bar or the planner's capture. Both pickers show the same words, the same order and the same marks (the journey covers the journal-entry and viewer hosts; the in-walk hosts share the one `MomentPicker`, which a source check holds). Without scrolling, at 320 px, at first paint and with the on-screen keyboard open, **List** and **Media** are visible and Media is one tap away.
3. **MP3 · The list is first and keeps its search.** The picker opens on List as today, with its search field and "Show more"; the search belongs to List and is gone while Media is shown. Back on List, the query and its results are as they were left (its scroll position is not promised).

### The grid

4. **MP4 · Every piece but the one in hand.** Media shows one tile for every photo, video and voice memo piece of every kept moment, loose or in a finished walk, newest first, ties by id, as Chronicle's Media (MG3): a moment with three photos shows three tiles, a note has no tile, an open walk's pieces are left out (0098). The moment being connected or written from is never offered, and one waiting in Undo is not shown (OT5, owner-threads audit 4); it returns with Undo. A moment already in the thread being joined is offered as a List row is today (the list does not leave it out).
5. **MP5 · Bare tiles, a header for each day.** Tiles are as Chronicle's (MG4, MG5): a photo its small copy, a video its still with the play mark and its length, a memo a mic and its length; no caption, date, place or filename on a tile; edge to edge with hairline gaps. Tiles sit under a pinned header for each day carrying where (MG6, MG16), so no screen is only bare thumbnails. Headers and tiles read and are spoken as Chronicle's Media's do.
6. **MP6 · A kind filter.** A row of All, Photos, Videos, Memos under the switch shows only that kind's tiles and the days that have them; it is All again each time the picker opens. With a kind chosen, one line in words says so ("Videos only") and the All item is the way back. A mark hidden by the filter stays, and the bar still names it; the mark also survives a trip to List and back.
7. **MP7 · No counts.** Nothing in Media counts: no "N photos", no total, no digit in a header or the bar, and no accessibility name, hint or value (the filter row, the switch's "1 of 2", a list size) carries one; the only digits are dates, times and lengths (MG7). A count the place line already says is a word in a clause, as Chronicle's Media says it ("and two other walks", 0052).
8. **MP8 · Empty in words.** With no photo, video or memo kept (other than the moment in hand), Media is one line: "Photos, videos and voice memos you keep show here."; a kind with none shows its line ("No videos kept yet."). Never sample content.

### Choosing

9. **MP9 · A tap marks, and one action picks.** A tap on a tile marks its **moment**: every tile of that moment is ringed in ink with a check mark, never colour alone, and the bar names it once. Another tap moves the mark. A bar fixed under the grid says the marked moment's place or street, its date and its time of day, its walk, and its own words (the caption or note) or else its kind ("Photo", "Video", "Voice memo"), and has one button: **Connect** in Join it with another moment, **Mention** in Mention a moment. Nothing is connected or mentioned until that button, and closing the picker writes nothing (OT6). With nothing marked the bar's space is kept and says nothing, so the grid does not move when a mark is made.
10. **MP10 · It does what a row does.** Connect makes the thread of the two moments exactly as a row of List does (OT5, OT6) and says "Connected"; Mention puts the reference a row would put into the note and returns to writing, as before.
11. **MP11 · Spoken.** The switch and the filter are tabs with the chosen one selected; a tile is a button spoken by its kind, time and walk or street (MG15); a marked tile is spoken as selected; the bar's action is a button spoken with the moment's context.

### The baseline view controls (the owner, Nov 17)

16. **MP16 · Years, Months, Days.** Under the switch, Media has Years | Months | Days as Chronicle's has (MG19), Days at first: a block per month or year with its cover and where, in Chronicle's words; a tap on a month opens Days at it, a tap on a year opens Months at it. A block is never itself picked: only a tile is, in Days.
17. **MP17 · A View menu: Sort, Size, Grid.** A button on that bar opens the gallery's menu with Sort (Newest First, Oldest First), Size (Zoom In, Zoom Out) and Grid (Square Photo Grid, Aspect Ratio Grid), as MG18, MG20 and MG21; a choice applies at once. The kind filter is the row of MP6, not repeated in the menu. The menu is drawn inside the picker's card (MP13), not as a second Modal.
18. **MP18 · Pinch.** In Days, pinching out shows fewer, larger tiles and pinching in more, smaller ones, in three steps; Zoom In and Zoom Out do the same, so the gesture is never the only way. The scroll stays on the day that was at the top (MG20). A tile is never under 44 pt.
19. **MP19 · The bar still fits.** At 320 px and the default text size the switch, the Years | Months | Days control with its menu button, and the kind row each stay in one row, none wrapped or cut, each a target of 44 pt or more (MP13); the grid and the mark's bar keep room to be used, with the keyboard closed.

### Where it is not

12. **MP12 · Not where nothing is a tile.** "Notes that mention it" (the viewer's list of the notes that mention a moment) is the one picker with no switch and no grid: a note has no tile, so there is nothing to browse, and finding a note by its words in Media is out of scope. The list stays as it is.

### Fits and stays quick

13. **MP13 · Inside the open dialog.** Media is drawn inside the picker's card, so one dialog is open at any time (iOS can't present a Modal over a Modal); the card is as wide as today's picker (520 pt at most), the switch, the filter and every tile are 44 pt or more, and at 320 px and the default text size nothing wraps or is cut.
14. **MP14 · Small copies, any point at once.** A photo tile loads its small copy, never the full file while a copy exists (MG11); a fling to any point shows tiles at once, with no blank rows (MG12).
15. **MP15 · Nothing new is kept.** The picker opens at the sort, tile size and grid shape set in Media; what is chosen in the picker (MP16-MP19) holds while it is open and is then gone: it never changes Media, never writes to the device, and a new open starts from Media's again. The filter and the mark are not kept either.

## Record

Built Nov 17, 2026, test-first (19 of 19 by history). Unit tests `src/lib/__tests__/threads/pickerMedia.test.ts`; the `pickermedia` journey checks MP1-MP19 on the web build. Found while building: a moment dated later today is not in the pool before that hour (the journey seeds in the past); the zoom bar's segments were 40 pt, so the picker's bar takes `tall` (44). Native: `docs/NATIVE_UNVERIFIED.md`, "Media gallery". The in-walk note hosts (the walk's pencil, Navigate's bar, the planner) are held by the source check, not driven in a journey.

## Audit

Nov 17, 2026, at the owner's request: the auditor (A1-A11), the steward (S8-S11) and the ux-reviewer (U11-U17), with a cold find (U1-U10) before them: all five tasks in the owner's words were found from the pictures alone. Triage:

1. Streets of loose moments stay blank on a cold open (A2): accept. The shell keeps ids asked before its moments are read and reads them when they come. Test: `picker media audit 1` (`gallery/shell.test.ts`).
2. A marked moment that goes to Undo keeps its bar (A5): accept. `markStillOffered`; a kind filter does not count. Test: `picker media audit 2`.
3. Two taps on Connect make two threads (A9): accept. Test: `picker media audit 3` (source check, and the journey's double click).
4. The keyboard stays up under Media in Mention (A4): accept; device-only. `Keyboard.dismiss()` on entering Media. Test: `picker media audit 4` (source check); the phone check is in `docs/NATIVE_UNVERIFIED.md`.
5. The saved view arrives after first paint (A6): accept. The grid waits for `loadView`. Test: the journey's `picker media audit 5` (a saved size of five across).
6. The bar says less than its tile (S8): accept. A loose moment's street stands in for its place. Test: `picker media audit 6`.
7. MP7 against Chronicle's counted-in-words clauses (S9): accept as wording: MP7 now says it. Test: `picker media audit 7` (a day of four walks has no digit).
8. The options button is a bare glyph (cold U1, U11): accept. The picker's button says "View". Test: the journey's `picker media audit 8, 9`.
9. At 320 px the bar cuts the walk line (A3, U14): accept. Up to three lines. The title that wraps (U17) is rejected, 19. Test: the same check.
10. `mark` rebuilt every render (A7): accept. Covered by typecheck and the journey's flow; no render-count test.
11. Back and Escape with the inline View menu open close the whole picker and drop the mark (A1): defer. A native Back inside a Modal can't be taken from JS; it needs a Back protocol across the three hosts (an architectural call). `docs/DEFERRED.md`, and a device check.
12. A stale scroll offset after a zoom swap (A10): defer. `MediaScreen` has the same; one fix for both. `docs/DEFERRED.md`.
13. The viewer's own close and More circles sit over the picker's scrim (U15): defer. Older than this slice (Add to a thread has always had it); `docs/DEFERRED.md`.
14. Three rows of controls cost 170 px, and the kind row repeats the View menu's Show (U12, A UI note): the owner's call: kept as the plan's accepted cost (MP19); the owner may move the kind row into View. `docs/STATUS.md`, "From picker media's audit".
15. A failed read prints the empty line (A8): reject. The line is the app's own instruction ("... you keep show here"), the same as Chronicle's Media (MG10) and List's; a read error is `useMomentPool`'s existing path.
16. Duplicate test ids under Chronicle's mounted Media (A11): reject. The journey scopes by `picker-media`; every overlay of the app has the screen behind it.
17. Muted grey on tabs and subtitles (U10, U13): reject. Measured: `theme.muted` is 4.66:1 on the tabs' ground and 6.14:1 on white, over 4.5:1.
18. A hint in the bar's empty space (U16): reject. MP9 chose silence; the owner may overrule.
19. The card's title wraps at 320 px (U17): reject. The title is Add to a thread's own copy (OT5), not a control row.
20. Years and Months covers read as a pick (S10): reject. A block is never picked (`pickerRows` months are all blocks, MP16), and the cover is Chronicle's plain first-piece rule.
21. In-walk hosts held only by a source check (S11): noted; `docs/NATIVE_UNVERIFIED.md`.

21 triaged: 10 accepted and fixed, 3 deferred, 1 to the owner, 6 rejected, 1 noted. Journeys run: `pickermedia` (six runs, two since the fixes), `gallery` and `threads` twice, `responses` and `videothumbs` once each. `threads` failed twice at OT8 (a stored read 800 ms after the Undo dismiss) under load while the picker's journey ran beside it, then passed three times on unchanged code; `e2e:baseline` passed 3/3 on main, so it is not recorded as a known flake.
