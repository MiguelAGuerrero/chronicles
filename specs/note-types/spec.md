<!-- Repo first: written from the owner's request in a session (Nov 12), not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Note types: a mark for why a note was made

Nov 12, 2026 · @Miguel Guerrero

A note shows one generic glyph wherever it is drawn. The owner wants each note to carry a type they choose, a question
mark, an exclamation point, a happy face, so the mark says why the note was made.

## Vision

Idea: Each note can carry a type the owner assigns (a question, emphasis, an idea, happy, neutral, sad, like, dislike), so its mark says why it was made instead of showing the generic note icon.
Verb: honour (the moment keeps why it was made, as part of its context); return (a pin, a row or a card reads at a glance).
Touches: Never "A feed, followers, likes" (a type is the owner's own mark on their own note; nobody reacts to anyone); Never "Writing the owner's words for them" and the concept doc's "nothing is ever calculated for you" (the type is only ever chosen, never inferred from the text); Never "Celebration" and Always "Restraint" (plain ink glyphs, no colour, motion or emoji); Never "Editing out the lows" and Always "The lows stay in" (the set holds sad and dislike marks, not only bright ones); Never "A capture behind a menu, a drawer or an extra tap" (capture is unchanged; the type is set afterwards, in the note editor); Never "Scores" and Always "Counts are words" (no count of a type anywhere); precedent 0105 (an ink-coloured icon with a spoken name is how this app tells two kinds apart); `response-thread` RT10 bans reactions on responses, a different thing from a mark the owner puts on their own note.
Verdict: aligned if reshaped (the owner then reaffirmed thumbs and faces over the gate's warning: decision 0161)
Shape: A fixed set of eight ink glyphs (a question, emphasis, an idea, happy, neutral, sad, like, dislike), one per note, chosen in the note editor and changeable there. The glyph takes the place of the generic note glyph on the map pin, the Chronicle's moment picture, the viewer's note card and the thread screen's note bubbles, with a spoken name. A note with no type looks as it does today. Nothing counts types, filters by them or guesses them.
Criteria: NY1-NY17 below.
Open: none (answered Nov 12, see Decisions).

## Decisions (the owner's calls, Nov 12)

- **A small fixed set of ink glyphs**, not emoji and not any emoji: restraint, a spoken name for each, and a set that reads the same on every phone.
- **Eight marks** (decision 0161): Question, Emphasis (an insight or eureka, not "more important"), Idea, Happy, Neutral, Sad, Like, Dislike. Thumbs and faces kept over the gate's warning that they read as a rating; they are never counted, filtered, searched or applied to a place.
- **The thread screen's note bubbles carry the mark** (Nov 12).
- **One type per note**, so a pin has one mark and nothing needs a rule for which shows.
- **Notes only**, set in the note editor (writing a note in the viewer's Respond or editing one); capture stays one tap. Photos, videos and memos keep their own glyphs.
- **A nullable `note_type` on the capture record** (truth, kept by piece): SQLite migration 27 (the 27th entry of `MIGRATIONS`, after note pages' `body_format` and the neighborhood boundaries' `hoods`) and IndexedDB VERSION 20; a note made before reads as no type.

## Acceptance criteria

The set (`NOTE_TYPES`, in `src/lib/noteType.ts`), in this fixed order, which the menu keeps after "No type": `question` "Question", `emphasis` "Emphasis", `idea` "Idea", `happy` "Happy", `neutral` "Neutral", `sad` "Sad", `like` "Like", `dislike` "Dislike". Glyphs: help-circle, alert-circle, bulb, a happy face, a neutral mark, a sad face, a thumb up, a thumb down (Ionicons names fixed at build, checked against the installed font).

1. **NY1** The set is eight types in the fixed order above, each with a distinct glyph and a spoken name, and the lows are in it (sad and dislike); no type is named or ordered as better than another.
2. **NY2** A stored value outside the set (a newer build's, a bad row) reads as no type, never an error or a blank glyph.
3. **NY3** A note's mark is its type's glyph when it has one, and the generic note glyph when it has none; a photo, video or memo never takes a type's glyph.
4. **NY4** A note keeps its type through the database on both stores: set, changed, cleared, and a note kept before this slice reads as no type.
5. **NY5** The type is stored on the note's own piece, so one note in a stacked moment can be a question while its neighbour has none.
6. **NY6** The page of a note being edited offers the types in one labelled "Type" tool in its bar (a menu of the eight and "No type" above the bar; the tool shows the current choice's glyph and says its name); choosing one keeps it at once and changes nothing else about the note.
7. **NY7** A note saved with a type stores its text and its type together; a type chosen on the page is kept at once by itself, leaving the words and their format as kept; a failed save puts the type back in the viewer.
8. **NY8** A note saved with a type left as it was, or with none chosen, is unchanged by the editor: capture takes no extra tap, and the composers that exist today (the capture band, the stack's note, the walk's note) make a note with no type.
9. **NY9** The viewer's note card shows the type's glyph and its spoken name above the note's text; a note with no type shows neither.
10. **NY10** A pin of exactly one note with a type wears the type's glyph in place of the generic note glyph, and says it ("Note, idea"); a pin of several captures keeps its kind's glyph and its count; any picture drawn for a note falls back to the type's glyph.
11. **NY11** A screen reader hears the type by its spoken name wherever its glyph is drawn, and the glyph is never the only way to tell the types apart: all eight are drawn in the one ink colour (a test asserts a single colour), so shape and name carry it, never colour.
12. **NY12** No count of a type appears: no "3 questions", no tile, no tally, and nothing sorts, filters or searches notes by type, and no like or dislike is read by Explore, a place, a route or any recommendation.
13. **NY13** Nothing sets a type from a note's text, its time or its place: a type exists only because the owner chose it.
14. **NY14** The backup bundle and the web store's export keep the type with the note.
15. **NY15** A response note made in Respond has no type until Edit sets it (steward).
16. **NY16** Every place that offers Edit on a note passes the type through its save (`onSaveNote(c, body, type)`), so saving never drops or clears a type unasked (steward).

17. **NY17** A note's bubble on the thread screens (the walk's thread, an owner's thread) wears its type's glyph with its spoken name; a note with no type is drawn as today.

## Steward triage (Nov 12)

- **Finding 1** overruled by the owner (decision 0161): faces and thumbs stay; the steward's concern is met by the criteria that nothing counts, filters or applies a type to a place (NY12).
- **Finding 2** accepted: fixed order, single ink colour asserted (NY1, NY11).
- **Finding 3** answered: the second type is "Emphasis", an insight or eureka.
- **Callers undercounted** accepted: twelve call sites, listed in the plan; NY16.
- **Pin data** accepted: only a pin of exactly one capture that is a note wears a type; a pin of several keeps its kind glyph and count (NY10).
- **NY12's grep test** accepted: the test asserts the public API, no function taking types and returning a count or filter, with a scan only as a backstop that lists no files.
- **Response note** accepted as NY15.
- **Thread bubbles**: the owner chose to carry the mark (NY17). Search results: a later slice goes through the gate again.

## Record

Built Nov 12, 2026. All of NY1-NY17 pass: the model and the note save in unit tests (`captures/noteType`, `noteSave`,
`noteTypeScan`, `bundle`), the stores in `dbContract` (the fake, IndexedDB and SQLite over `node:sqlite`), the screens in
the `qol` (NY6, NY8-NY11), `threads` (NY15, NY17) and `responses` (NY15) journeys. Also green on their latest run:
`upgrade`, `chronicle`, `stacks`, `resurface`, `walk`, `edit`, `replay`, `days`, `tabs`, `gallery`. Typecheck, lint and
`npm test` (1975) pass. Native code (SQLite migration 25, the menu on a phone) has not run on a device: two items in
`docs/NATIVE_UNVERIFIED.md`. Not audited (the owner has not asked).

UI review (decision 0145), three pictures read by the `ux-reviewer`:
- **UI finding 1** (one column, not two): rejected. Nine rows at 44 in one column show five without a scroll and hide four of the set; two columns show all nine in the same height (the first build's picture showed the scroll). Opinion in the review; no source.
- **UI finding 2** (the Type row looks static): accepted, `note-types ui 1` (a chevron, up when open).
- **UI finding 3** (the mark's name small and grey): accepted, `note-types ui 2` (ink, 14 px).
- **UI finding 4** (the viewer's round buttons stay lit over the editor's scrim): deferred, recorded in `docs/DEFERRED.md`; every editor in the viewer does this, none is this slice's.

## Audit (Nov 12, 2026)

The auditor, the steward and the `ux-reviewer` ran on the built slice and its three pictures. 11 findings: 4 fixed, 3 deferred, 4 rejected.

1. A note typed in a stacked moment patched the moment's face on screen (`applyPatch` by moment id; the auditor's F1): **accept**. Fixed: every note save skips the list and bus patch unless the note is shown at its face's piece (`isFacePiece`). Test: `note-types audit 1` (`captures/noteSave.test.ts`).
2. No test of a pin's spoken name through `CapturePinView`, and the marker is rebuilt (focus lost) when a type changes (F2): **defer**. The label is unit-tested (`pinNoteLabel`, NY10); the e2e's pin is always a group. In `docs/DEFERRED.md`.
3. A plain bubble says its type twice on the web (F3): **accept**. Fixed: `NoteMark quiet`, hidden from a screen reader inside a named group. Test: `note-types audit 3` (`threads` journey).
4. An unknown stored value cannot be cleared by choosing "No type" (F4): **reject**. NY2: an unknown value reads as no type, so there is nothing shown to clear, and leaving a newer build's value alone is the safer way.
5. A Sad or Dislike mark on a map pin reads as a verdict at a place (steward S1): **reject**, the owner's call (Nov 12, asked in the audit): every type marks its pin; the pin is the owner's own note on their own map, shown to no one and read by nothing about a place (Explore draws no `CapturePinView`). Recorded in decision 0161.
6. The menu's order reads as a scale (S2): **reject**. The order is the owner's (0161); NY12 and NY13 forbid anything reading a position; column-major layout (audit 8) keeps Like apart from Sad.
7. "Like" and "Dislike" are rating words (S3): **reject**, the owner's call (0161).
8. The two-column menu scans row by row, and the chosen row has only a tick (`ux-reviewer` U5): **accept**. Fixed: five rows down the left, four down the right, the chosen row tinted. Test: `note-types audit 8` (`qol` journey).
9. The editor card can push Save off a small screen or under the keyboard with the menu open (U6): **accept**. Fixed: the card scrolls within the room it has. Test: `note-types audit 9` (`qol` journey, 320 x 520).
10. The mark's name small and grey on the card (U7): **reject**, already ink at 14 px (`note-types ui 2`); the pager sharing the meta row is the viewer's own.
11. The thread bubbles' ⋯ buttons are small targets (U8): **defer**, not this slice's (the bubbles' More predates it). In `docs/DEFERRED.md`.

Journeys run after the fixes: `qol` (twice, red then green), `threads` (twice), `responses` (once). Typecheck, lint and `npm test` pass. Native code is unverified.

### Second audit (Nov 13, 2026)

The auditor, the steward and the `ux-reviewer` ran again, told what the first round settled. 14 findings (12-25): 7 fixed, 2 deferred, 5 rejected. The auditor read the code and did not open the pictures.

12. Split out of an edited note took the stale copy in the row's `pieces` (old words and type): **accept**. Fixed with 13: a note save names its piece, and `patchFaced` updates that piece's copy in the row as well as the face. Test: `note-types audit 12, 13` (`captures/noteSave.test.ts`).
13. A note edited at a non-face piece read old after the stack was reopened (the first audit's guard gave the save nowhere to land): **accept**, same fix and test.
14. A cleared type read `null` on the web store and the fake but left no field on SQLite: **accept**. Both now leave no field. Test: `note-types audit 14` (`dbContract`, all three stores).
15. The guard test could not stop a later place, route or recommendation feature from reading types (steward): **accept**. Replaced by an allowlist of the files that may mention a type, and a check that no place, route, area, discovery, landing or walkability code does. Test: `note-types audit 15` (`captures/noteTypeReaders.test.ts`; it passed on first run, since nothing broke the list: a guard, not a fix).
16. The spoken label said the type on the resurfaced card, which draws no mark: **accept**. `momentSpoken(..., typed)`: said only where the mark is drawn (Lately rows and the thread bubble); the resurfaced card passes `false`. Test: `note-types audit 16` (a source check in `noteTypeReaders.test.ts`, as the label lives in a component).
17. Label the Type row "Type of this note" so it reads as the owner's own mark (steward): **reject**. The editor is the owner's own note; nothing there suggests another person's reaction.
18. VISION.md's "Never likes" line now disagrees with the code (steward): **reject** as a slice finding: it is the owner's edit, proposed in decision 0161. Listed in `docs/STATUS.md`, "Needs the owner".
19. A bare verdict glyph as a note's thumbnail in lists (steward): **reject**. `MomentPicture` draws only photos and videos; a note in a list carries its mark beside its words and its time.
20. The chosen menu row relied on a faint tint and a grey check (`ux-reviewer`): **accept**. A heavier label and an ink check. Test: `note-types audit 20` (`qol` journey).
21. The Type menu's radiogroup semantics and lost focus (`ux-reviewer`): **accept in part**: focus returns to the Type row after a choice (`note-types audit 21`, `qol` journey). The row already speaks its state ("Type, No type", expanded); a menu role instead of a radiogroup is deferred with 22.
22. Two columns at 200% text and 320 px (`ux-reviewer`): **defer**. At 320 px the cells are wide enough for "Emphasis" at the default size; a one-column fallback above a font scale of about 1.5 is recorded in `docs/DEFERRED.md`, with the menu roles.
23. Neutral (a dash in a circle) can be mistaken for "minus" (`ux-reviewer`): **defer**. Ionicons has no neutral face; `MaterialCommunityIcons` has one but adds a second icon font. The owner's call, recorded in `docs/DEFERRED.md`.
24. The card's label contrast (`ux-reviewer`): **reject**, already ink at 14 px (`note-types ui 2`).
25. The keyboard hides the menu (`ux-reviewer`): **reject**, fixed in the first audit (9, the card scrolls); closing the keyboard when the menu opens would lose the caret.

Journeys run after the fixes (all green): `qol`, `threads`, `responses`, `resurface`, `stacks`, `upgrade`, `replay`, `days`, `chronicle`, `walk`, `edit`, `tabs`, once each (`qol` also once before the fix, red). Typecheck, lint and `npm test` pass.



### Merge with note pages (Nov 13, 2026)

Before deploying, `main` was 213 commits ahead, among them note pages (decision 0151), which replaced the note editor
with a full-screen page that saves as it is written. The slice was merged onto it and reconciled: the Type menu moved to
a **Type tool in the page's bar** (`NotePage`, `NoteTypeMenu`; shown for an edit only, never for a new note's page or
Respond's: NY15); `notePatch(body, type, typeOnly)` carries `body_format` beside `note_type`, and a type chosen on its own
never rewrites the words or marks an older note as Markdown; the note's mark sits above the viewer's page; the migration
became 27 and the decision 0161 (main's 0149 is the bar's Edit offer); the bus's piece id (voice trim) carries a note's
piece. The resurfaced card (deleted on main by the journal) took its audit-16 change with it. The slice's journeys were
re-pointed at the page (`note-input`, `note-done`, the Type tool in place of the Type row; `note-types ui 1` now asks that
the tool shows pressed, and audit 9 that the menu and the bar stay in view at 320 x 520).

## A type at capture, by choice (added Nov 13, the owner's call)

The journal replaced the moment card and the capture band, and with them the places a type was seen and set: on the journal a type could be chosen only on the note's page, two taps away. The owner: "a quick button or fill-in slot the user can press"; "I wouldn't want there to be a gate on writing by selecting what note you're trying to represent. That should be an opt-in rather than a point of friction"; and it is a note's type, never a "stamp".

### Vision (Nov 13)

Idea: A note's type is an opt-in mark you can add while capturing, in the journal and on a walk, and never a step before writing.
Verb: honour (the moment keeps why it was made, chosen at the moment itself).
Touches: Always "Capture is one tap away" and Never "A capture behind a menu, a drawer or an extra tap" (writing never waits on a type); Never "A feed, followers, likes" as settled by decision 0161; Always "Restraint" and Never "Nagging" (one faint slot, not eight faces above every note).
Verdict: aligned if reshaped
Shape: The word stays "Type" (not "reaction": the word for likes on someone else's post). One slot, in the corner of the entry being written, opens the eight in the bar for one pick; a kept entry shows its glyph in that corner and changes it from More; a new note's page, on a walk or anywhere, carries the page's own Type tool. A type marks a note that has words and never keeps a moment by itself.
Criteria: NY18-NY25 below.
Open: none. The owner chose the corner, the bar as the picker and "write first" on a walk (Nov 13); the gate argued once for a slot over a row always in view on a walk, and the owner said to proceed with the defaults.

18. **NY18** In the journal nothing about a type is on screen before the entry being written has its first character: no slot, no row, no glyph.
19. **NY19** Once it has, a slot named "Type" sits at the trailing end of that entry's dateline. A tap on it opens the eight just above the bar, in the fixed order, each with its glyph and its name in words, and the slot shows that it is open; a tap on one marks the note and the eight leave, with the caret still on the page; a tap on the marked one clears it; a tap on the slot again closes them. (Amended by the audit the same day: first built as a row of glyphs in place of the bar.)
20. **NY20** Choosing is never a step: writing, Done, the camera and the mic stay in the bar, in their places, while the eight are open, and the next character typed closes them.
21. **NY21** A type chosen in the journal is kept at once on the note's own piece and is there after Done and after the app is opened again.
22. **NY22** A note with a type shows its glyph and its name above its words on the journal's page, as the viewer does (NY9), from the moment it is chosen: Done moves nothing. A note with none shows nothing. (Amended by the audit: first built as a bare glyph in the dateline's corner, which read as a button beside More.)
23. **NY23** An entry's More offers "Type" when the entry has a note, and shows the eight and "No type" in that same sheet, by themselves under the word Type; choosing one keeps it and closes the sheet.
24. **NY24** A new note's page (on a walk, from the ready screen, from the journal's line) carries the page's Type tool. A type chosen there, before or after the first words, is on the note when it is kept; choosing none keeps a note with no type; a page left without words keeps nothing, whatever was chosen. This amends NY8's "the composers that exist today make a note with no type": they still do, unless the owner chooses one.
25. **NY25** At 320 px the eight are two rows of four, nothing cut, each target 44 px or more both ways.

### Record (Nov 13, branch `fix/journal-audit-2`)

- **Built:** NY18-NY25, tests first at the commit before. `pickType` and `typeForNewNote` in `lib/noteType.ts`; the slot and the corner glyph in the journal's `Entry`; the row of eight in `OpenLine`'s bar (asked for through its handle, saved by `resurface.saveNote`, so the page shows it at once); Type in `MemoryMenu`, the existing `NoteTypeMenu` in the same sheet; the Type tool on `NewNotePage`.
- **Defaults taken, the owner having said to proceed:** a type needs a note (a glyph alone keeps nothing); on a walk the page's own Type tool, one tap to open, not a row of eight always in view; the slot's resting glyph is a plain tag.
- **Checked:** unit tests `captures/typePick` (NY19, NY24); the `journal` journey (NY18-NY23, NY25) and `notepage` (NY24, and NP4 now names the Type tool on a new page).
- **Native:** none of it has run on a device.

### Audit of NY18-NY25 and the journal's bar (Nov 13)

Report-only passes by the auditor (55-65), the steward (S4-S8) and the UX reviewer (U11-U20) over NY18-NY25 and chronicle-journal audit 50-54, triaged. 26 findings: 21 fixed, 3 deferred, 2 rejected. The first build put the eight in the bar's own row, as glyphs alone; the steward and the UX reviewer both found it nameless, without a way out, 38 px wide at 320 and lying where Done, the mic and the camera come back under the same finger. It was rebuilt as a named panel above the bar, which settles S4, S6, U11, U12, U14 and U15, and NY19, NY20, NY22, NY23 and NY25 were amended to say so. Regression checks, todos first: `note-types audit 56` and `63` and `chronicle-journal audit 60` in the `journal` journey; the amended NY checks cover the rest.

- audit 55: Respond's page offered Type (NY15): accept. The Type tool is on a capture surface's page only (`typed`); the `responses` and `threads` journeys' own checks hold it.
- audit 56: the eight outlived their entry and left the bar with no camera, mic or Done: accept. They belong to the note being written on the screen in front, and the bar is never replaced.
- audit 57: the corner and More's Type meant different notes: accept. The mark is above its own note; More's Type marks the note that has a type, else the first.
- audit 58: a failed type write after a new page's first keep kept the note twice: accept. The keep never fails for its type. No automated test (it needs a store failure between two writes).
- audit 59: type saves fail silently and never reach the session copy: the unhandled rejection, accept; saying it and the session copy, defer.
- audit 60: the pen stayed in the bar after the page remounted: accept.
- audit 61: a band where neither pen existed: accept (the pen is in the bar until the empty page shows above it).
- audit 62: no recording mark while typing in a thread: accept.
- audit 63: More reopened on the type grid: accept.
- audit 64: a quick second ask reads the old type: defer.
- audit 65: the recording mark was a labelled View with no role: accept (an image). The kept glyph in the corner is gone with steward 7.
- steward 4: the row read as a scale of faces and thumbs, without names: accept. Names in words; two rows of four.
- steward 5: Like and Dislike sat above "Show less like this": accept. The eight take the sheet by themselves.
- steward 6: the camera, the mic, Done and the recording mark went while the row was open: accept.
- steward 7: a kept entry's mark was a bare glyph beside More: accept. Glyph and name above the words, as the viewer draws it.
- steward 8: the slot's resting glyph is a tag: reject. It is the glyph the page's Type tool rests on, and the UX reviewer passed it.
- ux 11, 12, 14, 15: no way out, no names, 38 px targets, type buttons under Done's finger: accept, the panel.
- ux 13: Neutral reads as "remove", and no "No type" above the bar: defer.
- ux 16: the slot showed no open state: accept.
- ux 17: the slot and More were 40 px apart: accept.
- ux 18: as steward 7.
- ux 19: the grid in More had no heading and shared the sheet: accept (heading, alone); "No type" without a glyph is `NoteTypeMenu`'s own, left.
- ux 20: the recording mark is a bare dot: reject, opinion; it is the recording bar's own dot, said by name.
- **Native:** none of it has run on a device.

