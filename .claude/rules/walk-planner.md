---
paths:
  - "src/lib/walkPlanner/**"
  - "src/components/planner/**"
  - "src/lib/__tests__/walk-planner/**"
---
# Walk planner

A page of its own for a kind, opened from its "Suggest a walk" button (WP1-WP27, decision 0102; the spec is `specs/walk-planner/spec.md`): up to three routes on the real map, a loop or one-way, a distance ceiling, density, and a feel for the commitment without a pin for a place not yet found.

## What it is

- **Presets** (`presets.ts`): "Through the middle", "Across the area", "Around the edge", in that fixed order. Each says which dense cells to try first; `planner.ts` adds them while the whole route, from the walker and in a loop back to the walker, stays within the ceiling and runs over itself by no more than a tenth. No tolerance: the ceiling is hard (WP10). Round `r` rotates the start cell among the dense ones, never to less dense ground (WP13).
- **A loop needs two ways.** The way back is routed with `avoid` (the streets the way out used); with none, the loop would retrace and is left out, said as `noLoop`: one way is the answer. On the e2e's one-street Green Row a loop cannot be made; the unit tests use a street grid (`__tests__/walk-planner/grid.ts`).
- **The legs cache is keyed by the points**, not their indices: each preset numbers its own.
- **Exposure** (`exposure.ts`): the route graded by the dense cells it runs through, at the cells' resolution (a run is never narrower than 400 m), from counts of every place found or not, so a find changes nothing. Words say how much and where, never a number (WP14); the strip is three flat grades with a text equivalent (WP15). The density setting asks for a share of the route in the kind; its words never imply a number and the thresholds are never shown.
- **The other kinds along a route** (`alsoPasses`, WP28): each other kind's dense cells at the cells' resolution, every place counted found or not, named by kind in words ("Also passes some history"), never by place; no pin for them.
- **What the map is given** (`mapProps.ts`): the routes, the highlighted one's graded pieces (`routeGrades`), and `foundPins` from the walker's own finds, one for those close together. It has no field for a point of interest or a "?" mark (WP16).
- **Starting** (`dest.ts`): the destination carries the stops (`via`), the planned `path` (followed as it is, KW17), `suggested` and, for a loop, `loop` (arrives only after the stops are passed or let go, WP9, WP25: `passedStops` in `nav/navigator.ts`). Start plans again from the fix at that moment (WP24) and either routes the open walk (`walkHerePlan`) or starts one ready.
- **The page** (`PlannerDrawer`): a full-screen drawer over Explore; Explore's map steps aside while it is open (one map live at a time, NV4); the first route is selected when there are routes, as the maps do (WP4, WP18, decision 0104); with a walk recording, `PlannerCapture` puts the capture stack on it (WP23).

## Traps

- The planner's words are held to the same banned-word grep as the kind walk's: no "most", "more", "shorter", "longer", "best", "densest", time or pace (`words.test.ts`).
- Native, unverified: `routeGrades` and `foundPins` line and circle layers on MapLibre RN, the drawer over a second map instance, `showWalk()` with a loop destination, the loop's arrival on a phone, three routes' walkability reads.
