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
Criteria: RK1-RK12, in the list below.
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
7. **RK7** Places and moments in the palette are ordered by distance or by time only: no rating, popularity or "best" wording, and no count in digits.
8. **RK8** A recalled moment appears as a moment with its place and time, never a snippet or a count; recalling by keyword makes no link and touches no row (0125).
9. **RK9** Every plain-text surface (rows, Lately, a day, the resurfaced card, a notification, the replay) reads a keyword reference as words through the one core function (0125's), as "here (the science center)", never a raw token. The viewer draws it with its value in place of a card.
10. **RK10** The owner can change which place a reference meant, from the places near the moment's fix in plain distance order, and the choice replaces the stored value.
11. **RK11** No network request is made when inserting, showing or correcting a reference: resolution reads only the local adapters (0016) and the clock.
12. **RK12** No temperature or weather entry exists in the palette.

## Open (recommended answers; the owner decides at the plan)

1. **Over there:** the owner picks a point on a map (recommended) or aims the phone. The moment's fix and one tap on the map need no compass permission.
2. **Time words:** only words about the moment itself ("now", "this morning", "N minutes in"). Relative words that move with when the note is read ("yesterday", "last week") are left out (open question 5 of the vision).
3. **0125's `@`:** this amends it (the palette is in front of the picker). The slice's decision record says so and keeps its "the reference lives in the text" call.
4. **Plain-text form:** both the keyword and its value, "here (the science center)".
5. **The fix:** the editor often has no fix yet (a loose moment is placed when its fix arrives; a walk's moments are placed by the trace at stop). See the plan: which fix a keyword resolves from while writing.
