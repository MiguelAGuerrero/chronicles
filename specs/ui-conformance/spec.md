<!-- Repo first: written from the owner's request in a session (Nov 10), not a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). Grounded in docs/research/ui-references.md (Apple HIG, Material 3, NN/g, WCAG 2.2); rule ids in brackets point there. Builds on decision 0112. -->

# UI conformance: Undo that waits, deletes that don't ask, a viewer that steps aside

Nov 10, 2026 · @Miguel Guerrero

The sourced patterns (`docs/research/ui-references.md`) found five places where the app departs from how iOS, Android and the research say these things work (`docs/DEFERRED.md`, "UI patterns and the UX research"). The owner chose to fix four of them: Undo that ends on a timer, a confirm before deletes that can be undone, a viewer whose bars never hide, and success pills for results already on screen, with a top bar of four round buttons.

## Vision

Idea: Bring the app's deletes, Undo, moment viewer and confirmations in line with the platforms' own patterns: Undo that waits for you, no confirm before a delete you can undo, a viewer whose bars step aside on a tap, no pill for a result you can see, and a top bar of Close and More.
Verb: honour and return (a moment arrives whole and can be looked at without chrome; what you remove can be brought back on your own time).
Touches: Always "Restraint in motion, colour and copy: the content is the novelty, not the chrome" (the viewer's bars hide; pills that only congratulate go); Never "Celebration: confetti, fanfare, big numbers, accent-coloured wins" (nothing is added; pills are removed); Always "Capture is one tap away on every screen you walk or capture from" (untouched: the capture stack does not change; decision 0112 says actions on an existing moment live in its toolbar or menu); Never "Editing out the lows" (a delete is still the owner's own act; Undo makes it safer, not easier to lose); precedents 0112 (the viewer's toolbar and menu), D4 and D5 of `specs/clearing-walks-and-moments` (amended here).
Verdict: aligned
Shape: as asked.
Criteria: UC10 (no success pill for a result on screen, each still said to a screen reader); UC7, UC8 (the bars hide only on the owner's tap, and never with a screen reader on).
Open: none (the owner answered Nov 10, decision 0113).

## Decisions (the owner's calls, Nov 10)

- The slice covers four of the five conflicts: Undo stays until used; no confirm for undoable deletes; the viewer's bars hide on a tap; quieter success and a slimmer top bar.
- A killed app completes a waiting delete: on the next launch it is stored (Nov 10, decision 0113).
- Deleting a whole walk keeps its confirm: it takes a trace, its moments and its streets at once (rare, and the most lost; matrix 8). Removing a walk's media keeps its confirm too (steward S2, accepted).

## Criteria

### Undo that waits (amends D5)

1. **UC1** A delete's pill ("Moment deleted", "Walk deleted", "Photos, videos and memos removed", "Thread deleted", "Removed from the thread") stays until the owner taps **Undo** or **✕**, starts another delete, or leaves the app; it never ends on a timer [F3, M3 snackbar, NN/g].
2. **UC2** Tapping ✕ or starting another delete stores the delete at once; Undo brings back what went, as it was. While it waits, what went is hidden from every list, as before (D5), and the wait survives the phone locking or the app going to the background (steward S1).
3. **UC3** The pill's Undo and ✕ are each at least 44 px and at least 8 px apart; Undo is the more prominent; ✕ is named for what it does ("Close, it stays deleted"); the pill is announced when it appears [X0, X0b, F4] (steward S5).

### Deletes that don't ask (amends D4)

4. **UC4** Deleting a moment, deleting a thread and removing a moment from a thread act at once, with no "Delete this?" card first; the pill with Undo follows [A3, matrix 7].
5. **UC5** Deleting a whole walk, and removing a walk's photos, videos and memos, still ask first and say what goes, as D4 says, then show the pill with Undo [matrix 8] (steward S2: a bulk loss, the lows included).
6. **UC6** **Remove from this thread** acts at once with Undo, also when it ends the thread; Undo brings the thread back with its name and members (replaces owner-threads audit 5's confirm).

### A viewer that steps aside

7. **UC7** In the moment viewer, a tap on a photo hides the top bar, the info line and the toolbar; another tap brings them back [T7, V1]. The photo is centred in the whole screen in both states and does not move: the bars sit over its margins (audit 28, the owner's call Nov 10). Swiping to the next moment keeps them as they were. A note or a voice memo keeps its card and its bars.
8. **UC8** With a screen reader on, the bars never hide (on a phone; the web build can't tell) [T2].
9. **UC9** The viewer's top bar holds **Close** and **More** only. **Remind me here** (or, when one is set, "Reminder set: change or stop") and **Go here** are items in More, doing what they did [T-toolbar: one primary action; matrix 3].

### Quieter success

10. **UC10** No pill appears for an action whose result can be shown where it happened: a kept reply, adding to a thread, setting or stopping a reminder say so in the moment's info line instead ("Reply kept", "Added to a thread", "Reminder set") and to a screen reader, without moving focus [matrix 19, 20, F4] (steward S3). A failure, a result elsewhere ("Saved to Photos", "Downloaded") and a pill with Undo still show.
11. **UC11** Nothing else on these screens changes: the toolbar's Respond and Edit, the More menu's other items, Delete's Undo and its effect on every list, the replay's viewer and its Continue.
12. **UC12** With a reminder set on a moment, the viewer's info line says "Reminder set" without opening More (steward S4).
13. **UC13** A delete still waiting when the app is killed is stored on the next launch: what went stays gone, and no pill is shown for it (decision 0113).

## Record (Nov 10)

Built on `claude/ui-conformance` (from `claude/viewer-toolbar`, with `main` merged in). Tests first: `UI conformance: tests first (UC1-UC13, failing)`. Audited Nov 10 (see Audit).

- **Built as written:** UC1-UC13. Unit: `deletion/conformance.test.ts` (UC1, UC2, UC13), `threads/conformance.test.ts` (UC6), the Undo window's D5 and D6 tests moved to Close instead of a timer. Journeys: `deletion` (UC1, UC3, UC4, UC5), `threads` (UC4, UC6, UC10, UC11), `edit` (UC7, UC9), `walk`, `memories`, `chronicle` (UC9, UC10, UC12). UC8 is a device item (the web always reports a screen reader).
- **D4, D5 and OT14 amended** (decision 0113): a moment, a thread and a removal act at once; Undo waits; a killed app completes the delete.
- **Steward (Nov 10):** 0 breaches, 4 drift, 1 tone, all accepted (the plan).
- **Looked at** (the screenshot rule): the photo viewer with Close and More (`45-photo-viewer`), the note viewer's toolbar, the Respond menu.
- **Native:** the waiting delete across a kill, the announcements, the screen-reader check, the tap toggle: `docs/NATIVE_UNVERIFIED.md`, "UI conformance".


## Audit (Nov 10)

The auditor (F2-F15), the steward (S1-S6) and the `ux-reviewer` (U1-U10, from the pictures at 390 x 844), numbered on from my own finding. **31 findings: 24 fixed, 4 duplicates of fixed ones, 1 deferred, 2 rejected.** The owner's calls: a waiting delete is stored when you leave its screen (6), and the photo keeps still (28).

1. The viewer behind an overlay stays in the page, so two info lines and two toolbars are found: accept, the moment unmounts while the editor, the reminder, the note or the thread picker is up (`ui-conformance audit 1`, walk journey).
2. A removed membership stays hidden after it is stored, so adding the moment back shows nothing (F2): accept, a stored removal unhides its key (`ui-conformance audit 2`).
3. Undo with the bars hidden can land on a video or note with no Close (F3): accept, only a photo hides its bars (`barsShown`, `ui-conformance audit 3`).
4. Thread writes read the database, not what waits in Undo (F4): accept, a thread write stores what waits first (`ui-conformance audit 4`).
5. An older commit clears `pending_delete` while a newer delete is still being stored (F5): accept, meta holds the list of what is not yet stored (`ui-conformance audit 5`).
6. The pill no longer goes away, so it follows the owner and covers the thread page's Back and More (F6): accept, a waiting delete is stored on every route change (the owner's call), and the pill sits at the bottom (`ui-conformance audit 6`, threads journey).
7. A moment waiting in Undo can come back as a reminder (F7): accept, `dueRecalls` skips hidden captures (`ui-conformance audit 7`).
8. On the web, the info line's statuses reach no screen reader (F8): accept, the line is a polite live region (`ui-conformance audit 8`, threads journey).
9. A saved delete is dropped if a new delete starts before launch reads meta (F9): accept, `resume` merges and stores every saved job (`ui-conformance audit 9`).
10. "Reply kept" can land on the wrong moment (F10): accept, the reply's `replyTo` is taken when it starts; covered by typecheck and the threads journey.
11. On a 320 px phone the pill's words wrap, and Close's name is wrong for a removal (F11): accept the name (`dismissLabel`, `ui-conformance audit 11`); reject the wrap, which is the pill's text at 200% (M3, WCAG 1.4.4).
12. More has no scroll and no width limit (F12): accept, the menu scrolls within the screen; covered by typecheck and the edit journey.
13. With a screen reader on, the photo is a button that does nothing (F13): accept, it takes no tap then; a device item (`docs/NATIVE_UNVERIFIED.md`).
14. Drift between code, docs and tests (F14): accept, the copy names no time (`ui-conformance audit 14`) and the docs follow.
15. A delete made to free space frees nothing until ✕ (F15): accept, resolved by 6 (leaving the screen stores it).
16. A voice reply keeps recording after a tap hides its controls (S1): accept, the bars stay up while a reply records (`ui-conformance audit 16`).
17. The waiting pill follows the owner onto the replay (S2): duplicate of 6.
18. A moment's reminder can fire after it was deleted (S3): duplicate of 7.
19. The viewer's info line has no date (S4): accept, it reads "Kind · day, time · …" (`ui-conformance audit 19`).
20. The waiting pill covers the thread screen's Back and More (S5): duplicate of 6.
21. The info line can say the same thing twice (S6): accept, "Added to a thread" stands in for "In a thread" (`ui-conformance audit 21`).
22. Two pictures were taken mid-fade, and the walk's confirm had none (U1): accept, the deletion journey waits for the fade and shoots `27-walk-confirm`.
23. The pill covers Back and More (U2): duplicate of 6.
24. Two ✕ with different meanings sit a thumb apart (U3): accept, the viewer's pill sits above its toolbar, far from Close; covered by the pictures.
25. The reminder editor's chip rows wrap at 390 px (U4): defer, the editor predates this slice (`docs/DEFERRED.md`).
26. Go here appears in no picture of More (U5): accept, the edit journey opens More on the walk screen's viewer (`ui-conformance audit 26`, `44-viewer-more-go`).
27. Edit and the Respond menu's Note share an icon (U6): accept, Note is a page.
28. The photo jumps when the bars toggle (U7): accept, the owner's call: centred in the whole screen in both states (`ui-conformance audit 28`, edit journey).
29. The viewer's title looks like a button (U8): accept, it is plain text.
30. Two sections on Memories are both called "Threads" (U9): reject, the owner's call (decision 0105: one word, two marks).
31. The wrapped info line starts with a separator (U10): reject, opinion; the line now leads with the day (19).
