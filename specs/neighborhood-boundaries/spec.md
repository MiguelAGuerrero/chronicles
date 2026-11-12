<!-- Repo first: written from the owner's calls in a session (Nov 12), not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Neighborhood boundaries

Nov 12, 2026 · @Miguel Guerrero

A neighborhood today is a named point with a reach. Explore draws it as a fixed 800 m ring, and a walk's 50 m pieces go to the nearest neighborhood point within 1 km. In a dense city two points a few hundred metres apart (Baltimore's Mount Vernon and Chinatown) claim nearly the same ground, so the rings coincide and no part of the map is plainly one neighborhood's. This slice gives a neighborhood its real shape where the map data has one, and a share of the ground that overlaps no other where it doesn't.

## Decisions (the owner's calls, Nov 12)

- **Real polygons, from Overture, filtered** (the owner's call, Nov 12). Neighborhood shapes come from the divisions tiles the app already reads for town outlines, never from a new host or a bundled per-city pack. The slice measured them first (below).
- **The same shape draws and places** (Nov 12). One rule decides which neighborhood a point belongs to, and Explore's ring, the Chronicle map's stars, the walk's title and a walk's areas all follow it. Placement is cache: `AREA_RULES` is bumped and every walk is placed again.
- **Where a city has no usable polygon, a nearest-point share** (Nov 12). The ground no polygon holds goes to the nearest neighborhood point, so two neighborhoods never claim the same ground.

- **The open calls, on the defaults** (the owner, Nov 12, "proceed with your defaults"): a polygon named for an association is not a neighborhood (HB1); a point-only neighborhood inside another's polygon is dropped, the polygon's owner standing (HB6); polygon cutting is our own routine, never a new package (plan). An audit follows the build (decision 0074).

## What the measurement found (Overture release 2026-10-21.0, divisions tiles at z12)

- Baltimore: about 50 `neighborhood` areas on land (Mount Vernon, Federal Hill, Canton, Little Italy, Seton Hill, Downtown West, Inner Harbor...), real shapes, not community-board districts, that almost never overlap (the fixture's one overlap is a sliver of Inner Harbor and Otterbein); 4 `macrohood` areas (Downtown, South Baltimore, Highlandtown, Belair-Edison) that, in the fixture, sit beside the neighborhoods rather than over them; no city outline (Baltimore is a county and a label point), so its town is decided by point; about 10 `microhood` areas that are plazas and squares (McKeldin Plaza, Broadway Square). No Chinatown.
- Coverage varies by town: Allentown PA 31 neighborhoods, Providence RI 10, Hoboken NJ 3, Phillipsburg NJ 2. A town with few polygons is the common case, so the fallback is half of the slice.
- Some "neighborhoods" are a homeowners association ("McHenry Pointe Homeowners Association", "Silo Point Community Association").

## Vision

Idea: Replace Explore's fixed 800 m neighborhood ring and the 1 km nearest-point placement with real neighborhood polygons from Overture (a nearest-point share where there is none), so neighborhoods stop overlapping on the map and in the places a walk is placed (the owner, Nov 12).
Verb: earn (it raises what you notice: which part of town a neighborhood actually is); return (a walk's places in Chronicle become truer)
Touches: Never, "Scores, streaks, completion, coverage" and "Badges for neighbourhoods explored" (the shape must carry no walked or unwalked tint, share or count); Never, "Tallies such as '12 of 87'" (no counts on Explore, NV14); Never, "Data leaving the device without a tap" (the same Overture tile reads as town outlines, the accepted class of 0080, 0083, 0093, 0103); Always, "Moments and the trace are truth; areas are recomputed" (areas are cache, re-placed from the trace); decisions 0083 (town outlines decide first, no dataset hard-coded, adapters), 0088 (borders drawn from the tiles), 0132 (hamlets are neighborhoods).
Verdict: aligned if reshaped
Shape: A neighborhood's boundary is a line around its own ground, drawn for the one you selected, never a fill by progress, and never for all neighborhoods at once. It names no count, share or score. Where a town has no polygon the line is the edge of the neighborhood's nearest-point share.
Criteria: HB1-HB16.
Open: none; HB1's association names and HB6 were settled by the owner on Nov 12.

## Criteria

### What is read

1. **HB1 Neighborhood polygons are read.** From the divisions tiles read for town outlines, a `division_area` of subtype `neighborhood` or `macrohood` on land with a name is a neighborhood polygon; a `microhood`, a maritime area and an unnamed one are not. Counties and localities are not neighborhoods, as before. Tiles stored before this decoder are read again. A polygon whose name ends in "Association" ("... Homeowners Association", "... Community Association") is not a neighborhood (the owner's call, Nov 12): the walker's own words stand.
2. **HB2 Never two owners.** A point inside one or more neighborhood polygons belongs to the smallest by area, ties to the nearer representative point. Two neighborhoods never claim one point: where one shape lies inside another (a macrohood over a neighborhood), or two shapes overlap in a sliver (Baltimore's Inner Harbor and Otterbein do), the smaller owns the point; a point only in the macrohood (most of Baltimore's "Downtown") is the macrohood's. A macrohood's ground, as drawn and as counted (HB9, HB11), excludes every neighborhood polygon inside it: "Downtown"'s card never counts what belongs to "Downtown West" (steward S2).
3. **HB3 Inside the town, as before.** A polygon counts only for a point whose town is decided and holds the polygon's representative point (TO6). A point in no town takes no neighborhood by polygon.

### The ground no polygon holds

4. **HB4 The nearest point takes the rest.** Where the polygons were read at a point and none holds it, the nearest neighborhood point within 1 km, inside the town, takes it, as today. A neighborhood that has a polygon never takes a point outside its polygon by its point.
5. **HB5 One neighborhood, one candidate.** A polygon and a map-tile place point of the same name, the point inside the polygon, are one neighborhood at the point (as TO4 joins a town's outline to its label); its area key is unchanged (`level`, name, parent), so a walk already placed in "Mount Vernon" is still in "Mount Vernon". A polygon with no tile point is a neighborhood of its own at its representative point.
6. **HB6 A point-only neighborhood inside a polygon is dropped.** A tile place point with no polygon of its own whose point lies inside another neighborhood's polygon (Chinatown inside Mount Vernon's or Downtown's) is not a neighborhood where the polygons were read: the polygon's owner stands, and no share is cut for it (the owner's call, Nov 12; steward S6).

### Placing

7. **HB7 Walks are placed again.** `AREA_RULES` is bumped, so every placed walk is placed again from its trace under the new rule; a walk whose hood tiles failed to read is placed by points and tried again (as `placesRead`), never left wrong for good.
8. **HB8 Explore and the walk agree.** The area Explore names for a point (`areaFor`), the neighborhood a walk's piece is placed in, and the walk screen's title follow the same function, so a walk placed in a neighborhood is the one its place on Explore says.

### What is drawn

9. **HB9 Its own ground, as a line.** Selecting a neighborhood on Explore draws its boundary instead of the 800 m ring: its polygon with the smaller polygons inside it cut out, or, with no polygon, the edge of its nearest-point share (bounded by its 1 km reach, its neighbors' nearest-point edges, the town border and the polygons others hold). One neighborhood at a time; it is a line with at most a faint wash, the same for every neighborhood.
10. **HB10 Nothing says how much.** The boundary carries no walked, unwalked, found or unfound tint, no percentage, no count, no label of a number (NV14). The line has no accessible label of its own; the selected neighborhood is announced by its name and "selected", with no digit, and a polygon's area is never rendered (steward S4).
11. **HB11 What its card counts is what is drawn.** A neighborhood's bars, marks and pockets (the atlas profile) are read across the ground that is drawn, its shape or its nearest-point share, as a town's are across its outline (TP1), not across an 800 m ring around its point. Where no ground is known (the tiles unread, or a failed read, tried again) the ring stands for both the line and the count, and a card that counted across a ground never has a ring drawn over it (audit 4, 5).

### When the read fails

12. **HB12 Quiet and as before.** Where the hood polygons weren't read (offline, the tile missing, more than 12 tiles), Explore and placing behave as today (points and the ring) with no error and no change to the screen's words; a failed read is tried again, never stored as "none". Selecting a neighborhood draws its line from the cache only: the line itself makes no request. The card's own read, started by the same tap, may fetch Overture's divisions tiles, the same host and cache as town outlines, and nothing else (audit 10, which corrects this line's earlier "selecting makes no network request"). The reads are Overture's divisions host only, on the same screens and cache as town outlines, and a stored tile is never read twice (TO12).

### Added by the steward's findings (Nov 12)

13. **HB13 A moment's place stays whole.** After `AREA_RULES` 5, every walk that had a place still has one: its new neighborhood, or its town where no neighborhood holds its pieces, never a blank. No place name is written onto a Capture or a Walk row (the name stays derived from the trace), and no notice that a name changed is shown (S1).
14. **HB14 One look, whatever the data.** The ground's style is identical for every neighborhood, has no input from the walker's walks, finds or captures, is gone when the selection is cleared, and at most one is drawn at a time. Its colour is a named token, not a literal (S3).
15. **HB15 A made-up edge looks like a real one.** A nearest-point share is drawn with the same line as a polygon; nothing on the screen tells the two apart (silent 2).
16. **HB16 Stars follow placing.** A Chronicle map star is named by the neighborhood a walk is placed in (HB7); a macrohood names a star only where no neighborhood polygon holds the walk's pieces (silent 3).

## Audit (Nov 12, decision 0074, asked by the owner)

The auditor (12 findings: 3 high, 6 medium, 3 low) and the steward (6 drift, 1 tone, 5 questions for the owner) read the built slice from the code and spec; the UX review is below. Each accepted finding has a regression test, `neighborhood-boundaries audit N` in `src/lib/__tests__/places/hoodAudit.test.ts`.

1. Explore's neighborhood list ignored the shapes (auditor F1, high): accept. A name inside a shape is no row, a shape with no tile point is one, on the near read and the town's page (by kept tiles only). `shapedHoods`.
2. Joining shapes was not idempotent or order-independent (F2 high, F8, F13): accept. `buildChecklists` and `areaFor` joined twice and duplicated the candidate; the smallest shape now claims a point first and a joined candidate stays joined; towns the same.
3. A far corner of a big shape was assigned to a neighborhood whose checklist never reads it (F3 high): accept. Past its point's reach Explore says the town's or no one's, never a different neighborhood. Said in HB8's test; placing still says the shape.
4. A card counted across a ring while the line drew a share; a failed read stayed a ring; one tile clipped a shape (F4, steward S1): accept. A share-only neighborhood counts across its share; a failed or short read sets `outlineRetry`; the read takes the neighbors' tiles too (`hoodProbe`, `hoodExtent`, `shapeUnread`).
5. The ring showed over a card that counted a shape; the ground was drawn from partial tiles and never refreshed (F5, S2): accept. `shouldDrawRing`; the cache is looked in until every probe's tile is kept, and the ground is computed again only when a tile arrived (`lookAgain`).
6. The share trace could be slow (F6, medium): reject, measured: a share over 200 candidates and a 5,000-vertex town ring took about 60-85 ms. The test stays as a budget guard (1,500 ms).
7. A smaller shape poking out of its host was cut out of it, drawing its edge across the host's (F9): accept. Only a shape wholly inside its host is a hole.
8. The decoder stamp made every stored z10 border tile read again (F11): accept. A z10 tile cut under `sub1` stands (it holds no shapes).
9. The line's colour was a literal beside `theme.ink` (F12, S4): accept as a guard: the test holds `GROUND_COLOR` to `theme.ink` and away from the accent; the code was already right.
10. HB12 said selecting makes no network request, which the card's read can break (S3): accept, reworded above; the line's own hook reads the cache only (tested in HB12).
11. The card's copy said "the same marks mean the same anywhere" for shapes that differ in size (S5): accept. The line no longer compares: "counted across the ground drawn around it where the map has one, and within about a ten-minute walk of its point where it has not".
12. Nested outlines read as several at once (S6): accept as a clarification and a guard: one feature, the nested shapes its holes (HB9 above).
13. `data-ground` carries a ring count on the map's container (S7): accept as a guard: no label, title or aria is built from the ground, and the map's label takes none. The attribute stays the e2e's hook.

Deferred (docs/DEFERRED.md): **D1** a shape clipped at a z12 tile edge is judged smaller by the pieces read, so an overlap point can be owned differently by what is kept (F7; as towns); **D2** checklists and finds already built under the old rule keep their area until the next tile build (F10), the owner's call below.

For the owner (the steward's silent questions, none a breach): whether a walk's remembered place name may change silently after the update (HB13 says yes, derived and never written); whether a point-only name such as Chinatown should stay as a place a find can say, without ground; whether the "Association" suffix filter, which loses a real name ending so, needs a way back; whether a macrohood that becomes a big neighborhood wants a size cap; and whether the line beside the card's familiarity words is acceptable.
