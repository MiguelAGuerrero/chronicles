<!-- Repo first: written from the owner's request in a session (Nov 11), after the gate. Extends decision 0125 (specs/moment-references); not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Reference keywords: a command palette in a note

Nov 11, 2026 · @Miguel Guerrero

A note's `@` opens a palette, not only the moment picker. Beside moments it offers reserved keywords (here, next to me, over there, now, and a few time words) that resolve from data the app already keeps, at the moment the note is written, and stay in the note's text with the value they resolved to. Years later "I'd like to come back here" still says where.

## Vision

Idea: a command palette in a note, opened like Notion's `@`, offers reserved keywords (here, over there, next to me, time words, recall a moment) that resolve from stored data into a reference in the note's text.
Verb: honour (the moment arrives whole, its place and time held) and return (a moment recalled into a note).
Touches: Always "A moment carries its context"; Never "Writing the owner's words for them" (each keyword is the owner's pick, the note's other characters are untouched); Never "Data leaving the device without a tap" (every entry resolves locally; no weather); Never "All-day tracking" (0036: the moment's one fix, never a new read); Never "A capture behind a menu or an extra tap" (the palette opens only on a typed `@`); Never "Popularity" and "Ratings" (entries ordered by distance or time only); decisions 0125 (the reference lives in the note's text, nothing else stored), 0016 (no dataset hard-coded, adapters), 0036, 0005; open question 5 (calculated for you), a mild case.
Verdict: aligned
Shape: as the owner gave it (Nov 11): explicit keywords from a palette, not matching of free text; space, time and other moments for now; no temperature (needs a network call, a decision on what the cloud is for).
Criteria: RK1-RK17, in the list below (RK13-RK17 from the steward, Nov 11).
Open: see "Open" below.

## Decisions (the owner's calls)

- **Explicit keywords from a palette** opened by `@`, like Notion's; the app never matches free text (Nov 11).
- **For now: other moments, time and space** (Nov 11). Weather and temperature are out of this slice; the palette can take an entry later.
- **The reference lives in the note's text and carries its resolved value**; no new table, no migration (0125).
- **The fix** a keyword resolves from is the last known position the capture stamp already holds, and for a saved note the moment's own coordinates; no fix, no place entry (Nov 11).
- **Over there is a resolution picker** (Nov 11): every notable place near the moment, or a point picked on the map. It is the same picker that corrects a reference.
- **Time words are basic anchors common in prose** (Nov 11): now, soon, today, tonight, this morning, yesterday, tomorrow and the like, each resolved against the moment's own time and stored as an absolute value, so it never moves with when the note is read.
- **A reference is a displayed word and its actual value, like markdown** (Nov 11): the note shows "here", and its value in parentheses, "here (the science center)", by default; a setting turns the parentheses off. A person who picks a reference means it resolved by the time they recall the moment.
- **Deletion** (Nov 11): references and stored coordinates belong to their moment. Removing a moment from a walk leaves them; deleting the moment itself removes them. When the reference points at another moment and that moment is deleted, only the pointer goes: the word and its value stay.

## Criteria

1. **RK1** Typing `@` in a note opens one palette listing moments (0125's picker, now one entry) and the reserved keywords; the capture flow itself gains no step. Dismissing it leaves the `@` as typed.
2. **RK2** Choosing a keyword embeds a reference in the note's text; every other character of the note is untouched.
3. **RK3** The reference stores the value it resolved to inside its token (the keyword, its label, and the coordinates or time): no table, no migration, no row touched, and a note with no keywords is stored byte for byte as before.
4. **RK4** A keyword resolves from the moment's own fix and time, not where the owner is while editing: a reference chosen when a note is edited later reads the note's moment, never the owner's present position.
5. **RK5** After a tile or map rebuild, an existing reference shows the value it was saved with.
6. **RK6** An entry that cannot resolve (no fix yet, no place within range, a time it cannot say) is absent from the palette, never invented.
7. **RK7** Places and moments in the palette and the correction list are ordered by distance or by time only: no rating, popularity or "best" wording, no number, no "top" or "closest" label, and no count in digits; a place's distance is said in words. Places come only from the places adapters' own gate (worth the stop, 0109, 0127), never a business list.
8. **RK8** A recalled moment appears in the palette and the note as a moment with its place and date (a moment with no place says so in words, 0139), never a bare thumbnail, snippet or count; recalling by keyword makes no link and touches no row (0125).
9. **RK9** Every plain-text surface (rows, Lately, a day, the resurfaced card, a notification, the replay) reads a keyword reference through the one core function (0125's) as its word and its stored value, "here (the science center)", never a raw token, and adds no words beyond what is stored. The viewer draws the same, and a tap on the word opens the moment's place and time.
10. **RK10** The owner can change which place a reference meant, from the resolution picker (RK18), and the choice replaces the stored value.
11. **RK11** No network request is made when inserting, showing or correcting a reference: resolution reads only the local adapters (0016) and the clock.
12. **RK12** No temperature or weather entry exists in the palette.
13. **RK13** (steward S1) "Here" and "next to me" name a place only when exactly one lies within a stated range (`REF_RULES`); otherwise the entry names the street, or is absent. The palette shows the label before it is chosen, so what is stored is the owner's confirmed pick; RK10 corrects it. When the editor's fix and the moment's saved fix differ, the stored value follows the moment's.
14. **RK14** (steward S2) The editor opens, takes typing and saves with no wait on a fix or a place read; entries that need a fix appear when it exists, and the palette never blocks typing. `@` stays out of the capture stack's quick note (deferred in 0125).
15. **RK15** (steward S3) No location call is made by the editor, the palette, the correction list or "over there": `fix` is only the existing stamp (`pos.current.here`) or the moment's saved coordinates, and the map pick does not centre on a fresh read.
16. **RK16** (steward S5) A time word resolves against the moment's own time, never the clock when the note is read or edited: "now" to its clock time ("14:20"), "today", "tomorrow" and "yesterday" to their dates, "this morning", "tonight" to the part of that day, "soon" and "later" to "after 14:20". The words are a fixed allow-list of basic anchors, none saying anything of quality or mood; "N minutes in" is offered only for a moment on a walk.
17. **RK17** (steward S7) Any share of a note's text through the share sheet reads a keyword as its label and carries no raw token or coordinate; the stored token stays in the note (and the backup bundle) as truth.

18. **RK18** "Over there", and the correction of a place, open one resolution picker: the notable places near the moment's fix in distance order (RK7), and "Choose on the map", where one tap picks a point; the point is stored with a label only when the owner names or accepts one. No fix: the map alone.
19. **RK19** A setting, on by default, shows each reference's value in parentheses beside its word; off, plain text and the viewer show the word alone. It is saved with the other settings (one shell test over `fakePorts()`), changes no stored token, and reads the same on every surface.
20. **RK20** Removing a moment from a walk leaves its references and stored coordinates untouched; deleting the moment removes them with it (0125, RF8). Deleting a moment that another note references leaves that note's text as written: only the pointer is gone, so the reference reads as its word and value and opens nothing (this replaces RF5's "a moment no longer kept" for a reference that carries its words; Undo brings the pointer back).

## Open

1. **0125's `@`:** the palette sits in front of its picker, so this slice's decision record says it amends 0125 (and RF5, RF6, per RK20) and keeps its "the reference lives in the text" call. Assumed yes.
2. **Is a nearest-place label "calculated for you"** (vision open question 5)? Read as the owner's own pick from a list shown before it is stored; yes unless you say otherwise.
