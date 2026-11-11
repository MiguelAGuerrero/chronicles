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

## Criteria

1. **RK1** Typing `@` in a note opens one palette listing moments (0125's picker, now one entry) and the reserved keywords; the capture flow itself gains no step. Dismissing it leaves the `@` as typed.
2. **RK2** Choosing a keyword embeds a reference in the note's text; every other character of the note is untouched.
3. **RK3** The reference stores the value it resolved to inside its token (the keyword, its label, and the coordinates or time): no table, no migration, no row touched, and a note with no keywords is stored byte for byte as before.
4. **RK4** A keyword resolves from the moment's own fix and time, not where the owner is while editing: a reference chosen when a note is edited later reads the note's moment, never the owner's present position.
5. **RK5** After a tile or map rebuild, an existing reference shows the value it was saved with.
6. **RK6** An entry that cannot resolve (no fix yet, no place within range, a time it cannot say) is absent from the palette, never invented.
7. **RK7** Places and moments in the palette and the correction list are ordered by distance or by time only: no rating, popularity or "best" wording, no number, no "top" or "closest" label, and no count in digits; a place's distance is said in words. Places come only from the places adapters' own gate (worth the stop, 0109, 0127), never a business list.
8. **RK8** A recalled moment appears in the palette and the note as a moment with its place and date (a moment with no place says so in words, 0139), never a bare thumbnail, snippet or count; recalling by keyword makes no link and touches no row (0125).
9. **RK9** Every plain-text surface (rows, Lately, a day, the resurfaced card, a notification, the replay) reads a keyword reference as its stored label through the one core function (0125's), never a raw token, and adds no words beyond that label. The viewer draws it with its value and its moment's place and time.
10. **RK10** The owner can change which place a reference meant, from the places near the moment's fix in plain distance order, and the choice replaces the stored value.
11. **RK11** No network request is made when inserting, showing or correcting a reference: resolution reads only the local adapters (0016) and the clock.
12. **RK12** No temperature or weather entry exists in the palette.
13. **RK13** (steward S1) "Here" and "next to me" name a place only when exactly one lies within a stated range (`REF_RULES`); otherwise the entry names the street, or is absent. The palette shows the label before it is chosen, so what is stored is the owner's confirmed pick; RK10 corrects it. When the editor's fix and the moment's saved fix differ, the stored value follows the moment's.
14. **RK14** (steward S2) The editor opens, takes typing and saves with no wait on a fix or a place read; entries that need a fix appear when it exists, and the palette never blocks typing. `@` stays out of the capture stack's quick note (deferred in 0125).
15. **RK15** (steward S3) No location call is made by the editor, the palette, the correction list or "over there": `fix` is only the existing stamp (`pos.current.here`) or the moment's saved coordinates, and the map pick does not centre on a fresh read.
16. **RK16** (steward S5) "Now" resolves to the moment's own time and reads as a clock time ("at 14:20"), whenever the note is edited. Time words are a fixed allow-list, none saying anything of quality or mood; "N minutes in" is offered only for a moment on a walk.
17. **RK17** (steward S7) Any share of a note's text through the share sheet reads a keyword as its label and carries no raw token or coordinate; the stored token stays in the note (and the backup bundle) as truth.

## Open (recommended answers; the owner decides at the plan)

1. **Over there:** the owner picks a point on a map (recommended) or aims the phone. The moment's fix and one tap on the map need no compass permission.
2. **Time words:** only words about the moment itself ("now", "this morning", "N minutes in"). Relative words that move with when the note is read ("yesterday", "last week") are left out (open question 5 of the vision).
3. **0125's `@`:** this amends it (the palette is in front of the picker). The slice's decision record says so and keeps its "the reference lives in the text" call.
4. **Plain-text form:** both the keyword and its value, "here (the science center)".
5. **The fix:** the editor often has no fix yet (a loose moment is placed when its fix arrives; a walk's moments are placed by the trace at stop). See the plan: which fix a keyword resolves from while writing.
6. **Is a nearest-place label "calculated for you"** (vision open question 5)? It is chosen from a list by the owner, so I treat it as the owner's pick; the line is yours to draw before a label is stored.
7. **A stored coordinate** (a map pick, a place's position) lives in the note's text and survives its walk's deletion, as RF8 already says a deleted moment never edits a note. Confirm.
