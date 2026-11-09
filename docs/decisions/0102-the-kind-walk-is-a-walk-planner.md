# 0102. The kind walk is a walk planner: modes, a distance ceiling, routes by street, a feel for the commitment

Date: 2026-11-06 · Status: accepted · Area: explore, navigation

## Context
0101 offered one suggested way through where a kind is dense, with Shorter and Longer buttons. The owner walked it in Bethlehem (Nov 6): the destination was unspecified, there was no inkling what to expect, the route doubled back on itself (fixed, KW16, KW17), and Shorter and Longer were not friendly. They asked for what Apple Maps does: several routes overlaid on the map, pick one, distance and not time (0095 did this for Go here).

## Decision
The owner's calls, Nov 6, after the `/vision` gate (aligned if reshaped):
- **A walk planner with two modes:** a **loop** (back to where it began) and a **one-way** trip. This reverses 0101's "one way": the preview offers a few routes.
- **The distance is a preference and a ceiling, not a target.** A walker who prefers 5 miles gets a shorter walk where the kind fills less ground; the preview says so in words. A route 100 feet long is never stretched to 5 miles.
- **The routes differ by street and direction, not by length:** different streets and different slices of the area, as Apple Maps offers different ways to the same place. One route does not imply you will see everything. Each row gives its own distance, with no time, no "shorter" or "longer", no "best" and no difference between rows (0095). Rows are in a fixed order, and routes nearly the same are one row (0095's SR7).
- **No pin for a place not yet found, on the preview or anywhere.** Knowing where the places are would take the novelty out (the owner agrees with the gate: the Nov 1 call and 0095's "places not yet found are never named on a route" stand).
- **A feel for the commitment instead:** the owner does not want a long walk with nothing on it, since that builds distrust. The preview shows how much of the kind each route passes, with no location: the route drawn on the map shaded where the kind is dense (as busy streets are), a strip along each row from start to end shaded the same way, and a line in words ("most of the way", "mostly near the end"). The part of the route that is only getting there is said so. Places already found, and features the map itself draws, may be pins. The pins are on the preview only, not on the navigator map.
- **A complete walk through every point of interest, which doubles back, is deferred.** It needs its own architecture in dense areas such as Philadelphia or New York (`docs/DEFERRED.md`).

## Consequences
- Amends 0101 (one way) and the kind walk's KW4, KW8 (Shorter and Longer) and KW5's single chain. KW16 and KW17 (one continuous route, one distance) stand and apply to each route.
- Reuses the scenic-routes preview (`RoutePreview`, 0095) rather than building a second one.
- Nothing is a score: the strip and the shading carry no number, percent or count; the words say "plenty", "some", "little".
- Proposed for `docs/VISION.md` (the owner's to make): the Shapes rows "Suggested routes" and "Several routes to one point" amended as 0095 proposed; and a Precedents row for 0095, 0101 and this record.
