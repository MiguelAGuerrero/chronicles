<!-- Complexes. Written in the repo first (2026-11-11) from the owner's report on a walk at Strawberry Square, Harrisburg
     (the map named no area or place for it) and their calls in the conversation. Not a concept-doc tab. -->

# Complexes (CX)

On a walk at Strawberry Square in Harrisburg, nothing on the map named it. It is not an attraction (so not a mark,
and shops are never marks), and it is not a street (so not a Busy area), yet it is a named place a walker would
notice because it holds so much. A **complex** is a named, bounded place made of other places: a mall, a shopping
square, a market, a campus, a station. It sits inside the area you are in (a subdivision of a neighborhood or
town), so you can see where there is a lot of life, and a moment captured inside one says so.

## Why (the evidence)

Read from Overture's 2026-10-21.0 release (`buildings`, `places`, `base`), Nov 11:

| | Strawberry Square (Harrisburg) | Lehigh Valley Mall (Whitehall) |
|---|---|---|
| A named polygon in `buildings` (geometry from OpenStreetMap, ODbL) | yes, "Strawberry Square" (a 4-point polygon in its z14 tile, tile 4692/6187) | yes, "Lehigh Valley Mall" (26 points) and "Whitehall Mall" (42), tile 4756/6164 |
| Places in its z14 tile | 617 | 664 (the mall's shops carry addresses such as "153 Lehigh Valley Mall") |
| The mall itself as a place point | not found by name | not found by name |
| `base` land use around it | `developed/retail` 17 polygons at z13, **none named** | `developed/retail` 26, `developed/commercial` 37, 4 named of 63 |
| Cost of one z14 `buildings` tile | 347 KB, 47 of 909 buildings named | 864 KB, 123 of 2300 named |

So a complex's name and outline are in the `buildings` theme, the land use carries no names, the place points name
the shops but not the mall, and only about 5% of buildings are named. A complex is therefore a **named polygon that
holds other places**, and that is the rule, with no name list.

## Vision

Idea: Add a "complex": a named, bounded place made of other places (Strawberry Square, Lehigh Valley Mall; malls,
shopping squares, markets, campuses, stations), shown inside the neighborhood or town you are in so you can sense
where there is a lot of life, and named in a moment's place line when the capture falls inside its outline.
Verb: **earn** (where there is a lot, what makes a place itself); **honour** for the place line (a moment arrives whole).
Touches:
- Always: "Guidance is structural: where there is a lot, and what makes a place itself, never whether it is good."
- Never: "Popularity, trending, foot traffic, other people's activity" (nearest: "Presence of places from open data",
  0080, 0084); "Tallies such as '12 of 87'" (no counts on Explore, NV14; counts are words, 0052); "Scores, streaks,
  completion, coverage" (nothing is a score, 0020); "Ratings, reviews, stars, 'best of', rankings of places".
- Decision 0034 (busy areas are information only); `explore-and-discovery.md`: a mark is for an attraction, food,
  shops and nightlife are never marks; decisions 0083, 0089, 0132 (areas have outlines); 0108-0110 (a dataset reaches
  the app through an adapter); 0115 (kinds filter what you see, never what exists).
Verdict: **aligned if reshaped**.
Shape: A complex is information, like a busy street: named with its kind in words and outlined on the map inside the
selected area, never counted, ranked, found or marked visited, and never a place a walk is assigned to (no Area
level, no star, no replay line). A moment inside one says so in its place line, computed from the outline when
shown.
Criteria: CX5, CX6, CX7, CX8, CX9 (never a count, never ranked, nothing visited, not a mark, no walk assigned) and
CX1, CX2, CX13 (made of other places, no outline no complex, an adapter).
Open: none after the owner's calls below.

## Decisions (the owner's)

- **The word is "complex"** (2026-11-11): a subdivision of the area you are in, "so I have a sense of where I can go
  that has a lot of activity in life". Complexes divide into kinds.
- **Explore and the place line only** (2026-11-11, at the vision gate): no star, no Area level, no replay line, no
  walk assigned to a complex.
- **Information only** (2026-11-11, at the vision gate): a complex is never a mark, never a "?", never a find.
- **Outlines come from an in-app Overture adapter** (2026-11-11): named building polygons that hold other places,
  behind a `ComplexSource` interface so a chronicles-data pack can replace it later without a screen change.
- **The first kinds are Shopping, Markets, Campuses and Stations** (2026-11-11). A kind enters only with a real
  fixture that its rule finds; one with none is deferred, never guessed (plan).

## Acceptance criteria

1. **CX1 · A complex is made of other places.** A named polygon (Overture `buildings` with a name) that holds places
   of a presence class that fits one of the kinds (CX3), at least a fixed minimum of them and of at least two
   classes, is a complex. The minimums are constants in core, tuned on the fixtures and never shown. On the real
   fixtures Strawberry Square and Lehigh Valley Mall are complexes; a named building holding one place, or only
   offices, is not.
2. **CX2 · No outline, no complex.** A point named like a mall, or a cluster of shops with no named polygon around
   it, is not a complex. Nothing draws a circle or a box for one.
3. **CX3 · The kind is a word.** A complex is one of Shopping, Markets, Campuses or Stations, said as that word; a
   polygon that fits none is not a complex (it may be missed, it is never guessed). The table from what is inside to
   a kind is one place in core, as presence's table is.
4. **CX4 · The area card lists its complexes.** A neighborhood's or a town's card shows a "Complexes" section: each
   complex by name with its kind as a word, and a Walk to as the Busy areas have (TP7, DW). An area with none shows
   no section and no "none".
5. **CX5 · No numbers.** No line, label or screen-reader text about a complex holds a digit or a count in words
   ("a dozen shops", "three malls"); what a complex holds is said by kind of place only ("shops, food and a hotel").
6. **CX6 · Never ranked.** Complexes are listed by name, A to Z. Nothing sorts or labels them by size, busyness, number
   of places or popularity, and no line says "biggest" or "busiest".
7. **CX7 · Nothing is visited.** No complex is marked visited, walked or new; no line counts how many complexes an
   area has or how many you have been to. A walk is never assigned to a complex: no `Area` or `WalkArea` row, no star
   on the home map, no line in a replay.
8. **CX8 · Not a mark.** A complex has no "?", no checklist item and no find; it is in no kind's bar and in
   `waitingMarks` never; a capture inside one finds nothing because of it.
9. **CX9 · The map outlines the selected area's complexes.** The selected neighborhood's or town's complexes are
   drawn as quiet outlines (not the Busy hue) and named at close zoom; only the selected area's are drawn, never every
   area in view; a tap on one eases the map to it. A screen reader hears one button, as for the waiting places (WT11).
10. **CX10 · Kinds filter the view, never what exists.** A "Complexes" group of four switches (Shopping, Markets,
    Campuses, Stations), saved as they change, beside "What I'm into". A kind switched off leaves the card and the map
    and nothing else; switching it on brings it back with no read.
11. **CX11 · A moment says where it was.** A moment's place line names the complex whose outline holds its fix, in
    place of the street, then the town ("Strawberry Square, Harrisburg"); outside every complex it is as MC1 says. It is
    worked out when the line is shown, from the cached complexes, and is never stored on the capture or the moment.
12. **CX12 · Derived, never truth.** Complexes are cache: one row per z14 tile and Overture release in a derived store
    (cleared by `purgeDerived`), tagged with a `COMPLEX_CODE` that a rule change bumps; they are recomputed from the
    source, never patched, and a deleted walk or moment leaves them untouched.
13. **CX13 · An adapter, no list.** The data reaches the app through `ComplexSource`; no name, place or coordinate is
    hard-coded; unit tests run on in-memory sources and only the adapter's own test reads real tile fixtures.
14. **CX14 · A bounded, silent read.** One read per selected area reads only the z14 tiles whose places suggest a
    complex (a cluster of a kind's places, a market, a campus or a station), at most a fixed number of tiles, nearest the
    area's point first, never a tile twice per release. A failed read shows nothing and is tried again later (no
    pill, no error); a read that covers only part of a wide town says nothing about it.
