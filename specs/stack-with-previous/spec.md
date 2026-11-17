<!-- Repo first: written from the owner's request in a session (Nov 17), not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). The owner's calls are decision 0196. Builds on specs/moment-stacks (decision 0123) and specs/chronicle-journal (decision 0155). It replaces the first draft of this slice ("add to any moment from the viewer's dock"), which the owner simplified on Nov 17. -->

# Stack with previous: join a capture to the moment before it, and show a stack as a grid

Nov 17, 2026 · @Miguel Guerrero

Moments made back to back ("turn left onto Maple Street", then "at the stop sign, turn right onto East Union Boulevard")
are separate entries on Chronicle's page, and outside a walk the Add to this moment pill (0123) closes after two minutes.
The owner's simpler ask: a little button on a capture you have just made in Chronicle, **Stack with previous**, that joins
it to the moment before; and a stack, wherever it is shown, as a gallery of everything in it, collapsible. Each piece stays
its own unit with its own time; the stack is how they are shown together.

## Vision

Idea: A button on a capture just made in Chronicle, "Stack with previous", joins it to the previous moment; a stack is shown as a grid of all its media, collapsed or expanded.
Verb: honour (the moment arrives whole: what was seen and said at the corner, kept together) and return (a stack is given back as a gallery, not a list of lines).
Touches: 0123 "Separate moments are never merged" (narrowed here, below); 0123 / MS7-MS9 (one moment everywhere, a quiet mark, no count); 0104 "moments stay whole" (a moment row is never edited; links and threads are separate records); 0036 "one fix per moment"; 0155 and `.claude/rules/journal.md` "The past is fixed. New entries land at the end; nothing inserts on a past page" (narrowed here, below); Always "A moment carries its context"; 0139 "Media: bare tiles; the day header says where"; Never "A capture behind a menu, a drawer or an extra tap" (a capture stays one tap, the button follows it).
Verdict: aligned if reshaped
Shape: (1) **Stack with previous** is offered only on the entry just kept in this sitting, while nothing points at it (no thread, reply, reminder, find or reaction), and only when a moment from the same day precedes it. It moves that entry's pieces into the previous moment through the one Undo window, which is the reverse of Split out (0123, MS16); the emptied entry goes. This is the one narrow exception to "never merged" and to "the past is fixed": it can break no link, because none exists yet. Every piece keeps its own capture time; the moment keeps its one place and time; a piece made later says so in words and names no place. (2) A stack in Chronicle's page shows its first piece and the two-card mark, collapsed; one labelled control expands it to a grid of every piece, and collapses it again. Tiles are bare (0139) under the entry's dateline, which says where and when; no tile or label gives a number.
Criteria: SW1 (the task, found), SW2 (previous, same day), SW3-SW5 (a move, not a merge; only when nothing points at it; Undo), SW6 (a later piece says when, never where), SW7-SW9 (the grid), SW10 (capture still one tap), SW11 (no other merge), SW12 (other surfaces), SW14 (restraint).
Open: none (the owner's answers, Nov 17: move the new piece in, within Undo; previous is the one before, the same day). The vision is silent on a stack's grid being collapsed by default; this spec takes collapsed (a list stays a list) and names it as a default for the owner to overrule.

## How adjacent apps do it

- **Apple Photos** (bursts, Live Photos): a burst or stack shows as one tile with a stack mark; tapping shows everything in it as a grid ("Select"). Source: from memory, unverified (support.apple.com/guide/iphone/ not read). **Unverified**.
- **Day One**: an entry holds several photos, which it lays out as a grid of tiles in the entry; the grid is the entry's own layout. Source: https://dayoneapp.com/guides/day-one-ios/ (grid layout from memory). **Unverified**.
- **Instagram** (a carousel): several media are one post, one tile with a count mark; the count is a counter-example (VISION.md, Never: tallies). Source: from memory, unverified. **Unverified**.
- Joining a capture to the one before after the fact: none found in the adjacent apps; the move is the reverse of this app's own Split out (0123).

## Decisions (the owner's calls, Nov 17, decision 0196)

- A stack is how a moment's pieces are shown together; each piece stays its own unit with its own capture time.
- No time delta and no setting decides it: the owner chooses, by the button.
- **Stack with previous moves the new piece in**, only right after capturing, with Undo. It narrows 0123's "never merged" and the journal's "the past is fixed" to this one case.
- **Previous is the moment before it, the same day**, on a walk or off one.
- A stack's grid is collapsible: collapsed shows its first piece with the mark; expanded shows every piece.
- **Defaults taken, for the owner to overrule:** (a) collapsed by default; (b) the grid is built for Chronicle's page now and the other lists (Days, a walk's moments, Memories here, a thread) keep their row and mark, deferred; (c) the added piece keeps no place of its own (0036), and says in words when it was made if later; (d) the button is a labelled ink text button on the entry, not an icon.

## Criteria

#### The task

1. **SW1 · Stack with previous.** On Chronicle's page, an entry just kept in this sitting offers **Stack with previous**; one tap joins its pieces into the previous moment. **Finding criterion:** someone who was not told where it is finds it from the page: a labelled button in ink at a target's size on the new entry itself (below its pieces, above the line), a word and no icon.
2. **SW2 · Previous.** "Previous" is the latest moment made before this entry on the same local day, on a walk or off one. With none, or from an earlier day, the button is not shown and nothing says why.

#### A move, not a merge

3. **SW3 · The pieces move; nothing else does.** The entry's pieces join the previous moment, each keeping its own capture time, media and body. The previous moment's place, time, threads, links, reminder and find are unchanged; no location is read (0036); the emptied entry is gone from the page and from every list.
4. **SW4 · Only when nothing points at it.** The button is not offered when the entry has a thread, a reply or link, a reminder, a find or a reaction, or is not the last entry kept in this sitting, or is the entry being written (the open line holds words).
5. **SW5 · Undo.** The stack shows at once; a pill says "Stacked with the earlier moment" with **Undo** (stays until used or dismissed, F3). Undo restores the separate entry with its id, time and place. A killed app completes the join at the next launch (0113). The join is stored only once the window has passed.
6. **SW6 · A later piece says when, never where.** A piece whose capture time is later than the moment's shows its own time in words on the piece ("Added later, 4:12 pm"), in the page, the grid and the viewer, and the viewer states no place for it. A piece made within the same minute of its moment says nothing extra.

#### A stack as a gallery

7. **SW7 · Collapsed by default.** A moment with more than one piece shows on Chronicle's page as its dateline, its first piece (photo or video if it has one) and the two-card mark; a single-piece moment shows as it does today. Beside the pieces, one labelled control, **Show everything in this moment**, expands it.
8. **SW8 · The grid.** Expanded, the moment shows every piece as a tile in capture order, three to a row, square: a photo's picture, a video's still under the play mark, a note's first words in the owner's serif, a memo's microphone mark and "A voice note". A tap on a tile opens the viewer on that piece. The control now reads **Show less** and collapses it. Neither state is kept past the sitting.
9. **SW9 · Context, no count.** The grid sits under the entry's dateline (place, time, what came before), so its tiles are bare (0139). No tile, control or spoken label gives a count, position or total ("3 of 7", "+4"). Spoken: "Photo, Maple Street. Opens the moment", never a number. Where a stack's size is said, it is a word from `sizeWord`.
10. **SW10 · Capture is unchanged.** Writing, the camera and the mic on the open line keep one tap and one fix; the button follows a capture and gates nothing. A capture made while the button shows never waits on it.
11. **SW11 · No other merge.** No control joins any two moments but this one; no `Db` method moves a piece from a moment that other records point at. Connecting existing moments stays Add to a thread (OT5).

#### Everywhere else, and a phone

12. **SW12 · Other surfaces keep their row.** Days, a walk's moments, Memories here, a thread, the gallery and the replay show a stack as one row or pin with the mark (MS7, MS8) and open the viewer, which pages its pieces (MS10); the grid there is deferred. A joined moment reads as one everywhere at once, and the emptied entry is on none.
13. **SW13 · Kept on the device.** A stack survives a restart, a reload (web) and an app update; nothing leaves the device without a tap (MS15).
14. **SW14 · Restraint and a phone.** The button and the control are ink, no accent, no pulse, sound or haptic beyond what a capture gives; the grid opens with a `motionTokens` timing; at 320 px at the default text size nothing wraps and a tile is at least 88 px.
