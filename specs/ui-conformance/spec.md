<!-- Repo first: written from the owner's request in a session (Nov 10), not a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). Grounded in docs/research/ui-references.md (Apple HIG, Material 3, NN/g, WCAG 2.2); rule ids in brackets point there. Builds on decision 0108. -->

# UI conformance: Undo that waits, deletes that don't ask, a viewer that steps aside

Nov 10, 2026 · @Miguel Guerrero

The sourced patterns (`docs/research/ui-references.md`) found five places where the app departs from how iOS, Android and the research say these things work (`docs/DEFERRED.md`, "UI patterns and the UX research"). The owner chose to fix four of them: Undo that ends on a timer, a confirm before deletes that can be undone, a viewer whose bars never hide, and success pills for results already on screen, with a top bar of four round buttons.

## Vision

Idea: Bring the app's deletes, Undo, moment viewer and confirmations in line with the platforms' own patterns: Undo that waits for you, no confirm before a delete you can undo, a viewer whose bars step aside on a tap, no pill for a result you can see, and a top bar of Close and More.
Verb: honour and return (a moment arrives whole and can be looked at without chrome; what you remove can be brought back on your own time).
Touches: Always "Restraint in motion, colour and copy: the content is the novelty, not the chrome" (the viewer's bars hide; pills that only congratulate go); Never "Celebration: confetti, fanfare, big numbers, accent-coloured wins" (nothing is added; pills are removed); Always "Capture is one tap away on every screen you walk or capture from" (untouched: the capture stack does not change; decision 0108 says actions on an existing moment live in its toolbar or menu); Never "Editing out the lows" (a delete is still the owner's own act; Undo makes it safer, not easier to lose); precedents 0108 (the viewer's toolbar and menu), D4 and D5 of `specs/clearing-walks-and-moments` (amended here).
Verdict: aligned
Shape: as asked.
Criteria: UC10 (no success pill for a result on screen, each still said to a screen reader); UC7, UC8 (the bars hide only on the owner's tap, and never with a screen reader on).
Open: what a killed app does to a waiting delete (plan, "For you to decide").

## Decisions (the owner's calls, Nov 10)

- The slice covers four of the five conflicts: Undo stays until used; no confirm for undoable deletes; the viewer's bars hide on a tap; quieter success and a slimmer top bar.
- Deleting a whole walk keeps its confirm: it takes a trace, its moments and its streets at once (rare, and the most lost; matrix 8). Removing a walk's media keeps its confirm too (steward S2, accepted).

## Criteria

### Undo that waits (amends D5)

1. **UC1** A delete's pill ("Moment deleted", "Walk deleted", "Photos, videos and memos removed", "Thread deleted", "Removed from the thread") stays until the owner taps **Undo** or **✕**, starts another delete, or leaves the app; it never ends on a timer [F3, M3 snackbar, NN/g].
2. **UC2** Tapping ✕ or starting another delete stores the delete at once; Undo brings back what went, as it was. While it waits, what went is hidden from every list, as before (D5), and the wait survives the phone locking or the app going to the background (steward S1; how a killed app ends it is the owner's call, plan).
3. **UC3** The pill's Undo and ✕ are each at least 44 px and at least 8 px apart; Undo is the more prominent; ✕ is named for what it does ("Close, it stays deleted"); the pill is announced when it appears [X0, X0b, F4] (steward S5).

### Deletes that don't ask (amends D4)

4. **UC4** Deleting a moment, deleting a thread and removing a moment from a thread act at once, with no "Delete this?" card first; the pill with Undo follows [A3, matrix 7].
5. **UC5** Deleting a whole walk, and removing a walk's photos, videos and memos, still ask first and say what goes, as D4 says, then show the pill with Undo [matrix 8] (steward S2: a bulk loss, the lows included).
6. **UC6** **Remove from this thread** acts at once with Undo, also when it ends the thread; Undo brings the thread back with its name and members (replaces owner-threads audit 5's confirm).

### A viewer that steps aside

7. **UC7** In the moment viewer, a tap on a photo hides the top bar, the info line and the toolbar, and the photo fills the screen; another tap brings them back [T7, V1]. Swiping to the next moment keeps them as they were. A note or a voice memo keeps its card and its bars.
8. **UC8** With a screen reader on, the bars never hide (on a phone; the web build can't tell) [T2].
9. **UC9** The viewer's top bar holds **Close** and **More** only. **Remind me here** (or, when one is set, "Reminder set: change or stop") and **Go here** are items in More, doing what they did [T-toolbar: one primary action; matrix 3].

### Quieter success

10. **UC10** No pill appears for an action whose result can be shown where it happened: a kept reply, adding to a thread, setting or stopping a reminder say so in the moment's info line instead ("Reply kept", "Added to a thread", "Reminder set") and to a screen reader, without moving focus [matrix 19, 20, F4] (steward S3). A failure, a result elsewhere ("Saved to Photos", "Downloaded") and a pill with Undo still show.
11. **UC11** Nothing else on these screens changes: the toolbar's Respond and Edit, the More menu's other items, Delete's Undo and its effect on every list, the replay's viewer and its Continue.
12. **UC12** With a reminder set on a moment, the viewer's info line says "Reminder set" without opening More (steward S4).
