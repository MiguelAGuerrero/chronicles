<!-- Repo first: written from the owner's request in a session (Nov 17-18, 2026), after the owner stood in downtown Stroudsburg, PA, saw the card's dots say "plenty" and found one "?" on the map. Not a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). Decision 0197. -->

# Sights and Local life, phase 1: the bars in two groups (SG)

Nov 18, 2026 · @Miguel Guerrero

Explore's card and tiles show presence for eight kinds with one look and one vocabulary, but they are two different
promises: History, Art, Culture, Green and Views count only places that can turn up as a "?", while Food, Shops and
Nightlife count every place and never do. In downtown Stroudsburg the second kind of bar read "plenty" with nothing to
find behind it; over the 152-area presence sample, 145 of 421 lit bars have no "?" behind them, 140 of them Food, Shops
or Nightlife. Decision 0197 splits the bars into **Sights** (the findables) and **Local life** (the places you go into).

This is **phase 1: view only.** It groups today's bars under the two headings. What each bar counts does not change, so
Culture stays under Sights until phase 2 moves museums, galleries, theaters and community spaces into Local life (held
until chronicles-data covers National Park Service sites, decision 0197). No cache, no code bump, no data.

## Vision

```
Idea: "Two separate indicators: one for the points of interest, the findables, and one for the types of amenities, storefronts and other services that are there" (the owner, Nov 17); headings "Sights" and "Local life" (Nov 18).
Verb: earn (Explore: "where there is a lot, what makes a place itself"; the card stops promising "?" pins it cannot show).
Touches: Always "Guidance is structural… never whether it is good"; Always "Counts are words"; Never "Tallies…"; Never "Popularity, trending, foot traffic, other people's activity" (nearest fit: "Presence of places from open data (0080, 0084)"); Always "Restraint"; decisions 0067 (presence as dots; the card shows every kind), 0084 (what each bar counts), 0127 (no two bars redundant), 0194 (shops are presence, not points of interest), 0197.
Verdict: aligned if reshaped
Shape: the card's kinds under two quiet headings, Sights then Local life, each in a fixed order; tiles keep one row, the groups apart; dots and step words as today; Local life never yields a "?", a find, a name or a ranking, and "Local life" means what is there, never how busy it is.
Precedent: Atlas Obscura lists only curiosities, never businesses (a Sights-only list); Google Maps' nearby search splits "Things to do" from Restaurants, Coffee and Shopping chips (a type split); Walk Score groups amenities by type with a score (a counter-example). All from memory, unverified.
Criteria: SG1-SG11.
Open: none for phase 1 (phase 2's two are in decision 0197).
```

## Decisions (the owner's calls)

- **Two groups by one test** (Nov 17): "could you come across it and be struck by it from outside, or only if you go in?"
- **Headings "Sights" and "Local life"** (Nov 18), over "To find / To go into", "Outside / Inside", "Finds / In town" and
  "Finds / Storefronts".
- **Culture and Community become Local life bars in phase 2** (Nov 18); phase 1 leaves Culture under Sights, because
  until then it still counts only places that can be a "?".
- **Culture stays a Sight in phase 1** (the plan's reading of 0197, Nov 18): it still counts only places that can be a "?", so filing it under Local life before phase 2 would be untrue.
- **Phase 1 is view only; phase 2 waits** on chronicles-data's National Park Service sites (Nov 18, decision 0197).

## How adjacent apps do it

- **Atlas Obscura** (web and app): lists only curiosities and odd places, each a page; restaurants and shops are not in
  it. Source: from memory, unverified. **Unverified**.
- **Google Maps** (Android and iOS): nearby search offers chips by type (Restaurants, Coffee, Shopping, Things to do,
  Hotels); landmarks and attractions sit under "Things to do", apart from the places you eat or shop. Source: from
  memory, unverified. **Unverified**.
- **Walk Score** (web): groups nearby amenities by type (dining and drinking, groceries, shopping, errands, parks,
  schools, culture and entertainment) and sums them into a 0-100 score. Counter-example: the score (Never: scores); the
  grouping by type is the model. Source: from memory, unverified. **Unverified**.

## Criteria

### The task, in the owner's words

1. **SG1 · Tell what can be found from what is around.** On an area's card, "What's here" shows its kinds under two
   headings, **Sights** (History, Art, Culture, Green, Views) and then **Local life** (Food, Shops, Nightlife), each kind
   once, in that order. Under "Sights" one muted line says they are the places that can turn up as a "?" on the map;
   "Local life" has none. Finding criterion: someone shown the card and not told how it works can say which kinds can
   turn up as a "?", from what the section shows without opening "How the marks work" (the cold find, decision 0167).
2. **SG2 · The tile keeps its one row, in two groups.** An area tile's kinds stay one row on a 320 px wide phone with all
   eight present, on a tile at rest and on the selected tile (its 2 px border): the last kind ends inside the strip.
   The Sights kinds come first, then a wider space, then the Local life kinds; with kinds of one group only there is no
   wider space. The tile shows no heading words (pending the owner's answer, plan "Open" 1).
3. **SG3 · The headings are headers, one level under "What's here".** A screen reader hears "What's here", then
   "Sights", its line and its rows, then "Local life" and its rows; on the web the two are headings one level below
   "What's here" (`aria-level`), never peers of it or of the card's name.
4. **SG4 · Every kind keeps its row.** The card shows all eight kinds, "none" at full ink, each with its word and dots;
   a kind with something keeps its Suggest a walk, Local life's included (a walk through where the kind is dense, WP1,
   KW15). Both headings show even when every kind under one of them is "none", but only once the area's kinds are read:
   while "Reading this area…" shows, no heading does.
5. **SG5 · The tile says its groups aloud.** What a screen reader hears for a tile names the groups: "Sights: history
   some, art plenty. Local life: food lots." Only the groups with kinds present are said.
6. **SG6 · The headings stay quiet.** Each heading is sentence case, in ink, smaller than the card's name and set apart
   from the uppercase section titles; no group has its own colour, icon, dots, total or mark. The Storefronts list stays
   a section of its own after "What's here", never under "Local life".

### How the marks work

7. **SG7 · The explanation names the two groups.** "How the marks work" says, in words: the marks say which kinds of
   places are around and how much of each, never how good, how busy or how lively; Sights count only places worth
   finding; Local life counts every place of its kind and never turns up as a "?"; one mark is a little of the kind, two
   a handful, three a street's worth (true for every kind, whatever its steps). Its last line stays the ring's, or a
   town's or shape's own (TP8). It holds no digit. While Culture is a Sight it keeps saying a museum can count toward
   history and culture (phase 2 removes that).

### What does not change

8. **SG8 · A thin area says nothing.** An area whose ring the map knows almost nothing about shows neither heading, no
   kinds and no character line, on its tile and its card (AG3).
9. **SG9 · What each bar counts is unchanged.** Each kind's step, each mark and the map's "?" pins and dots are what they
   were: held by PS8 over the presence sample, unedited; and for every area of the sample the groups' kinds, laid end
   to end, are the area's present kinds in `ATLAS_ORDER`.
10. **SG10 · One order everywhere.** Sights and Local life together hold every kind exactly once, in `ATLAS_ORDER`, and
    every list of kinds the screens draw or say (the card's rows, the tile's strip, the tile's spoken line, the waiting
    line) follows it.
11. **SG11 · Words, not counts.** No heading, row, strip, spoken line or explanation says a number, a tally, a total per
    group, a rank, or a word for busyness or popularity ("busy", "popular", "trending", "lively", "alive", "buzzing",
    "vibrant").

## Hosts (every place the bars are drawn or said, from the code)

- `KindRow`, in `AtlasCard` only (the area's card, phone drawer and wide side panel): SG1, SG3, SG4, SG6.
- `KindStrip`, in `AtlasTile` only (the row's cards, a neighborhood's and a town's): SG2.
- `tileLabel` (`atlas.ts`), what a screen reader hears for a tile: SG5 (the auditor's finding 5).
- `waitingLabel` and `waitingKinds` (`atlas/waitingPins.ts`, `atlas.ts`): findable kinds only, so Sights alone already: SG10.
- `characterLine`, the tile's line above the strip: unchanged in phase 1, pending the owner (plan "Open" 2).
- Not a host: "What I'm into" (`ExploreSettings`) lists switches for the findable kinds only; every one is a Sight in
  phase 1, so it gains the two headings in phase 2, when Culture and Community move. The walk planner names one kind and
  draws no bars.

## Plan review (Nov 18, before any code)

Steward (S), auditor (A) and UX reviewer (U) read the spec and plan; no screens existed. Triage:

- S1 "Local life" pitched as liveliness: accept, "alive" gone from the plan; SG7, SG11.
- S2 "Life" dropped on the tile without saying so: accept, SG2 says it is pending the owner.
- S3, U4, A5 the tile cannot tell the groups apart, and its spoken line is flat: accept, SG5; `characterLine` put to the owner.
- S4 Culture under Sights needs its reason: accept, SG7 and the spec's opening.
- S5 Storefronts read as Local life naming places: accept, SG6.
- S6 restraint defaults bind nothing: accept, SG6.
- S7 precedents not in the research file: accept, recorded in `docs/research/adjacent-apps.md`, all unverified.
- U1 heading style copies the muted uppercase section title: accept, SG6 and the plan's style.
- U2 nothing ties "Sights" to the "?": accept, SG1's muted line; the cold find runs on the built card.
- U3, A9 every heading an `h1` on the web: accept, SG3.
- U5 the gap too small to see: accept with A1's numbers.
- U6 `characterLine` repeats Stroudsburg's "plenty": put to the owner (plan "Open" 2).
- U7 Suggest a walk on Local life rows: reject, the planner routes through where a kind is dense, not to finds; SG4 says so.
- A1 the gap overflows the selected tile by 2 px: accept, no spacer; chips 4 px apart within a group, 16 px between (216 of 222 px); SG2.
- A2 SG2's e2e cannot run (no area lights all eight): accept, a gated fixture area that does; the check is the last chip's edge.
- A3 SG5 (now SG7) fails as planned (AG4's words, the swapped last line, line 3 false for Food): accept, lines 1-3 rewritten, AG4 updated in the slice.
- A4 the golden is the wrong oracle: accept, SG9 rests on PS8 plus the order test.
- A6 headings with no rows while reading or thin: accept, SG4 and SG8; the grading check extended.
- A7 switches off still light a Sights bar with no "?": put to the owner (plan "Open" 3); 0127 makes the bars ignore the switches.
- A8 a digit check on the whole card fails on "12 min walk": accept, SG11 scoped to the section, strip and panel.
- A10 SG4's test area does not make a group all none: accept, Green Row.

## Record

Not built yet.
