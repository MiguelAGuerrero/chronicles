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

### The second probe (Nov 11, before any test was written)

- **A complex straddles tiles.** Strawberry Square is a 3-point sliver at the edge of tile 4692/6187 and the rest of it is in
  4693/6187; the places inside are split the same way. A rule run on one tile finds nothing, so pieces are joined by their
  building id across tiles before a complex is judged, and a polygon cut at a tile edge is judged only once the
  neighbouring tile is read.
- **"Named and holds places" is too loose.** In downtown Harrisburg's tile 18 named buildings hold two or more places:
  a bank building (24 places, mostly services), a parking garage (10), a courthouse, a music hall, a city government
  center (9). Shopping therefore counts only places to go (presence class weight 1: shop, boutique, eatery, food_counter,
  drink), a minimum of them and of two classes, and never offices or services.
- **Other kinds have named polygons but no proof.** Overture names a medical center (`medical/hospital`), a transportation
  center (`transportation/transportation`), a city government center (`civic`) and a farmers' market building (no
  subtype); none is shown to be a complex rather than one building, and the Capitol's buildings are separate polygons.

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
Shape: A complex is information, like a busy street: its name and its kind as a word, and its outline on the map,
inside the selected area; never counted, ranked, found or marked visited, and never a place a walk is assigned to
(no Area level, no star, no replay line). A moment inside one names it in its arrival line, ahead of the street and
never in place of it, from the complexes already on the phone: showing a moment makes no request. The steward's
pass (Nov 11) shaped this: no "what it holds" line, the nearest first with a "See more", the street kept.
Criteria: CX1, CX2, CX5, CX6, CX7, CX8, CX9, CX11, CX12, CX15 (made of other places, no outline no complex, no
numbers, never ranked, nothing visited, not a mark, quiet outlines, the street kept, no request on viewing, an adapter).
Open: whether a station is a place a walker notices (the vision is silent on transport).

## Decisions (the owner's)

- **The word is "complex"** (2026-11-11): a subdivision of the area you are in, "so I have a sense of where I can go
  that has a lot of activity in life". Complexes divide into kinds.
- **Explore and the place line only** (2026-11-11, at the vision gate): no star, no Area level, no replay line, no
  walk assigned to a complex.
- **Information only** (2026-11-11, at the vision gate): a complex is never a mark, never a "?", never a find.
- **Outlines come from an in-app Overture adapter** (2026-11-11): named building polygons that hold other places,
  behind a `ComplexSource` interface so a chronicles-data pack can replace it later without a screen change.
- **The first kinds are Shopping, Markets, Campuses, Stations and Civic** (2026-11-11; Civic added the same day for the
  Pennsylvania Capitol Complex and municipal complexes). A kind enters only with a real fixture that its rule finds; one
  with none is deferred, never guessed (plan). Overture's tiles name the Capitol's buildings one by one and carry no
  "Capitol Complex" outline in the tile read, so Civic may wait on a chronicles-data pack.
- **No cap; the nearest first and a "See more"** (2026-11-11, replacing the plan's cap of 6): every complex of an area
  can be listed; the card leads with the nearest to the area's point and "See more" shows the rest, with no number.
- **All five kinds from building type** (2026-11-11, the owner's call over my recommendation of Shopping first): Markets,
  Campuses, Stations and Civic are told from the named building's type and what it holds, as CX3 says. I argued once that a
  hospital or a courthouse then becomes a "complex" with no proof that it is made of places; the owner accepted that. The
  Capitol Complex still waits (CX2: its buildings are separate polygons, never joined by us).
- **The steward's pass was accepted** (2026-11-11, plan "Steward's findings"): the street stays in a moment's line; viewing
  a moment never fetches; no "what it holds" sentence; the list opens on the nearest and a "See more" holds the rest.

## Acceptance criteria

1. **CX1 · A complex is made of other places.** A named polygon (Overture `buildings` with a name) that holds places
   of a presence class that fits one of the kinds (CX3), at least a fixed minimum of them and of at least two
   classes, is a complex. For Shopping only places to go count (presence class weight 1), never offices or services. The minimums are constants in core, tuned on the fixtures and never shown. They gate "made of
   other places"; they are never a measure of size or significance (0103). On the real fixtures Strawberry Square and
   Lehigh Valley Mall are complexes; a named building holding one place, or only offices, is not.
2. **CX2 · No outline, no complex.** A point named like a mall, a cluster of shops with no named polygon, or several
   named buildings that sit together (the Capitol's) are not a complex. The outline is the named polygon as the
   source gives it, never inflated, smoothed, joined or boxed.
3. **CX3 · The kind is a word.** A named polygon is at most one of Shopping, Markets, Campuses, Stations or Civic, said as
   that word, by one table in core (as presence's table is), first match winning in this order:
   - **Markets:** it holds a place whose Overture category is a market (farmers', public or flea market).
   - **Stations:** its Overture building subtype is `transportation` and its class is not parking, and it holds a place.
   - **Campuses:** its subtype is `medical` or `education` and it holds at least a fixed minimum of places.
   - **Civic:** its subtype is `civic` and it holds at least a fixed minimum of places.
   - **Shopping:** by CX1's contents, whatever its type.
   A polygon that fits none is not a complex (it may be missed, never guessed). The minimums are core constants tuned on real
   fixtures. A kind enters only once a real fixture passes its rule; one that no fixture can show is recorded in
   `docs/DEFERRED.md` with the evidence and its switch is not shown.
4. **CX4 · The area card lists its complexes.** A neighborhood's or a town's card shows a "Complexes" section: each
   complex by its name and its kind as a word, and a Walk to as the Busy areas have (TP7, DW). There is no line about
   what a complex holds. The section shows the nearest few first and a "See more" lists the rest; every complex of the
   area is reachable, and none is dropped for how many there are. An area with none shows no section and no "none". A
   read that covered only part of a town titles the section "Complexes near here".
5. **CX5 · No numbers.** No line, label or screen-reader text about a complex holds a digit or a counting word (the
   numbers one to twenty, "dozen", "several", "few", "many", "couple"); a complex's own name is exempt ("Station
   Square 2"), as a street keeps its own name.
6. **CX6 · Nearest first, never ranked.** Complexes are ordered by their distance from the area's point, nearest first,
   ties by name (locale-free, `toLowerCase`) then id; the same order holds after "See more". The first few shown is a
   fixed number (a core constant), and "See more" carries no number ("See more", never "See 9 more"). Nothing sorts or
   labels them by size, busyness, number of places or popularity, and no line says "biggest" or "busiest".
7. **CX7 · Nothing is visited.** No complex is marked visited, walked or new; no line counts how many complexes an
   area has or how many you have been to. A walk is never assigned to a complex: no `Area` or `WalkArea` row, no star
   on the home map, no line in a replay, and Walk to writes nothing about a complex to the walk.
8. **CX8 · Not a mark.** A complex has no "?", no checklist item and no find; it is in no kind's bar and in
   `waitingMarks` never. A fixture of a capture inside a complex with a mark within 60 m finds that mark as it did
   before, and finds nothing because of the complex.
9. **CX9 · The map outlines the selected area's complexes.** The selected neighborhood's or town's complexes are drawn
   as outlines with no fill, in a hue no other layer uses (not the Busy hue), no wider and no more opaque than the
   selected area's border, named only at close zoom; only the selected area's are drawn, never every area in view; a
   tap on one eases the map to it. Each outline's label is its name and its kind word; the layer adds no summary of
   its own for a screen reader, and none says "no complexes".
10. **CX10 · Kinds filter the view, never what exists.** A "Complexes" group of five switches (Shopping, Markets,
    Campuses, Stations, Civic), saved as they change, beside "What I'm into". A kind switched off leaves the card and
    the map and nothing else: the read and a moment's line ignore the switches (0115), and switching one on needs no
    read. With all five off there is no section, no outline and no notice.
11. **CX11 · A moment keeps its street.** When a moment's fix is inside a complex's outline, its arrival line leads with
    the complex and keeps the street and the town: "Strawberry Square, N 2nd St, Harrisburg". Outside the outline but
    within `STREET_REACH_M` (40 m) it reads "Near Strawberry Square, ...", as a street found by nearness does (MC2);
    farther, the line is MC1's. Overlapping complexes give one name by one tie rule in core, the same each time.
12. **CX12 · Viewing a moment makes no request.** Working out a moment's line uses only complexes already on the phone,
    on every surface that shows it (Memories, the gallery viewer, threads) and fetches nothing; with none cached the
    line is MC1's street line. A line that gains a complex changes once and never back (MC17).
13. **CX13 · Only the arrival line.** A complex is named in the arrival line of Memories and the gallery viewer, and
    nowhere else: not in a replay beat or card, a search result, the share reel or a title suggestion; it is never
    stored on a capture, a moment, a thread entry or a walk.
14. **CX14 · Derived, never truth.** Complexes are cache: one row per complex (its building id, name, kind, outline and
    bounding box) and Overture release in a derived store (cleared by `purgeDerived`), tagged with a `COMPLEX_CODE` that a
    rule change bumps; they are recomputed from the source, never patched, and a deleted walk or moment leaves them
    untouched. A complex cut by a tile edge is one complex, one outline and one row of the list, joined by its building id
    and judged only once every tile its pieces touch is read; one not fully read is missing, never a partial outline.
15. **CX15 · An adapter, no list.** The data reaches the app through `ComplexSource`; no name, place or coordinate is
    hard-coded; unit tests run on in-memory sources, only the adapter's own test reads real tile fixtures, and the
    layer check forbids core importing the adapter.
16. **CX16 · A bounded, silent read.** One read per selected area reads only the z14 tiles whose places suggest a
    complex (a cluster of a kind's places, a market, a campus, a station, a civic place), at most a fixed number of tiles
    and a fixed number of bytes (core constants), nearest the area's point first, never a tile twice per release. A failed
    read shows nothing and is tried again later (no pill, no error). It reads Overture's `buildings` and `base` tiles
    from the host the app already uses: `npm run check:vision` passes with its host table unchanged.
