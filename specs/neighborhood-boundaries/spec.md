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
11. **HB11 What its card counts is what is drawn.** A neighborhood's bars, marks and pockets (the atlas profile) are read across the ground that is drawn, as a town's are across its outline (TP1), not across an 800 m ring around its point.

### When the read fails

12. **HB12 Quiet and as before.** Where the hood polygons weren't read (offline, the tile missing, more than 12 tiles), Explore and placing behave as today (points and the ring) with no error and no change to the screen's words; a failed read is tried again, never stored as "none". Selecting a neighborhood makes no network request: the ground is read from the cache only (steward, data). The reads are Overture's divisions host only, on the same screens and cache as town outlines, and a stored tile is never read twice (TO12).

### Added by the steward's findings (Nov 12)

13. **HB13 A moment's place stays whole.** After `AREA_RULES` 5, every walk that had a place still has one: its new neighborhood, or its town where no neighborhood holds its pieces, never a blank. No place name is written onto a Capture or a Walk row (the name stays derived from the trace), and no notice that a name changed is shown (S1).
14. **HB14 One look, whatever the data.** The ground's style is identical for every neighborhood, has no input from the walker's walks, finds or captures, is gone when the selection is cleared, and at most one is drawn at a time. Its colour is a named token, not a literal (S3).
15. **HB15 A made-up edge looks like a real one.** A nearest-point share is drawn with the same line as a polygon; nothing on the screen tells the two apart (silent 2).
16. **HB16 Stars follow placing.** A Chronicle map star is named by the neighborhood a walk is placed in (HB7); a macrohood names a star only where no neighborhood polygon holds the walk's pieces (silent 3).
