<!-- Repo first: written from the owner's request in a session (Nov 17), not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). The owner's calls are decision 0197. Builds on specs/moment-stacks (decision 0123) and specs/chronicle-journal (decision 0155). It replaces the first draft of this slice ("add to any moment from the viewer's dock"), which the owner simplified on Nov 17. -->

# Quick actions on an entry, Stack with previous, and a stack as a grid

Nov 17, 2026 · @Miguel Guerrero

Moments made back to back ("turn left onto Maple Street", then "at the stop sign, turn right onto East Union Boulevard")
are separate entries on Chronicle's page, and outside a walk the Add to this moment pill (0123) closes after two minutes.
The owner's ask, simplified twice (Nov 17): a **row of quick-action icons under every entry** on Chronicle's page, so the basic
actions (Respond, Add to a thread, Edit) are no longer behind opening the moment and its More; **Stack with previous** is one of
them, joining a capture just made to the moment before; and a stack, wherever it is shown, as a gallery of everything in it,
collapsible. Each piece stays
its own unit with its own time; the stack is how they are shown together.

## Vision

Idea: A row of quick-action icons under every Chronicle entry (Respond, Add to a thread, Edit, Stack with previous); a stack is shown as a grid of all its media, collapsed or expanded.
Verb: honour (the moment arrives whole: what was seen and said at the corner, kept together) and return (a stack is given back as a gallery, not a list of lines).
Touches: `docs/research/ui-references.md` T5 and decision 0167 (labelled controls; "a faint, wordless glyph that nobody finds is a missing feature"), which the owner overrules for this row (icons only, with spoken names); `.claude/rules/ui-patterns.md` "Rare actions go in More" (these are the basic ones, moved out); the journal's "Typographic, never a costume"; 0123 "Separate moments are never merged" (narrowed here, below); 0123 / MS7-MS9 (one moment everywhere, a quiet mark, no count); 0104 "moments stay whole" (a moment row is never edited; links and threads are separate records); 0036 "one fix per moment"; 0155 and `.claude/rules/journal.md` "The past is fixed. New entries land at the end; nothing inserts on a past page" (narrowed here, below); Always "A moment carries its context"; 0139 "Media: bare tiles; the day header says where"; Never "A capture behind a menu, a drawer or an extra tap" (a capture stays one tap, the button follows it).
Verdict: aligned if reshaped
Shape: (0) **A row of five ink icons, each with a one-word caption, under each entry**, 44 pt targets, each a familiar symbol with a spoken name: Respond (a reply arrow), Add to a thread (a link), Edit (a pencil), Stack with previous (an up arrow, the earlier entry being above). Slots do not move: an unavailable action leaves its slot empty. (1) **Stack with previous** is offered only on the entry just kept in this sitting, while nothing points at it (no thread, reply, reminder, find or reaction), and only when a moment from the same day precedes it. It moves that entry's pieces into the previous moment through the one Undo window, which is the reverse of Split out (0123, MS16); the emptied entry goes. This is the one narrow exception to "never merged" and to "the past is fixed": it can break no link, because none exists yet. Every piece keeps its own capture time; the moment keeps its one place and time; a piece made later says so in words and names no place. (2) A stack in Chronicle's page shows its first piece and the two-card mark, collapsed; one labelled control expands it to a grid of every piece, and collapses it again. Tiles are bare (0139) under the entry's dateline, which says where and when; no tile or label gives a number.
Criteria: SW1 (the row, found by its glyphs), SW2-SW4 (Respond, Thread, Edit), SW5-SW10 (Stack with previous: previous, a move not a merge, only when nothing points at it, Undo, a later piece says when), SW11-SW13 (the grid), SW14 (capture one tap), SW15 (no other merge), SW16 (other surfaces), SW18 (restraint).
Open: none (the owner's answers, Nov 17: move the new piece in, within Undo; previous is the one before, the same day; the actions are Stack, Thread, Respond and Edit, icons only, under every entry). The vision is silent on a stack's grid being collapsed by default; this spec takes collapsed (a list stays a list) and names it as a default for the owner to overrule.

## How adjacent apps do it

- **Apple Photos** (bursts, Live Photos): a burst or stack shows as one tile with a stack mark; tapping shows everything in it as a grid ("Select"). Source: from memory, unverified (support.apple.com/guide/iphone/ not read). **Unverified**.
- **Day One**: an entry holds several photos, which it lays out as a grid of tiles in the entry; the grid is the entry's own layout. Source: https://dayoneapp.com/guides/day-one-ios/ (grid layout from memory). **Unverified**.
- **Instagram** (a carousel): several media are one post, one tile with a count mark; the count is a counter-example, never a model (VISION.md, Never: tallies). Source: from memory, unverified. **Unverified**.
- **Day One / Apple Journal / Instagram**: an entry's actions as a row of icons under the post (like, comment, share, save); Instagram's row is the pattern the owner points at and is icon-only. Source: from memory, unverified. **Unverified**.
- Joining a capture to the one before after the fact: none found in the adjacent apps; the move is the reverse of this app's own Split out (0123).

## Decisions (the owner's calls, Nov 17, decision 0197)

- A stack is how a moment's pieces are shown together; each piece stays its own unit with its own capture time.
- No time delta and no setting decides it: the owner chooses, by the button.
- **Stack with previous moves the new piece in**, only right after capturing, with Undo. It narrows 0123's "never merged" and the journal's "the past is fixed" to this one case.
- **Previous is the moment before it, the same day**, on a walk or off one.
- A stack's grid is collapsible: collapsed shows its first piece with the mark; expanded shows every piece.
- **The quick-action row:** Respond, Add to a thread, Edit and Stack with previous, as icons only with spoken names, under every entry (the owner's answers, Nov 17). Reaction and the map pin stay on the entry's top line; More keeps the rest.
- **Defaults taken, for the owner to overrule:** (f) Edit is not offered on a stack's row (it would have to say which piece; a tile opens the viewer, which edits the piece shown); (g) the glyphs are Ionicons `happy-outline`, `arrow-undo-outline`, `link-outline`, `create-outline` and `arrow-up-circle-outline`, none of them the two-card stack mark (steward S2, first draft); (h) none. (a) collapsed by default; (b) the grid is built for Chronicle's page now and the other lists (Days, a walk's moments, Memories here, a thread) keep their row and mark, deferred; (c) the added piece keeps no place of its own (0036), and says in words when it was made if later; (d) the button is a labelled ink text button on the entry, not an icon; (e) the 100 m nearness rule in SW2, and "Show all" / "Show less" as the control's words.

## Criteria

#### The quick-action row

1. **SW1 · A row of quick actions under every entry.** On Chronicle's page every entry shows, under its pieces, a row of five icons in ink, each a 44 pt target with a **one-word caption beneath it** and a spoken name: **Reaction**, **Respond**, **Thread**, **Edit** and **Join** (spoken "Reaction", "Respond", "Add to a thread", "Edit", "Stack with previous"), in that order, each in a fixed slot (an unavailable action leaves its slot empty and moves no other). The captions are the owner's call after the cold find could not place three of the four glyphs (Nov 17); a hover word on the web is not needed. **Finding criterion** (decision 0167): someone who was not told what the row is can say what each icon does from the page; a cold find (the `ux-reviewer` given the picture and one sentence per task) that cannot place an action is a `high` finding.
2. **SW2 · Respond.** The reply icon opens the pull-down of kinds the viewer's Respond opens (Photo or video, Voice memo, Note), titled "A new moment, linked to this one"; what it keeps is a new entry at its own place and time, linked to this one (0104), landing at the end of the page as a response always does (0155).
3. **SW3 · Add to a thread.** The link icon opens the same Add to a thread sheet the viewer's More opens and says "Added to a thread" as it does.
4. **SW4 · Edit.** On a single-piece entry the pencil opens that piece's editor as the viewer's Edit does (a note's page, a photo's or video's editor, a voice memo's trim). On a stack the slot is empty (a default for the owner to overrule): a tile opens the viewer, which edits the piece shown.

#### Stack with previous

5. **SW5 · Stack with previous.** On an entry just kept in this sitting the up-arrow icon, named "Stack with previous", joins its pieces into the previous moment in one tap. Its slot is empty on every other entry.
6. **SW6 · Previous.** "Previous" is the latest moment made before this entry on the same local day, **on the same walk or both off any walk**, and **within 100 m** of the entry's own place (the pill's number, 0123; a moment or entry with no place counts as near). With none, from an earlier day, on another walk or farther away, the slot is empty and nothing says why. So the stack's one place is true of every piece (steward S1, a default for the owner to overrule).
7. **SW7 · The pieces move; nothing else does.** The entry's pieces join the previous moment, each keeping its own capture time, media and body. The previous moment's place, time, threads, links, reminder and find are unchanged; no location is read (0036); the emptied entry is gone from the page and from every list.
8. **SW8 · Only when nothing points at it.** The slot is empty when any record keyed by the entry's id would differ after the join: a thread or membership, a reply or link, a reminder, a find, a reaction, a Hidden mark, a resurfaced pick, or an @-mention of it in any note (found by scanning notes for its id); or when it is not the last entry kept in this sitting, or is the entry being written. The slot empties when the next capture begins and no later control re-offers it. A contract test lists every table that holds a moment id and fails when a new one is added without a decision (steward S2, S3).
9. **SW9 · Undo.** The stack shows at once; a pill says "Stacked with the earlier moment" with **Undo** (stays until used or dismissed, F3). Undo restores the separate entry with its id, time and place. A killed app completes the join at the next launch (0113), and the page then shows the stacked moment, never both entries. The join is stored only once the window has passed.
10. **SW10 · A later piece says when.** A piece whose capture time is later than the moment's shows its own time in words on the piece ("Added later, 4:12 pm"), in the page, the grid and the viewer. Its place is the moment's (SW6 keeps it within 100 m), so the viewer states no place of its own for it. A piece made within the same minute of its moment says nothing extra.

#### A stack as a gallery

11. **SW11 · Collapsed by default.** A moment with more than one piece shows on Chronicle's page as its dateline, its first photo or video (else its first piece), **the owner's words and any voice note exactly as they are shown today** (a voice note plays in line; words are never hidden, JN3, JN15, JN16), the two-card mark and a line in words naming the kinds it holds ("a photo, a note and a voice note", never a number); only a second and later photo or video are behind the control. A single-piece moment shows as it does today. The entry still being added to (the pill's open moment) shows every piece. One labelled control, **Show all**, expands it into the grid.
12. **SW12 · The grid.** Expanded, the moment shows every piece as a tile in capture order, three to a row, square: a photo's picture, a video's still under the play mark, a note's first words in the owner's serif, a memo's microphone mark and "A voice note", each with its own time in words ("8:15", "Added later, 8:21 am"). A tap on a tile opens the viewer on that piece. The control now reads **Show less** and collapses it. Neither state is kept past the sitting.
13. **SW13 · Context, no count.** The grid sits under the entry's dateline (place, time, what came before). No tile, control or spoken label gives a count, position or total ("3 of 7", "+4"); clock times and dates are not counts and are allowed. Spoken: "Photo. Opens the moment", never a number. Where a stack's size is said, it is a word from `sizeWord`.

#### What stays true

14. **SW14 · Capture is unchanged.** Writing, the camera and the mic on the open line keep one tap and one fix; the row follows a capture and gates nothing.
15. **SW15 · No other merge.** No control joins any two moments but this one; no `Db` method moves a piece from a moment that other records point at. Connecting existing moments stays Add to a thread (OT5).
16. **SW16 · Other surfaces keep their way.** The row is on Chronicle's page (`Entry`, its one host, `MemoriesScreen`). Days, a walk's moments, Memories here, a thread, the gallery and the replay show a stack as one row or pin with the mark (MS7, MS8) and open the viewer, which has its own dock and More; the row and the grid there are deferred. A joined moment reads as one everywhere at once, and the emptied entry is on none.
17. **SW17 · Kept on the device.** A stack survives a restart, a reload (web) and an app update; nothing leaves the device without a tap (MS15).
18. **SW18 · Restraint and a phone.** The icons and captions are ink, no accent, no pulse, sound or haptic beyond what a capture gives; the grid opens with a `motionTokens` timing; at 320 px at the default text size the row's five slots, captions included, fit without wrapping, each at least 44 pt, and a tile is at least 88 px.
19. **SW19 · Less on the entry's top line.** On Chronicle's page an entry's top line carries its dateline (the place, a button to the map) and its reactions in words, and no reaction sign and no More ("…") button. Show less like this and Not this one are gone from entries, and nothing on an entry ranks it or says to bring it up less (the owner: never used, made for a feed). The map is the dateline; the full moment opens from a tap on its pieces. The entry being written keeps its reaction sign until it is kept (RX6).
20. **SW20 · Reaction is a quick action.** The Reaction slot opens the reactions panel (Feeling, Taste, Thought; a choice is kept at once and leaves the panel open) for an entry of any day, as More's Reaction did; the chosen reactions still show in words under the dateline.
21. **SW21 · A stack is a moment; its undo is in its pieces.** A stack is treated as one moment everywhere (one entry, one pin, one place and time) and is not a named thing, so the row offers it Reaction, Respond and Thread as to any moment and no Edit (the owner, Nov 17: editing a stack makes no sense). What you can do inside it is expand it and, as a failsafe for a join made by mistake, take a piece out: a tile of the expanded grid opens the viewer on that piece, whose More offers **Split out** (the piece becomes a moment of its own, keeping its time; never the first piece, MS16) and **Delete this piece** (MS13), each through the one Undo window.
22. **SW22 · The map is found.** A placed entry's dateline (the place and time, a button to the map) reads as tappable: its words are underlined in ink, which a cold find without it could not place (35%). An unplaced entry's dateline stays plain.

## Record

Built Nov 17 on `claude/jolly-faraday-8kcyum` (tests first `78fc55c`, corrected so SW1 and SW18 read as todos first). SW1-SW22 have tests: the unit and contract tests under `src/lib/__tests__/` (`moments/join`, `moments/joinShell`, `journal/actions`, `moments/moment`, `moments/oneMoment`, `dbContract`) and the `stackjoin` journey. Journeys run green on the headless web build: stackjoin, journal, stacks, reactions, resurface, chronicle, threads, capturehome, deletion, edit, notepage, qol, responses, upgrade, voicetrim, walk, dense. **Deferred:** the grid on Days, a walk's moments, Memories here and threads; a hover word on the web; moving a piece between moments; joining across days or with an entry something points at. **Not run on a device:** `joinMoment` on SQLite, the row and the grid on a phone (`docs/NATIVE_UNVERIFIED.md`). The cold find on the captioned row placed Stack at about 40%; the owner chose Join as its caption (Nov 17).

## Audit (Nov 17: the auditor, the steward, the ux-reviewer and a cold find on the final pictures)

1. Join stays offered after the entry gains a reaction or a thread: accept (high). The offer re-reads what points at the entry after a reaction or a thread, and `join` refuses one that something points at. Test `stack-with-previous audit 1`.
2. A stale snapshot overrides the live pieces once the join is stored: accept (high). Test `stack-with-previous audit 2`.
3. A capture begun after the join goes into the vanished entry: accept (high). A join closes the open moment. Test `stack-with-previous audit 3`.
4. `joinMoment`'s runner accepts an entry others point at, and moments of different days: accept. The runner re-checks references and `canJoin`. Tests `stack-with-previous audit 4` (two).
5. `referencesTo` leaves find and reaction unproven, and misses a find or reminder on a later piece: accept. Test `stack-with-previous audit 5`.
6. The previous moment deleted during the window: reject. A new delete stores the waiting join first (one job in the window), and deleting a stack deletes everything in it (OT16); nothing is lost.
7. The mention scan reads only the loaded feed: defer (low), `docs/DEFERRED.md`.
8. An entry with no place yet counts as near: defer (low); SW6 says so, the owner may want the place held on a walk.
9. The stack's line is a bare "notes": accept (steward 5, ux 5, auditor 9, cold find). It is a clause, "Holds notes". Test `stack-with-previous audit 9`.
10. A later piece does not say "Added later" on the page or in the viewer, only on its tile: accept (steward 1, breach of SW10). Test `stack-with-previous audit 10` (journey, waits a minute between the two notes).
11. One act, three names (Join, Stack with previous, Stacked with): accept (steward 4, ux 1, WCAG 2.5.3). The spoken name is "Join with previous" and the toast "Joined with the earlier moment". Test `stack-with-previous audit 11`.
12. The Join glyph reads as upload (ux 2): reject. The caption and spoken name carry the meaning, and the glyph is the owner's default (Nov 17).
13. Show all adds nothing for a notes-only stack (ux 3, auditor UI): to the owner, with the question below.
14. A five-icon row under every entry makes a long page (ux 4): reject. The owner's recorded call; the plan names the departure.
15. Row captions and tile time bars: contrast unmeasured (ux 6): defer (low).
16. No visible way to take one piece out of a stack, or to delete an entry, once More is gone (cold find, both high): to the owner, with the question below.
17. The Reaction slot reads as a feed's like button (steward 3): accept. It is the owner's own mark: never filled, toggled or counted; what is chosen shows only as words under the dateline. Test `stack-with-previous audit 17`.
18. Two components named StackGrid (auditor): reject (low); the ceremony's is older and unrelated.
19. The underlined map date placed at about 40% and Join at about 55% (cold find): defer; recorded, the owner's defaults.
20. SW15 and SW16 are source greps, and SW8's test hand-sets refs (auditor): covered by audits 1 and 4, which test behaviour.

**Audit record (Nov 17):** 20 findings, 10 fixed (audits 1-5, 9-11, 13, 16, 17), 4 deferred (7, 8, 15, 19; `docs/DEFERRED.md`), 4 rejected (6, 12, 14, 18), 2 to the owner and answered (13: Show all only with media behind it; 16: Take out beside each piece of an expanded stack, opening that piece's viewer menu). Tests: `stack-with-previous audit 1` to `audit 5`, `audit 9` to `audit 11`, `audit 17` in `moments/joinShell`, `moments/join`, `moments/moment`, `journal/actions`, `dbContract` and the `stackjoin` journey (audits 13 and 16 are held by its SW11 and SW21 checks). Journeys run after the fixes: stackjoin, journal, reactions (three checks of `reactions` were adapted to the row: the Reaction slot under the held date, RL8 measured with the page at its top), stacks, resurface, chronicle. **Tension recorded:** a notes-only stack has no Show all and so no Take out on the page; its pieces are taken out through the viewer's More (`docs/DEFERRED.md`). Native paths still unverified: the SQLite join and `referencesTo`, the viewer's `intent`, and the killed-app replay of a join (`docs/NATIVE_UNVERIFIED.md`).
