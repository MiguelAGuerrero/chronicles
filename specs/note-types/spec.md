<!-- Repo first: written from the owner's request in a session (Nov 12), not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Note types: a mark for why a note was made

Nov 12, 2026 · @Miguel Guerrero

A note shows one generic glyph wherever it is drawn. The owner wants each note to carry a type they choose, a question
mark, an exclamation point, a happy face, so the mark says why the note was made.

## Vision

Idea: Each note can carry a type the owner assigns (a question, emphasis, an idea, happy, neutral, sad, like, dislike), so its mark says why it was made instead of showing the generic note icon.
Verb: honour (the moment keeps why it was made, as part of its context); return (a pin, a row or a card reads at a glance).
Touches: Never "A feed, followers, likes" (a type is the owner's own mark on their own note; nobody reacts to anyone); Never "Writing the owner's words for them" and the concept doc's "nothing is ever calculated for you" (the type is only ever chosen, never inferred from the text); Never "Celebration" and Always "Restraint" (plain ink glyphs, no colour, motion or emoji); Never "Editing out the lows" and Always "The lows stay in" (the set holds sad and dislike marks, not only bright ones); Never "A capture behind a menu, a drawer or an extra tap" (capture is unchanged; the type is set afterwards, in the note editor); Never "Scores" and Always "Counts are words" (no count of a type anywhere); precedent 0105 (an ink-coloured icon with a spoken name is how this app tells two kinds apart); `response-thread` RT10 bans reactions on responses, a different thing from a mark the owner puts on their own note.
Verdict: aligned if reshaped (the owner then reaffirmed thumbs and faces over the gate's warning: decision 0149)
Shape: A fixed set of eight ink glyphs (a question, emphasis, an idea, happy, neutral, sad, like, dislike), one per note, chosen in the note editor and changeable there. The glyph takes the place of the generic note glyph on the map pin, the Chronicle's moment picture, the viewer's note card and the thread screen's note bubbles, with a spoken name. A note with no type looks as it does today. Nothing counts types, filters by them or guesses them.
Criteria: NY1-NY17 below.
Open: none (answered Nov 12, see Decisions).

## Decisions (the owner's calls, Nov 12)

- **A small fixed set of ink glyphs**, not emoji and not any emoji: restraint, a spoken name for each, and a set that reads the same on every phone.
- **Eight marks** (decision 0149): Question, Emphasis (an insight or eureka, not "more important"), Idea, Happy, Neutral, Sad, Like, Dislike. Thumbs and faces kept over the gate's warning that they read as a rating; they are never counted, filtered, searched or applied to a place.
- **The thread screen's note bubbles carry the mark** (Nov 12).
- **One type per note**, so a pin has one mark and nothing needs a rule for which shows.
- **Notes only**, set in the note editor (writing a note in the viewer's Respond or editing one); capture stays one tap. Photos, videos and memos keep their own glyphs.
- **A nullable `note_type` on the capture record** (truth, kept by piece): SQLite migration 25 (the 25th entry of `MIGRATIONS`) and IndexedDB VERSION 20; a note made before reads as no type.

## Acceptance criteria

The set (`NOTE_TYPES`, in `src/lib/noteType.ts`), in this fixed order, which the menu keeps after "No type": `question` "Question", `emphasis` "Emphasis", `idea` "Idea", `happy` "Happy", `neutral` "Neutral", `sad` "Sad", `like` "Like", `dislike` "Dislike". Glyphs: help-circle, alert-circle, bulb, a happy face, a neutral mark, a sad face, a thumb up, a thumb down (Ionicons names fixed at build, checked against the installed font).

1. **NY1** The set is eight types in the fixed order above, each with a distinct glyph and a spoken name, and the lows are in it (sad and dislike); no type is named or ordered as better than another.
2. **NY2** A stored value outside the set (a newer build's, a bad row) reads as no type, never an error or a blank glyph.
3. **NY3** A note's mark is its type's glyph when it has one, and the generic note glyph when it has none; a photo, video or memo never takes a type's glyph.
4. **NY4** A note keeps its type through the database on both stores: set, changed, cleared, and a note kept before this slice reads as no type.
5. **NY5** The type is stored on the note's own piece, so one note in a stacked moment can be a question while its neighbour has none.
6. **NY6** The note editor offers the types in one labelled "Type" control (a menu of the eight and "No type", its current choice shown as glyph and name); choosing one changes nothing else about the note.
7. **NY7** Saving an edited note stores its text and its type together; a failed save puts both back in the viewer, as the text is put back today (QL25).
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

- **Finding 1** overruled by the owner (decision 0149): faces and thumbs stay; the steward's concern is met by the criteria that nothing counts, filters or applies a type to a place (NY12).
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
5. A Sad or Dislike mark on a map pin reads as a verdict at a place (steward S1): **reject**, the owner's call (Nov 12, asked in the audit): every type marks its pin; the pin is the owner's own note on their own map, shown to no one and read by nothing about a place (Explore draws no `CapturePinView`). Recorded in decision 0149.
6. The menu's order reads as a scale (S2): **reject**. The order is the owner's (0149); NY12 and NY13 forbid anything reading a position; column-major layout (audit 8) keeps Like apart from Sad.
7. "Like" and "Dislike" are rating words (S3): **reject**, the owner's call (0149).
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
18. VISION.md's "Never likes" line now disagrees with the code (steward): **reject** as a slice finding: it is the owner's edit, proposed in decision 0149. Listed in `docs/STATUS.md`, "Needs the owner".
19. A bare verdict glyph as a note's thumbnail in lists (steward): **reject**. `MomentPicture` draws only photos and videos; a note in a list carries its mark beside its words and its time.
20. The chosen menu row relied on a faint tint and a grey check (`ux-reviewer`): **accept**. A heavier label and an ink check. Test: `note-types audit 20` (`qol` journey).
21. The Type menu's radiogroup semantics and lost focus (`ux-reviewer`): **accept in part**: focus returns to the Type row after a choice (`note-types audit 21`, `qol` journey). The row already speaks its state ("Type, No type", expanded); a menu role instead of a radiogroup is deferred with 22.
22. Two columns at 200% text and 320 px (`ux-reviewer`): **defer**. At 320 px the cells are wide enough for "Emphasis" at the default size; a one-column fallback above a font scale of about 1.5 is recorded in `docs/DEFERRED.md`, with the menu roles.
23. Neutral (a dash in a circle) can be mistaken for "minus" (`ux-reviewer`): **defer**. Ionicons has no neutral face; `MaterialCommunityIcons` has one but adds a second icon font. The owner's call, recorded in `docs/DEFERRED.md`.
24. The card's label contrast (`ux-reviewer`): **reject**, already ink at 14 px (`note-types ui 2`).
25. The keyboard hides the menu (`ux-reviewer`): **reject**, fixed in the first audit (9, the card scrolls); closing the keyboard when the menu opens would lose the caret.

Journeys run after the fixes: `qol`, `threads`, `responses`, `resurface`, `stacks`, `upgrade`, `replay`, `days`, `chronicle`, `walk`, `edit`, `tabs`, once each (`qol` also once before the fix, red). Typecheck, lint and `npm test` pass.

