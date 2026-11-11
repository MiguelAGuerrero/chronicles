<!-- Repo first: from the owner's proposal G4 (docs/STATUS.md, "Next evolutions"), answered yes Nov 11 (/tend inbox G4 yes); decision 0140. The second slice of specs/presence (PR1-PR8). Not a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Presence readers: the archive, bars, notable names, greens and the planner read classes

Nov 11, 2026 · @Miguel Guerrero

## Vision

Idea: "Presence, its second slice: the archive, bars, notable names, greens and the planner read classes" (G4, from G3 and decision 0140's "consumers read its classes, never source tags").
Verb: earn (what a street holds is said once, so the map, the card's bars, a scenic route and the planner agree on it)
Touches: decisions 0127 ("a place may light two bars": from its classes), 0103 and 0108 (the archive's classes are chronicles-data's contract; the app maps them into presence and the contract is unchanged), 0109 (Overture never makes a mark), 0140 (one presence system; curation is not classification).
Verdict: aligned
Shape: as filed in G4: the second of presence's slices; nothing a person sees changes beyond the list in "What changes".
Criteria: PS6, PS8.
Open: none (G4 answered yes; decision 0140).

## What it is

Presence (`src/lib/presence/`, PR1-PR8) said what a map poi or an Overture place is. Four readers still decided it themselves: the places archive kept its own table of categories and kinds (`archivePois.ts`) and a second bar for its museum (`ARCHIVE_ALSO`, carried on places as `alsoBars`); the bars read a name for History (`historicName`) while marks read it another way (`notableName`); scenic routes read raw landcover tags (`greenKind`); the planner kept its own list of findable categories (`MARK_KINDS`). Now each source's adapter asks presence, a place carries its classes (never stored), and the bars, marks, greens and the planner read them.

Two facts about a place become classes, because both marks and bars read them: **notable** (its name says historic or notable, or the places archive records it: the archive admits only Wikidata items of fixed types and heritage listings) and **historic** (a museum that is notable is a place of history too, PK1-PK3). Curation still decides what makes a mark (`BY_NAME` asks for `notable`; chains and `NEVER_MARK` as before): presence says what a place is, never whether it is worth finding (0140).

## Decisions

- **The G4 entry** (the owner's yes, Nov 11): its eight criteria, below as PS1-PS8; nothing else a person sees changes.
- **One notable rule** (PS3): the bars' rule wins, a listed word as whole words reading past a neighbourhood's "Old Town" and "old and new" (presence-and-kinds audit 5), because it is the one of the two that changes nothing in the recorded fixtures and the US archive (23,104 names: the marks' rule would light History for Philadelphia's Old City Hall, which PK6 holds unchanged). What it changes is listed below.
- **The archive's places are notable** (PS6): the archive admits only recorded places, so a plain-named church, cemetery or memorial from it stays a mark, as it is today (516 of the US archive's 522 memorials and 972 of its 1,110 churches have plain names). From the map, the same classes answer by the name, as they did.

## Acceptance criteria

1. **PS1** The places archive's classes map into presence classes: presence holds the archive's table, `archivePois.ts` holds no category or kind of its own, and each class keeps the category and kind PW5 pins.
2. **PS2** A place carries its classes, possibly several, and the bars it lights are read from them: a museum the data calls historic (the archive's museum, or a notable name) is museum and history and lights Culture and History; no second bar comes from `alsoBars` or from a name read by the bars.
3. **PS3** Whether a name is notable is decided once, by one rule, for marks and bars alike.
4. **PS4** Scenic routes' greens read presence classes from the tiles' landcover features, not raw tags: a park or garden is green as a park, a wood as a wood, anything else is not green.
5. **PS5** The walk planner reads classes: a place lights a bar by its classes and counts by curation's one rule, the atlas's; the planner holds no list of categories of its own.
6. **PS6** Whether a place is a mark is one rule over its classes, whatever source gave them: the same classes and name answer alike from the map and the archive. A plain-named memorial is a mark where the archive records it and, from the map, only by a notable name, as a church is (presence review F3).
7. **PS7** PR2's guard holds with no exception: no module outside presence spells a poi class, an Overture root, an archive class or a landcover class.
8. **PS8** Nothing else a person sees changes: golden tables captured before the slice hold the archive's classes (category, kind, mark, bars), the bars and marks of every golden poi pair under a plain, a notable and a neighbourhood name, the landcover classes' green, and the atlas's steps over presenceSample's areas.
9. **PS9** The presence code moves on, so atlas rows are derived again; a landing row from the last code stands, since no density weight changed.

## What changes (PS3)

| What | Before | After |
|---|---|---|
| A place of worship, town hall or courthouse, cemetery, community centre or library, memorial or nature reserve from the map whose only notable word is the "Old" of "Old Town", "Old City", "Old Quarter", "Old Village" or "old and new" (e.g. "Old Town Baptist Church", a town hall named "Old Town Hall") | a mark by its name | not a mark, as such a museum already lights no History |

None of the 23,104 names in the fixtures (presenceSample, presenceTowns) and the US archive (version 20261111.6) is such a place, so no picture differs.

## Record

In progress.
