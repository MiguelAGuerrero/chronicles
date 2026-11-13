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

### The calibration (Nov 11, on the saved fixtures)

Joined by building id, Strawberry Square holds 22 places to go in two pieces (a fragment and the whole), Lehigh Valley Mall 168; Asia Mall 10; West
Shore Farmer's Market 29 places to go and 4 farmers'-market places; the Broad Street Market's Stone Building 2; the
Harrisburg Transportation Center 12 places; Holy Spirit Medical Center 9; the city government center 12; a bank building
24 places but only 3 to go; a parking garage 5 to go. The minimums are 8 places to go for Shopping, 2 market-category places
for Markets, 8 places for Campuses and for Civic, and any place for Stations.

### The second probe (Nov 11, before any test was written)

- **A complex can span tiles or leave fragments.** The Lehigh Valley Mall is cut across two z14 tiles (4756/6164 and
  4756/6165), each piece holding part of its places. Strawberry Square sits wholly in tile 4693/6187; the next tile west
  carries only a 3-point fragment of it from the tile buffer. So pieces are joined by their building id across tiles before a
  complex is judged, and it is judged only once every tile that holds any vertex of any piece is read.
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
   of a presence class that fits one of the kinds (CX3), at least a fixed minimum of them, is a complex. For Shopping only
   places to go count (presence class weight 1), never offices or services. The minimums are constants in core, tuned on the fixtures and never shown. They gate "made of
   other places"; they are never a measure of size or significance (0103). On the real fixtures Strawberry Square and
   Lehigh Valley Mall are complexes; a named building holding one place, or only offices, is not.
2. **CX2 · No outline, no complex.** A point named like a mall, a cluster of shops with no named polygon, or several
   named buildings that sit together (the Capitol's) are not a complex. The outline is the named polygon as the
   source gives it, never inflated, smoothed, joined or boxed.
3. **CX3 · The kind is a word.** A named polygon is at most one of Shopping, Markets, Campuses, Stations or Civic, said as
   that word, by one table in core (as presence's table is), first match winning in this order:
   - **Markets:** it holds at least a fixed minimum of places whose Overture category is a market (farmers', public or flea).
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
    read. With all five off there is no section, no outline and no notice, and nothing is read (complexes audit 15).
11. **CX11 · A moment keeps its street.** When a moment's fix is inside a complex's outline, its arrival line leads with
    the complex and keeps the street and the town: "Strawberry Square, N 2nd St, Harrisburg". Outside the outline but
    within `STREET_REACH_M` (40 m) it reads "Near Strawberry Square, ...", as a street found by nearness does (MC2);
    farther, the line is MC1's. Overlapping complexes give one name by one tie rule in core, the same each time.
12. **CX12 · Viewing a moment makes no request.** Working out a moment's line uses only complexes already on the phone,
    on every surface that shows it (Memories, the gallery viewer, threads) and fetches nothing; with none cached the
    line is MC1's street line. A line that gains a complex changes once and never back (MC17).
13. **CX13 · Only the arrival line.** A complex is named in a moment's arrival line (Memories, and the viewer, which shows the same
    line), and nowhere else: not in a replay beat or card, a search result, the share reel, a title suggestion, or the gallery's
    day headers, blocks and tile labels (complexes audit 13); it is never
    stored on a capture, a moment, a thread entry or a walk.
14. **CX14 · Derived, never truth.** Complexes are cache: one row per complex (its building id, name, kind, outline and
    bounding box) and Overture release in a derived store (cleared by `purgeDerived`), tagged with a `COMPLEX_CODE` that a
    rule change bumps; they are recomputed from the source, never patched, and a deleted walk or moment leaves them
    untouched. A complex cut by a tile edge is one complex, one outline and one row of the list, joined by its building id
    and judged only once every tile that holds any vertex of its pieces is read; one not fully read is missing, never a partial
    outline.
15. **CX15 · An adapter, no list.** The data reaches the app through `ComplexSource`; no name, place or coordinate is
    hard-coded; unit tests run on in-memory sources, only the adapter's own test reads real tile fixtures, and the
    layer check forbids core importing the adapter.
16. **CX16 · A bounded, silent read.** One read per selected area reads the `buildings` and `places` tiles of the z14 tiles
    within the area's reach, nearest its point first, at most a fixed number of tiles (a core constant) and never a tile twice
    per release, plus the neighbours a cut polygon needs while the budget allows. Which kind a building is cannot be told from
    its places alone, so there is no candidate pre-filter. A read that did not cover the area is `partial` (CX4). A failed read
    shows nothing and is tried again later (no pill, no error). It uses the host the app already uses: `npm run check:vision`
    passes with its host table unchanged.

## Record (2026-11-11)

Built test-first (16 of 16 by `check:test-first`): `src/lib/__tests__/complexes/` (21 tests over the real Overture fixtures
for Harrisburg and Whitehall, plus the Db contract case and the version pins), and the `complexes` journey (CX4, CX5, CX9,
CX10, CX16: 8 checks on the web build). 1894 unit tests, typecheck, lint, docs and vision checks pass. Journeys run on the
/chronicles build: complexes, atlas, capturehome, carousel, drive, edit, gallery, gaps, grading, headsup, hidden, layers, marks,
nudge, planner, qol, ready, reload, replay, resurface, snap, space, tabs, upgrade, walkability. Two needed fixes the slice caused
(`upgrade` pinned IndexedDB version 18; `resurface` read a card's line the instant the card came, and the line now waits one more
read), `nudge` failed once on a vibration-count timing check and passed on the rerun (it passes 3 of 3 on main), and the
`atlas` journey's list of allowed Overture URLs now includes `buildings.pmtiles`. Not audited (decision 0074). Native unverified.

Deferred: the Capitol Complex and other outlines Overture does not carry; Navigate, the walk screen and Walk me back naming a complex;
a title suggestion, search and the share reel naming one; tuning the minimums beyond Harrisburg and Whitehall. The map outline
and name labels are checked by unit tests and the journey's "no label at far zoom"; their drawn state at close zoom is not in a
journey (the web map's canvas exposes no layer data to the e2e) and is on the device list.

## UI review (decision 0145, 2026-11-11)

The `ux-reviewer` read the card with its longest name and the settings, at 390 x 844 on the /chronicles build. Triage:

1. U1 Walk to is bare text and the row is cramped: accept. The row has vertical padding and Walk to sits level with the first line;
   the plain text link stays, as in Busy areas (an outline would be a different control for the same job).
2. U2 "See more" says it is collapsed and then vanishes: accept in part. The false `expanded` state is gone and its label lines up
   with the names; moving a screen reader's focus to the first new row is deferred (docs/DEFERRED.md).
3. U3 nothing says what the Complexes switches govern: accept. A line under the heading: "Shown on area cards and the map".
4. U4 one icon repeated five times: accept. The icons are gone; the labels carry the meaning.
5. U5 Civic below the fold in the picture; track contrast: accept the picture (the journey scrolls to Civic and takes a second
   shot); the switches' track contrast is the app's own and is filed apart, not changed here.
6. U6 "Shopping" beside the "Shops" bar: reject. The kind word matches the switch's label, which the owner chose.
7. The map label: judged from code only (12 px, deep plum on a white pill after the audit); no picture exists because the
   web map's canvas gives the e2e no layer to look at. On the device list.

4 fixed, 1 in part, 1 rejected, 1 deferred.

## Audit (decision 0074, 2026-11-12)

The auditor, the steward and the ux-reviewer read the built slice at main `820957a` (the pictures at 390 x 844 on the /chronicles build).
29 findings: the auditor's 1-12, the steward's 13-20, the ux-reviewer's 21-29. 18 fixed, each behind a test named `complexes audit N`
in `src/lib/__tests__/complexes/audit.test.ts`; 1 fixed in part; 2 duplicates; 5 deferred; 3 rejected; 1 to the owner.

1. A place in two tiles' buffers counted twice, so four restaurants made a mall: fix. Places keep Overture's id and the shell counts one (`audit 1`). The first version of this fix dropped a place seen from a neighbour's buffer before its own tile was read; the `complexes` journey caught it and a second `audit 1` test holds it.
2. A building needing a tile the area did not read left `partial` false: fix. The read is partial then (`audit 2`).
3. `neededTiles` misses a tile crossed by an edge with no vertex: defer. Only a building longer than a z14 tile is affected (DEFERRED).
4. The 90 s retry never fired and a partial empty read was a "failure": fix. `failed` is its own flag and a timer asks again (`audit 4`).
5. Every read re-judged and re-wrote everything held: fix in part. It still judges all held tiles, which a join needs, and stores each complex once (`audit 5`).
6. One bad tile blanked a whole area: fix. A failing tile is left unread and the area is partial; a 404 on a release's buildings falling back to an older release is deferred (`audit 6`).
7. `COMPLEX_CODE` was never read: fix. A row of an older code is no complex (`audit 7`). Rows for buildings that stop qualifying are never deleted: deferred.
8. Station, campus and shopping misses on other regions: fix for stations, which now need a class that says so (`audit 8`); campuses of many buildings and transport buildings with no place inside are deferred.
9. A joined outline draws the tiles' clip edges: defer (a polygon union, a drawing detail).
10. One store read per moment: fix. A batch asks the store once for a cell (`audit 10`; the gallery no longer asks, see 13).
11. Map data set on every zoom tick: fix. Outlines and names are split; covered by typecheck, lint and the `complexes` journey, and a unit check that the outline does not depend on zoom (`audit 11`).
12. A fix's accuracy, the antimeridian and label collisions: defer.
13. A complex name reached the gallery's day headers, blocks and tile labels, against CX13: fix. The gallery's streets are street names only again, and the CX13 test scans the views too (`audit 13`).
14. Inside a complex the street's "Near" was dropped: fix (`audit 14`).
15. Reads with every kind off, and their cost: fix for the all-off case (`audit 15`); asking before a pull on mobile data is the owner's (below).
16. The thresholds favour large, dense complexes: accept as a note. They are a gate that is never shown (0103), recorded in the rule file; no code.
17. The kind words are said flatly over a loose rule: the station part is fixed with 8; the rest is the owner's accepted call (0147).
18. The pictures are a synthetic world ("Shops none" beside a shopping complex): reject, a fixture artefact.
19. A partial empty read treated as a failure: duplicate of 4.
20. CX11 and CX14 are tested only in units: defer. A seeded complex on the Memories card is the next journey step.
21. "See more" has no object and loses focus: fix in part. It is "See more complexes" to a screen reader (`audit 21`); moving focus to the first new row is deferred.
22. A label on a row View over the Walk to button: fix. The row has no label of its own (`audit 22`).
23. The map label's ground and size: fix. A white pill, two lines at most, a capped text scale (`audit 23`); dropping the kind word from the label is opinion and not done.
24. The outline's brown sat beside History's brown: fix. A deep plum, 55 or more apart from every kind and layer colour (`audit 24`).
25. "Complexes" is jargon: fix. The settings note says what they are (`audit 25`); the header stays.
26. The switches are reachable only from the walk's and Navigate's settings: to the owner. A line or link on the card is a navigation choice.
27. No icons on the switches, the note's contrast: reject, removed on purpose in the first review; the track contrast is the app's.
28. Targets under 48 on Android: fix (`audit 28`).
29. Partial and empty states by design: reject, CX16's silent read.

For the owner: whether the card should say where the kind switches are (26); whether a pull of up to nine `buildings` tiles on mobile data should wait for a tap (15); whether a store of every area browsed is acceptable derived data.

