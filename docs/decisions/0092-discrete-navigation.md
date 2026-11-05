# 0092. Explore's map steps from area to area

Date: 2026-11-04 · Status: accepted (an experiment, to revert if it doesn't feel right) · Area: explore, map

## Context
Explore's map is small, a quarter of a phone's screen above the grid, and it panned freely: a drag mostly lost you between the area dots. The owner wanted to try a map that moves in steps, from the area you're looking at to the next one in the direction of the swipe.

## Decision
The owner's calls, Nov 4:
- **Gestures:** a one-finger (or mouse) drag steps to the next area that way. Pinch, the wheel, a double tap, the two-finger turn and the long press stay. Only Explore's map changes.
- **Rollout:** it replaces free panning on Explore, with no setting. If it doesn't work out, it is reverted.
- **The card:** a swipe only selects (ring, name, tile scrolled into view); the card opens on a tap, as before. On a phone the card covers the map, so opening it on every swipe would stop the swiping.
- **Towns:** on a town's page with none of its neighborhoods selected, a swipe opens the next town's page that way; with one selected, swipes move between the town's neighborhoods. On the page near you, swipes move between neighborhoods.

Calls made in the plan the owner approved: the zoom stays where it is on a swipe; the opposite swipe always comes back; a tap on the map away from the long press's choices clears the selection; the arrow keys step on web; 45° either side and 24 px.

## Amended (the owner, Nov 4, after trying it on the iPhone)
From Fountain Hill's page no swipe reached Bethlehem: the nearest area within 45° was always another town. A swipe now lands where it would have panned the map (a flick coasts as a pan does) and selects the nearest area to that spot on the side swiped toward, never the selected one, so every swipe moves. The levels stay as they were. The opposite-swipe trail (DN5) is retired: a swipe back lands back by itself.

## Consequences
- The spec is `specs/discrete-navigation/spec.md` (DN1-DN13); the plan is `specs/discrete-navigation/plan.md`.
- `WalkMap` gains `onSwipe`: with it, one finger never pans (maplibre `dragPan` and `keyboard` off on web, MapLibre RN `dragPan={false}` on native).
- Nothing is stored: the selection and the step just taken live in the screen.
