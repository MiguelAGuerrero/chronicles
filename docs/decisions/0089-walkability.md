# 0089. Walkability: bands as icons, Overture then Overpass, on the Explore and Navigate maps

Date: 2026-11-04 · Status: accepted · Area: streets, explore, navigation

## Context
The owner wants to mark areas that may need a car to get around safely or efficiently, from sidewalks and other signs of pedestrian friendliness. AGENTS.md says "Nothing is a score".

## Decision
- Each street segment gets a band (easy on foot, mixed, built around cars, or unknown), never a number, share or rank.
- Bands show as an icon with a tooltip in words: the pedestrian, with a caution badge, with a car badge.
- Data: Overture's transportation tiles first (same bucket and release as its places), the Overpass API when Overture can't be read. Both sit behind one `WalkSource` adapter.
- Shown on the Explore maps (area card, atlas page) and the Navigate map, as a switch (off by default), plus a silent heads-up ahead of a stretch built around cars.
- Unmapped is not absent: no sidewalk data never alone makes a street "built around cars".

## Consequences
- A derived cache `walk_tile` (in `DERIVED_STORES`) and `WALK_CODE`; no `SNAP_RULES` change.
- Overpass is a new host; Overture's checked 2026-11-04 (release 2026-10-21.0).
- Routing around car-oriented streets stays deferred (0022).

## Later calls (2026-11-04)
- The area summary shows on the open area card only (neighborhoods and towns), read when the card opens; the grid's tiles say nothing.
- The heads-up is silent (no haptic) and only on a navigated route; it has its own spec (`specs/walkability-headsup`).

