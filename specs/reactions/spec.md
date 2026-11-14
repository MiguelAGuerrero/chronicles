<!-- Repo first: written from the owner's request in a session (Nov 14), not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Reactions: why a moment mattered, on any moment, gathered when you ask

Nov 14, 2026 · @Miguel Guerrero

A note can carry one of eight types (`specs/note-types`, decision 0161), set on the note's piece and shown in place of
the note's glyph. The owner wants that mark generalized: any moment (a photo, a memo, a video, a note) carries
reactions, at most one per family, and they are gathered later ("all my ideas", "all my dislikes"). They show on a
moment's pin as small bubbles, the way the reminder bell already does. Decision 0172 and its two addenda hold the
owner's calls.

## Vision

Idea: "Reimagine the note type as a generalized model to assign annotated descriptors per moment, whether that be an emotion, a reaction, an idea", seeded from the note types; gather "all my ideas", "all the dislikes I have in my memories"; show them on pins "as little bubbles on the corner".
Verb: return (a lens gives back every moment of a reaction, in its context: recall, the "second mind"); honour (a photo, a memo or a video keeps why it was kept, not only a note).
Touches: decision 0161 and NY12 ("nothing sorts, filters or searches notes by type"; reversed for lenses by the owner, 0172); 0161's "a like or dislike is never carried to Explore, a place, a route or a recommendation" (kept whole); Never "Ratings, reviews … of places" (no place is said to be liked or disliked; the gate argued once against likes gathered by location, and that lens is not in this slice); Never "Scores" and Always "Counts are words" (no count of a reaction anywhere, no share, no mood over time); Never "Writing the owner's words for them" and NY13 (a reaction exists only because the owner chose it); Never "A capture behind a menu, a drawer or an extra tap" and NY18-NY26 (reacting is never a step before keeping); Always "A moment carries its context" (a lens shows moments with their place, time and walk, never a grid of glyphs); Never "Celebration" and Always "Restraint" (ink glyphs, no colour); 0104 ("moments stay whole": reactions are separate records); 0105 and RB1 (an ink disc with a white glyph and a spoken name is how a pin says a thing); 0139 (gallery tiles stay bare); 0168 (the face with a plus is the sign).
Verdict: aligned if reshaped (decision 0172; the owner reaffirmed lenses over 0161's NY12)
Shape: Eight reactions in three fixed families: Feeling (Happy, Neutral, Sad), Taste (Like, Dislike), Thought (Question, Emphasis, Idea). At most one per family per moment, chosen only by the owner, after keeping, from the face with a plus. Stored as their own records, never on the moment. A moment's reactions show as ink glyphs with their names wherever the moment is read, and as bubbles from the bottom-left of a single moment's pin. The journal's contents gain Reactions: one lens per reaction that has a moment, named in words ("Ideas"), opening the moments in context. Nothing counts them, ranks them or says anything of a place.
Criteria: RX1-RX36 below.
Open: four calls in the plan's "For the owner" (where the reactions are stored and read; which type a moment keeps when two notes disagree; the picker's shape; where lenses live), each with a recommended answer the criteria assume.

## Decisions (the owner's calls)

- **Nov 14 (0172):** several reactions per moment, at most one per family; a fixed set, grouped; on the whole moment, in
  separate records; existing note types move onto their moment; the first behaviour is collections, as Chronicle lenses.
  A lens by location, Emphasis offering a reminder and a Question asking again are later slices, each gated.
- **Nov 14 (0172, pins):** bubbles in a row from the pin's bottom-left corner in the families' order; drawn as the bell
  is (ink disc, white glyph, white edge, the clock's size); a pin of one moment only; the head always shows the kind
  (amends NY10).
- **Nov 14 (0172, the word):** they are reactions; families Feeling, Taste, Thought; "Type" becomes "Reaction"
  everywhere; lenses named in plain words, never with a count.

## Surfaces (decision 0167, from the code)

Where a note's type is set or drawn today (`grep -rn "markOf\|NoteMark\|NoteTypeMenu\|note_type" src`), and where a
moment is drawn that a reaction could join:

| Host | Today | In this slice |
|---|---|---|
| Journal: the entry being written (`Entry` + `OpenLine`'s panel) | the slot, the eight above the bar (NY19-NY22) | the sign opens the three families (RX5-RX8) |
| Journal: an entry kept today (`Entry`) | the sign on a note (NY27) | the sign on every entry, any kind (RX9) |
| Journal: an entry's More (`MemoryMenu`) | Type, for an entry with a note (NY23) | Reaction, for every entry (RX10) |
| Journal: how an entry shows them (`Entry`) | the mark above the note's words (NY22) | under the dateline, any kind (RX14) |
| Viewer (`CaptureView`): its info and More | the mark above a note's page (NY9) | under the info line, any kind; More's Reaction (RX11, RX15) |
| A note's page (`NotePage`, from Edit, the viewer and the journal's line) | the Type tool (NY6, NY26) | the Reaction tool, setting the moment's (RX12) |
| A new note's page (`NewNotePage`: walk, ready screen, journal) | the Type tool, held until kept (NY24) | the Reaction tool, held until kept (RX13) |
| Respond's page, in `ResponsesSheet` and the thread screens | none until kept (NY15) | none until kept (RX13) |
| Thread bubbles (`NoteBubble`, `OwnThreadScreen`) | the mark (NY17) | the moment's reactions (RX16) |
| `chronicle/MomentCard` (the Chronicle's and the owner's thread screens, the new lens) | its spoken name only | glyphs and names after the words (RX16) |
| The replay's cards and step-through (`ceremony/Cards.tsx`, `StepThrough`, `Grid`, `Pile`) | none | none: the ceremony is the content's, five beats in restraint (steward 3) |
| A day's timeline row (`HomeSheet`, `timeline-moment`) | none | none in this slice: the row is the day's read, and the moment's viewer shows them (steward 3) |
| A memory pin's preview (`MemoryPreview`), the reminder card (`ReminderCard`), the moment bar's toast (`MomentBar`) | none | none: a preview and a reminder say where and when; the pin wears the bubbles (steward 3) |
| Hidden (`chronicle/HiddenScreen`) | none | none: it lists what was set aside, by its words |
| Pins (`CapturePinView`, web and native, on every map that draws them) | a single note's head (NY10) | the head shows the kind; bubbles (RX17-RX21) |
| The slip (`Slip`) | none (note-types audit 16) | none: the slip is a moment brought back in its own words, kept quiet |
| Media gallery tiles | none | none: tiles are bare (0139) |
| A response's entry (`ResponseEntry`) | none | none: a tap opens the moment, whose viewer shows them |
| The @ picker (`MomentPicker`) | none | none: a picker finds a moment by its words and date |
| Explore, a place's sheet, routes, areas, discovery, landing, walkability | none (note-types audit 15) | none, guarded (RX30) |
| The contents (`MemoriesMenu`) | Threads, Hidden, the switch, Forget | Reactions (RX22-RX27) |

## Acceptance criteria

The set (`REACTIONS`, `src/lib/reactions/core.ts`), in this fixed order: Feeling: `happy` "Happy", `neutral` "Neutral",
`sad` "Sad"; Taste: `like` "Like", `dislike` "Dislike"; Thought: `question` "Question", `emphasis` "Emphasis", `idea`
"Idea". Glyphs as note types drew them (help-circle, alert-circle, bulb, happy, the neutral mark, sad, thumbs up, thumbs
down). Lens names: "Happy moments", "Neutral moments", "Sad moments", "Likes", "Dislikes", "Questions", "Emphasis",
"Ideas".

The owner's tasks (decision 0167)

1. **RX1** *"React to a photo I took."* From the journal, someone who was not told where can find how to put a reaction on a photo's entry: the face with a plus on the entry is the way, and a tap on a reaction there keeps it. A finding criterion: the cold find places it.
2. **RX2** *"Gather all my ideas."* From Memories, someone who was not told where can find every moment with Idea: the contents (top right) holds Reactions, which holds Ideas, which shows them. A finding criterion: the cold find places it.
3. **RX3** *"See on the map what I reacted to."* A single moment's pin with a reaction wears it as a bubble at its bottom-left corner, found by eye on the walk screen and Chronicle's Map.

The model

4. **RX4** The set is eight reactions in three families in the fixed order above, each with a distinct glyph, a name and its family; the lows are in it; no reaction is named or ordered as better than another; a stored value outside the set reads as none (as NY2).

Setting a reaction

5. **RX5** A moment carries at most one reaction of each family: choosing a reaction where its family already has one replaces it; choosing the one already chosen clears it; the other families are untouched.
6. **RX6** The journal's entry being written shows nothing about reactions before its first piece (as NY18); then the face with a plus sits at the end of its dateline, and a tap opens the reactions just above the bar in three rows under the words Feeling, Taste and Thought, each reaction with its glyph and its name, the chosen ones shown chosen.
7. **RX7** Choosing is never a step: writing, the camera, the mic and Done stay in the bar while the reactions are open, the next character typed closes them, and a reaction chosen with the panel open leaves it open, so a second family can be chosen in the same visit.
8. **RX8** A reaction chosen on the entry being written is kept at once on its moment and is there after Done and after the app is opened again; an entry that ends with no piece keeps nothing, whatever was chosen.
9. **RX9** An entry kept today, of any kind (a photo, a memo, a video, a note, several), shows the sign at the end of its dateline: the face with a plus while it has no reaction, else the glyph of its first reaction in the families' order. One tap opens the reactions by themselves, and a choice is kept. An entry of an earlier day shows no sign there (as NY27).
10. **RX10** Every entry's More offers "Reaction", which shows the three families in that same sheet, by themselves under the word Reaction; choosing one keeps it and leaves the sheet open for another family; Close or a tap outside closes it.
11. **RX11** The viewer's More offers "Reaction" for every moment, of any kind, opening the same three families; a choice is kept and shows in the viewer at once.
12. **RX12** A note's page (from Edit, the viewer, the journal's line) has a Reaction tool in its bar where the Type tool was, showing the moment's first reaction's glyph or the face with a plus, and saying "Reaction, idea" or "Reaction, none"; it opens the three families; a choice is kept on the note's moment at once and never rewrites the note's words or format.
13. **RX13** A new note's page (on a walk, from the ready screen, from the journal's line) carries the Reaction tool; reactions chosen before the first words wait and are kept on the moment when it is kept; a page left without words keeps nothing. Respond's page has no Reaction tool: a response has no reaction until the owner gives it one from the journal, the viewer or More (as NY15).

Showing them

14. **RX14** A journal entry with reactions shows them under its dateline, before its pieces: each its glyph and its name in words, in the families' order, in ink; an entry with none shows nothing there.
15. **RX15** The viewer shows the moment's reactions, glyph and name, under its info line, for every kind; a moment with none shows nothing; a note's page no longer has a type mark above it.
16. **RX16** A thread's note bubble and every `chronicle/MomentCard` (the thread screens, the lens) show the moment's reactions after its words, glyph and name, in ink; their spoken names add each reaction ("Note, happy, idea, Tuesday evening"). A reaction is spoken only where its glyph is drawn: the slip, a memory's preview, the reminder card and the replay speak none (steward 4, as note-types audit 16).
17. **RX17** A pin of exactly one moment with reactions wears one bubble per reaction, in a row from the head's bottom-left corner outward, in the families' order: each a solid ink disc with a white glyph and a white edge, the reminder bell's size; a pin with no reactions wears none.
18. **RX18** The pin's head always shows the moment's kind (a note's glyph, a photo's picture, a memo's, a video's still), whatever its reactions: a reaction never replaces the head (amends NY10).
19. **RX19** A pin of several moments wears no reaction bubbles and its name lists none.
20. **RX20** The bubbles never cover the bell or the clock (top corners) or the video mark (bottom right), on a pin and on a faint memory pin, where they are as faint as the pin, unlike the bell, which does something (steward 9; the owner's call); at the map's normal zoom on a 320 px screen, three bubbles stay inside the pin's own touch target or beside it without covering another pin's head.
21. **RX21** A single moment's pin says its reactions after its kind, in the families' order: "Photo, happy, idea, twelve minutes in. Open"; a change of reaction shows on the pin behind the viewer at once, on the same pin, with focus kept (as RB5). The walk screen, Chronicle's Map and Navigate draw them; the replay and a day's replay, which are ceremonies, do not (steward, silent; the owner's call).

Lenses

22. **RX22** The journal's contents (its top-right button) list **Reactions** between Threads and Hidden, with the line "Moments gathered by how you reacted".
23. **RX23** Reactions shows one row per reaction that at least one kept moment has, in the set's order, under its family's word: the glyph and the lens name in words ("Ideas"), and no count, number, share or bar; a reaction no moment has is not listed; with none at all, one line: "When you react to a moment, it gathers here."
24. **RX24** A lens shows every kept moment with that reaction, oldest first, each as a moment in its context (its picture or kind, its words, its date, place and walk), never as glyphs alone; nothing says how many. It is one list: no map, no heading or grouping by place, street, area or period, and no scrubber (steward 7). A moment set aside with Not this one is still in it: a lens is asked for, not brought back (steward 6, the default).
25. **RX25** A tap on a moment in a lens opens it in the viewer, which steps through the lens's moments in its order with no "i of n"; Back returns to the lens at the same moment; the viewer's info line never says a position (steward 8).
26. **RX26** A moment whose reaction is cleared, or which is deleted, leaves its lens when the lens is next shown; a lens left empty leaves the Reactions list; Undo of a delete brings it back.
27. **RX27** A lens reads only the owner's reactions: no word in a note, no place, time or walk puts a moment in a lens.

Storage and truth

28. **RX28** Reactions are truth, kept as their own records (moment, family, reaction, when set), never fields of the moment: setting or clearing one never changes the moment's row or any piece; the stores agree (the fake, IndexedDB, SQLite) on set, replace, clear and read.
29. **RX29** Every note type kept before becomes its moment's reaction on first open (the next `MIGRATIONS` entry; IndexedDB 22); where two notes of one moment hold types of the same family, the earliest note's is kept; nothing is lost from a moment with one typed note, and the old field is never read again.
30. **RX30** No code of Explore, a place, a route, an area, discovery, landing or walkability reads reactions, and nothing outside the lens code filters, sorts or counts moments by reaction (the guard of note-types audit 15, moved to reactions); nothing chooses, weights or orders moments by reaction: not the slip, the replay, recall, reminders or the suggested threads (steward 2).
31. **RX31** Deleting a moment (by its last piece, by a walk, by Clear) deletes its reactions after the Undo window and not before; Undo keeps them; deleting a piece of a moment that stays keeps them; a piece split out to its own moment takes none.
32. **RX32** The backup bundle and the web store's export keep a moment's reactions with it.
33. **RX33** Nothing sets a reaction from a moment's words, picture, time or place: a reaction exists only because the owner chose it.
34. **RX34** The reactions panel, at 320 px wide and at 200% text, shows every reaction with its name, nothing cut, each target 44 px or more both ways; a screen reader hears each as its name and its family ("Idea, Thought, chosen").

35. **RX35** A reaction is shown only on the moment that has it, and moments are gathered only in a lens: no walk, day, week, thread, area or place is shown or said to have a reaction, and none is summed up from them (steward 1).
36. **RX36** Every reaction glyph, mark and bubble is the one ink colour (white on an ink disc on a pin), asserted by a test; a chosen reaction is shown by weight and a check, never an accent or a tint (steward 5, NY11 carried over).

## Steward triage (Nov 14)

- **Steward 1** (a walk or day summed up by reactions; breach): accept, RX35.
- **Steward 2** (resurfacing weighting the bright ones): accept, RX30.
- **Steward 3** (the replay's own card; surfaces missed): accept; the table names them, and the replay's cards stay bare (RX16).
- **Steward 4** (the slip speaking reactions it does not draw): accept, RX16.
- **Steward 5** (one ink colour not carried over): accept, RX36.
- **Steward 6** (a hidden moment in a lens): the default keeps it (a lens is asked for); put to the owner.
- **Steward 7** (a lens grouped by place or period): accept, RX24.
- **Steward 8** (the viewer's "i of n"): accept, RX25; the lens passes `position={false}`.
- **Steward 9** (solid bubbles on faint pins): put to the owner; the spec assumes faint.
- Silent: bubbles on the replay's map (the spec assumes none) and resurfacing learning from reactions (never, RX30) are the owner's.

## Record

Not built.
