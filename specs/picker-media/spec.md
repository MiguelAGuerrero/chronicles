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
- **Every photo, video and voice memo**, captioned or not: the same pieces as Chronicle's Media; each tile is bare.

## Criteria

### The task, and where it is found

1. **MP1 · Browse by picture to connect.** In "Join it with another moment" (the viewer's More, Add to a thread, A new thread) a person can scroll photos, videos and voice memos as tiles and connect the moment of one to the moment they came from. Someone not told where the grid is finds it from the picker's screen: a two-word switch, **List** and **Media**, in words (never a symbol alone), sits directly under the picker's title, the first thing under it, and Media is one tap from the open picker.
2. **MP2 · Both pickers, one gallery.** The same switch and grid are in Mention a moment, whether it opens from a note's page (new, opened from the viewer's Edit or Respond, or a journal entry) or from the journal's open line. The two use one component, so a change to one is the other's.
3. **MP3 · The list is first and keeps its search.** The picker opens on List as today, with its search field and "Show more"; the search belongs to List and is gone while Media is shown. Back on List, the query is as it was left.

### The grid

4. **MP4 · Every piece but the one in hand.** Media shows one tile for every photo, video and voice memo piece of every kept moment, loose or in a finished walk, newest first, ties by id, as Chronicle's Media (MG3): a moment with three photos shows three tiles, a note has no tile, an open walk's pieces are left out (0098). The moment being connected or written from is never offered, and one waiting in Undo is not shown (OT5, owner-threads audit 4); it returns with Undo.
5. **MP5 · Bare tiles, a header for each day.** Tiles are as Chronicle's (MG4, MG5): a photo its small copy, a video its still with the play mark and its length, a memo a mic and its length; no caption, date, place or filename on a tile; edge to edge with hairline gaps. Tiles sit under a pinned header for each day carrying where (MG6, MG16), so no screen is only bare thumbnails. The phrases are `gallery/copy.ts`'s, asserted as there.
6. **MP6 · A kind filter.** A row of All, Photos, Videos, Memos under the switch shows only that kind's tiles and the days that have them; it is All again each time the picker opens. With a kind chosen, one line in words says so ("Videos only") and the All item is the way back.
7. **MP7 · No counts.** Nothing in Media counts: no "N photos", no total, no number in a header or the bar, no list size announced; the only digits are dates, times and lengths (MG7).
8. **MP8 · Empty in words.** With no photo, video or memo kept (other than the moment in hand), Media is one line: "Photos, videos and voice memos you keep show here."; a kind with none shows its line ("No videos kept yet."). Never sample content.

### Choosing

9. **MP9 · A tap marks, and one action picks.** A tap on a tile marks it, in ink with a check mark, never colour alone; a bar fixed under the grid says the marked moment's place, date and walk line (the line a list row has, `contextLine`) and its own words or its kind ("Voice memo"), and has one button: **Connect** in Join it with another moment, **Mention** in Mention a moment. Another tap moves the mark. Nothing is connected or mentioned until that button, and closing the picker writes nothing (OT6). With nothing marked the bar says nothing and has no button. This is a default the owner may overrule (a tap that picks outright, as a row does).
10. **MP10 · It does what a row does.** Connect makes the thread of the two moments exactly as a row does (OT5, OT6) and says "Connected"; Mention puts the same reference into the note (the same label as a row, `refLabel`) and returns to writing.
11. **MP11 · Spoken.** The switch and the filter are tabs with the chosen one selected; a tile is a button spoken by its kind, time and walk or street (MG15); a marked tile is spoken as selected; the bar's action is a button spoken with the moment's context.

### Where it is not

12. **MP12 · Not where nothing is a tile.** "Notes that mention it" (the viewer's list of the notes that mention a moment) has no switch and no grid: a note has no tile, so there is nothing to browse. The list stays as it is.

### Fits and stays quick

13. **MP13 · Inside the open dialog.** Media is drawn inside the picker's card, inside the open viewer's or note's Modal, never a second Modal (iOS can't present one over another); the card is as wide as today's picker (520 pt at most), the switch, the filter and every tile are 44 pt or more, and at 320 px and the default text size nothing wraps or is cut.
14. **MP14 · Small copies, any point at once.** A photo tile loads its small copy, never the full file while a copy exists (MG11); the grid's rows have known heights, so a fling to any point lays out only what is on screen (MG12).
15. **MP15 · Nothing new is kept.** The gallery's saved view (sort, tile size, grid shape) is read as Chronicle's Media keeps it and never written from the picker; the picker's filter and mark are not kept.

## Record

Not built yet.
