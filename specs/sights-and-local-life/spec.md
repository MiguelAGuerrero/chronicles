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
Criteria: SG1-SG9.
Open: none for phase 1 (phase 2's two are in decision 0197).
```

## Decisions (the owner's calls)

- **Two groups by one test** (Nov 17): "could you come across it and be struck by it from outside, or only if you go in?"
- **Headings "Sights" and "Local life"** (Nov 18), over "To find / To go into", "Outside / Inside", "Finds / In town" and
  "Finds / Storefronts".
- **Culture and Community become Local life bars in phase 2** (Nov 18); phase 1 leaves Culture under Sights, because
  until then it still counts only places that can be a "?".
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
   once, in that order. Finding criterion: someone shown the card and not told how it works can say which kinds can turn
   up as a "?" on the map, from the headings alone.
2. **SG2 · The tile keeps its one row, in two groups.** An area tile's kinds stay one row, never two, on a 320 px wide
   phone with all eight present; the Sights kinds come first, then a visible gap that is not a kind, then the Local life
   kinds. With kinds of only one group present there is no gap. The tile shows no heading words.
3. **SG3 · The headings are headers.** Each heading is a header to a screen reader and is spoken before its group's rows,
   so a person hearing the card hears "Sights", its five kinds, "Local life", its three.
4. **SG4 · Every kind keeps its row.** The card shows all eight kinds, "none" at full ink, each with its word and dots,
   and a kind with something keeps its Suggest a walk, as before (0067, WP1, KW15). Both headings show even when every
   kind under one of them is "none".

### How the marks work

5. **SG5 · The explanation names the two groups.** "How the marks work" says, in words: Sights count only places worth
   finding, the ones that can turn up as a "?"; Local life counts every place of its kind and never turns up as a "?";
   the marks say how much is around, never how good or how busy. It holds no digit, and no line contradicts SG1 (a town
   counted across its outline keeps its own last line, TP8).

### What does not change

6. **SG6 · A thin area says nothing.** An area whose ring the map knows almost nothing about shows neither heading, no
   kinds and no character line, on its tile and its card (AG3).
7. **SG7 · What each bar counts is unchanged.** For every area of the presence sample, each kind's step is the same
   before and after the slice, and the map's "?" pins and dots are the same (no cache read again, no code bumped).
8. **SG8 · One order everywhere.** Sights and Local life together hold every kind exactly once, and every list of kinds
   the screens draw (the card's rows, the tile's strip, the waiting line a screen reader hears) follows that order.
9. **SG9 · Words, not counts.** No heading, row, tile or explanation shows a number, a tally, a total per group, a rank
   or a word about how busy or popular a place is.

## Hosts (every place the bars are drawn, from the code)

- `KindRow`, in `AtlasCard` only (the area's card, phone drawer and wide side panel): SG1, SG3, SG4.
- `KindStrip`, in `AtlasTile` only (the row's cards, a neighborhood's and a town's): SG2.
- `waitingLabel` (`atlas/waitingPins.ts`, what a screen reader hears for the map's pins) lists findable kinds only, so
  it holds Sights alone already: SG8.
- Not a host: "What I'm into" (`ExploreSettings`) lists switches for the findable kinds only, under their category
  headings; in phase 1 every one of them is a Sight, so it gains the two headings in phase 2, when Culture and Community
  move. The walk planner's page names one kind and draws no bars.

## Record

Not built yet.
