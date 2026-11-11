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
- **A Notion-style `@` experience first, extensible later** (Nov 11): a quick, easy note comes first; the menu beside the field with filtering, pills where a note is read, tinted words in the field where the platform allows. Markdown shortcuts and a block editor come later, the entries and the token being open to new kinds.
- **Time words are basic anchors common in prose** (Nov 11): now, soon, today, tonight, this morning, yesterday, tomorrow and the like, each resolved against the moment's own time and stored as an absolute value, so it never moves with when the note is read.
- **A reference is a displayed word and its actual value, like markdown** (Nov 11): the note shows "here", and its value in parentheses, "here (the science center)", by default; a setting turns the parentheses off. A person who picks a reference means it resolved by the time they recall the moment.
- **Deletion** (Nov 11): references and stored coordinates belong to their moment. Removing a moment from a walk leaves them; deleting the moment itself removes them. When the reference points at another moment and that moment is deleted, only the pointer goes: the word and its value stay.

## Criteria

1. **RK1** Typing `@` in a note opens one menu listing the reserved keywords and the moments (0125's picker, now one section of it); the capture flow itself gains no step. Dismissing it leaves the `@` as typed.
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
19. **RK19** A setting, on by default, shows each reference's value in parentheses beside its word; off, the viewer and the screens that draw a note (the card, the day list, the replay's bubbles and steps, the responses) show the word alone. It is saved with the other settings (one shell test over `fakePorts()`) and changes no stored token. The strings the core modules build (the resurfaced feed's words, Memories rows, a notification) always show the value; wiring the setting through them is deferred (`docs/DEFERRED.md`).
20. **RK20** A reference's coordinates and values live in its note's own text, so nothing but deleting that moment removes them: clearing or rebuilding a walk's derived data (places, streets, summaries) leaves the token as written. (The app has no operation that detaches a moment from its walk; deleting a walk deletes its moments, as it already does.) Deleting a moment that another note references leaves that note's text as written: only the pointer is gone, so the reference reads as its word and value and opens nothing (this replaces RF5's "a moment no longer kept" for a reference that carries its words; Undo brings the pointer back).
21. **RK21** (the owner, Nov 11: a Notion-style experience, quick and easy first) The menu opens beside the field, never over it, and filters as the owner keeps typing after the `@` ("@to" keeps tomorrow and tonight; "@harbor" keeps the moments about it); no letters shows everything; a space, or a query nothing matches, closes it and leaves what was typed. A pick replaces the `@` and the letters typed after it, and nothing else.
22. **RK22** On the web the menu is also driven from the keyboard: arrows move a highlight, Enter picks it, Escape dismisses it; a phone's keyboard needs nothing but a tap.
23. **RK23** The viewer draws a keyword as a pill inline in the note's words: the word, then its value in a quieter tone (the value only while the setting is on); plain-text surfaces say the same words (RK9); a place pill can be corrected by a tap (RK10).

## Open

1. **0125's `@`:** the palette sits in front of its picker, so this slice's decision record says it amends 0125 (and RF5, RF6, per RK20) and keeps its "the reference lives in the text" call. Assumed yes.
2. **Is a nearest-place label "calculated for you"** (vision open question 5)? Read as the owner's own pick from a list shown before it is stored; yes unless you say otherwise.

## Record (Nov 11)

Built on `claude/clever-darwin-ptb8ig`, tests first (`Reference keywords: tests first (RK1-RK20, failing)`), then the code.

- **Built as written:** RK1-RK20, with the notes below.
- **Unit tests:** `threads/keywords.test.ts` (RK2-RK10, RK12, RK13, RK16-RK18, RK20-RK22), `threads/keywordsShell.test.ts` (RK4, RK11, RK14, RK15, RK19).
- **Journey:** `threads` (RK1, RK2, RK3, RK8, RK9, RK10, RK14, RK18, RK21-RK23; pictures `79-ref-palette`, `80-ref-resolve`, `81-ref-keyword`).
- **Code:** `lib/refs.ts` (extended), `lib/refKeywords.ts`, `lib/refPlaces/`, `lib/refValues/`, `components/threads/RefPalette.tsx` and `RefResolve.tsx`, `MomentList` (extracted from `MomentPicker`), `NoteEditor`, `NoteText`, `CaptureView` (the correction), and the readers that pass the setting.
- **Changed while building:**
  - A new reply resolves from `getLastFix()`, the last fix the app already knows, not the capture's own stamp, which the editor cannot reach. A saved note takes the moment's own fix and no stamp (RK4, RK15).
  - RK19's setting reaches the screens that draw a note; the strings core modules build (feed words, Memories rows, a notification) always show the value (`docs/DEFERRED.md`).
  - RK20's first clause is vacuous in the app: nothing detaches a moment from its walk, and deleting a walk deletes its moments, so a keyword goes only with its moment.
  - "N minutes in" is built and not offered (the viewer does not know the walk's start).
  - A time keyword is never corrected from the viewer; a place keyword is.
  - A spot picked on the map is called "a spot on the map" when the owner gives it no name.
  - The map pick shows the app's own map, whose tiles come over the network as everywhere; resolution reads only the cache (RK11, the journey's "nothing is sent anywhere but the map tiles").
- **The Notion-style round (the owner, Nov 11):** RK21-RK23 added after the first build, tests first (`tests first for the inline menu and pills`). The full-screen palette became a menu beside the field that filters as the owner types; `MomentList`'s search became `useMomentMatches`; the editor tracks the cursor (`menuQuery`) and handles the arrows and Enter on the web. Not built: tinted words inside the field (a native text field cannot style spans and stay controlled, and the web's is a plain box), so the pill is drawn where a note is read (`docs/DEFERRED.md`).
- **Decision:** 0141 (amends 0125).
- **Native unverified:** `docs/NATIVE_UNVERIFIED.md`, "Reference keywords".

## Audit (Nov 11, at the owner's request; the auditor 1-12, the steward 13-20, the UX review 21-30)

Triage:

1. A keyword-only note shows its raw token in the owner's thread: accept (`NoteBubble` read only moment tokens).
2. Typed text that looks like a token is parsed; a place name with `|`, `}` or `]` is stored with spaces: defer (an escape grammar is a data-model change; both are rare; `docs/DEFERRED.md`).
3. Rows shift when "here" and "next to me" arrive: accept ("over there" is always the first row).
4. A selection event while resolving drops the pick: accept.
5. A pick with the cursor inside the typed word leaves the rest behind: accept.
6. Enter with nothing highlighted, or during composition, picks: accept (Enter picks only after a letter or an arrow).
7. A time keyword has no year; the clock uses the device's timezone: reject the year (the moment's own date, with its year, sits beside the note); defer the timezone (the app keeps no timezone anywhere).
8. A keyword's value words become the Chronicle's thread terms: accept.
9. A save during the setting's load is overwritten: accept; the first-frame flash with the setting off: defer.
10. The 500-character limit counts shown words including values: reject (not wrong in practice).
11. A pill has no spoken hint, and its target is under 44 pt: accept the hint; defer the target (a nested Text on a phone).
12. A stale controlled `selection` on native: defer (native only, unverified).
13. A new reply's "here" resolves from a last fix with no age limit (the owner's call: only a fresh fix, the reply's own stamp limit): accept.
14. A menu moment row has a date and no place: accept (it says "not on a walk" in words, and may wrap).
15. An unnamed map pick stores "a spot on the map", words the owner did not write (RK18 says a label only when named or accepted): accept.
16. The setting does not reach core-built strings and a map-picked coordinate is a second place: accept saying so beside the switch; reject the second place (the owner's call, Nov 11: stored coordinates belong to their moment).
17. Two clock styles; the app decides what "evening" is: accept the clock style (the viewer's); reject the rest ("evening" is the owner's own word).
18. Copy: "No place close by." and "What did you mean?": accept ("No named place near this spot.", "Which place?").
19. The pill's bold chrome: accept with 25.
20. The setting sits in the walk's start settings: defer (no reading-settings surface exists yet).
21. The highlighted row is nearly invisible: accept (a bar and a stronger tint); defer `aria-activedescendant`.
22. The card jumps as the menu changes size: accept (the card is pinned near the top).
23. Keyboard avoidance with the menu open: accept in part (pinned top, a height for the menu); defer a scroll cue and a device picture (native).
24. The map pick says nothing about tapping: accept the line; defer a filled pin and the Back/X pair.
25. A pill does not look tappable: accept no bold, a quieter value, vertical padding and a spoken hint; defer an icon and a 44 pt target.
26. Moments and keywords share a list: reject (opinion; a moment's matching is the picker's own rule, OT5; group labels add chrome).
27. "soon" and "later" read alike: defer (the allow-list is the owner's call, RK16; a question).
28. The resolver is bare: accept the empty line's size; defer icons.
29. Terminology of the switch: accept ("Show the place or time beside a pick").
30. Rows under 48 dp: accept (48).

Result (Nov 11): 30 findings, 23 fixed (9 of them in part: 9, 11, 16, 17, 21, 23, 24, 25, 28), 4 deferred (2, 12, 20, 27), 3 rejected (7, 10, 26; 7's timezone part deferred). The steward's S1 went to the owner (only a fresh fix).

Tests: `reference-keywords audit N` in `threads/keywordsAudit.test.ts` for 1, 3, 4, 5, 6, 8, 9, 13, 15, 17 (unit) and in the `threads` journey for 11, 14, 18, 21, 22, 24, 25, 30 (written as todos in `reference-keywords audit: the triage and the regression tests first`). Findings 16, 19, 23, 28 and 29 are copy and layout, covered by the typecheck and the journey's pictures. Journeys run after the fixes: `threads` (forced, with pictures), then `chronicle`, `edit`, `nudge`, `qol`, `ready`, `responses`, `resurface`, `stacks`, `tabs`, `walk` once each.

Changes the audit made: a note with any reference is drawn through `NoteText` everywhere (`hasRefs`); "over there" is always the menu's first row; the pick replaces the whole typed word; Enter picks only after a letter or an arrow; a keyword's value is not a thread term; a save during the setting's load wins; a new reply offers place keywords only from a fix as fresh as its own stamp (15 s, `FRESH_FIX_MS`); an unnamed map pick stores no label ("over there" alone); times read in the viewer's clock style; the menu's rows are 48 high with a bar on the highlighted one; the note card is pinned near the top while the menu is open; the pill's word is in the note's weight and its value quieter, with a spoken hint.
