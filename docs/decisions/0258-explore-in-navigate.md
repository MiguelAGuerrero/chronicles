# 0258. Explore moves into Navigate: a sheet over the walk's own map; the Explore tab goes

Date: 2026-11-22 · Status: accepted, waits on G15's build · Area: tabs, explore, walk screen · Amends: 0112 (the tabs), 0124 (the swipe on the map, the row above the tabs), 0076 (the way back when there is no tab beneath) · From: the owner's `/investigate`, Nov 22

## Context
The owner, Nov 22: "The navigate and explore pages should be merged into one, with the explore being a full-width
dialog that can be triggered from the navigate view." Asked what they meant: "if you want to explore the area that
you're in, you have to minimize the walk and then open up the Explore tab. Whereas it seems more intuitive and
immersive if the Explore functionality is accessible while you are in the Navigate. Whether that be to suggest a
tour, or suggest a walk, or just scope out points of interest in your area."

Explore (0066, 0124) is a full-screen map with a row of area cards; Navigate (0076) is the walk screen, a full-screen
map of the same ground, opened over the tabs. Reaching one from the other means leaving the walk screen. The brief is
`docs/research/explore-in-navigate.md`; the gate found the shape aligned if reshaped (the captures stay one tap away;
the sheet never rises by itself; a suggested walk is one way, never a list of sights).

## Decision
The owner's answers, Nov 22:

- **A sheet over the walk's own map**, not a full-screen dialog with a map of its own (Apple Maps' card over one map;
  the owner took the recommendation after the two precedents, one map and two tabs, were set side by side).
- **The Explore tab is removed**: the tabs read Chronicle · Navigate. "Remove it (Recommended)".
- **The sheet holds all of Explore, ready and walking alike**: the row of area cards, an area's card, town pages,
  search, Plan an outing and the walk planner. "All of it (Recommended)". A suggested walk mid-walk routes the open
  walk, as Walk to already does (NV10).
- **With the sheet up, the map pans freely and the row steps by its own swipe.** "Map pans; row steps itself
  (Recommended)". This amends 0124's "a swipe on the map steps the row" and "one-finger panning stays off on
  Explore's map" for the sheet; there is no other Explore map.
- **The look, as drawn and approved** ("Approve as drawn (Recommended)", the canvas
  `docs/mockups/explore-in-navigate/`): an ink "Explore" pill at the walk screen's top right, mirroring the
  chevron; two heights, the row and full for a card; the strip stays below the sheet; the camera, mic and note ride
  above the sheet's edge, and float at the right edge over a card at full height.

Taken as the investigation's engineering defaults (the builder may revisit them): the work is staged in three slices,
and the tab goes last, once the sheet holds everything, so no slice leaves a feature unreachable; the area's card
inside the sheet does not fold the tabs (`hideTabs`), since the walk screen has none.

## Consequences
- Amends 0112's "The tabs read Chronicle · Explore · Navigate" and "Explore stays as it is"; 0124's row "docked above
  the tabs" and its swipe on the map; 0076's way back, whose fallback was Explore when no tab is beneath (it becomes
  Chronicle). `/explore` keeps working as a path, opening the walk screen with the sheet raised (slice 3).
- Kept: 0076's one walk screen with one map (the sheet is part of it, NV4's one live map holds); Explore's own rules
  (0066, 0084, 0124's selection and naming, 0172's ink at rest, 0121's far question, 0195's Open in Maps).
- About 33 e2e journeys open Explore by its tab or its URL; they move in slice 3, with `launch`'s check of three tabs.
- Native unverified: the sheet's pull over MapLibre RN, the riding capture stack, the tab bar with two tabs.
- The first slice is inbox entry G15; the rest is named in its "After it".
