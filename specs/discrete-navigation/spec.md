<!-- Repo first: written from the owner's request in a session (Nov 4), not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Discrete navigation: Explore's map steps from area to area

Nov 4, 2026 · @Miguel Guerrero

Explore's map is small and pans freely, so a drag mostly loses you between the area dots. The owner wants to try a map that moves in steps instead. A swipe goes to the next area in that direction: the next neighborhood when you're looking at neighborhoods, the next town when you're looking at a town. It is an experiment, shipped as the way the map moves, and reverted if it doesn't feel right.

## Decisions (the owner's calls, Nov 4)

- **Gestures:** a one-finger drag (or a mouse drag) steps to the next area. Pinch, the mouse wheel, a double tap, the two-finger turn and the long press stay as they are. Free panning is gone from Explore's map only.
- **Rollout:** this replaces free panning on Explore, with no setting. If it doesn't work out, it is reverted.
- **The card:** a swipe only selects an area: its ring, its name, its tile. The card opens on a tap, as now. On a phone the card covers the map, so opening it on every swipe would stop the swiping.
- **Towns:** on a town's page with no neighborhood selected, a swipe opens the page of the next town in that direction. With one of its neighborhoods selected, a swipe moves between that town's neighborhoods. On the page near you, swipes move between neighborhoods.

## Criteria

1. **DN1** A one-finger drag on Explore's map never pans it freely. When the finger lifts, the map has either moved to an area or stayed where it was.
2. **DN2** A swipe selects the nearest area in the direction the swipe would have panned the map. Dragging left goes to the area on the right of the screen, so east when the map faces north, and the direction follows the map when it is turned. The area must lie within 45° either side of that direction. The map eases to centre the area, keeping its zoom, or jumps there with reduced motion. A drag shorter than 24 px is not a swipe.
3. **DN3** With an area selected, a swipe starts from it. With none selected, a swipe starts from the middle of the map.
4. **DN4** With no area that way, nothing changes: the selection and the camera stay where they were.
5. **DN5** Straight after a swipe, the opposite swipe returns to the area it came from, even when another area is nearer that way.
6. **DN6** A swipe only selects. The map draws the area's ring and its name in the accent colour, and its tile in the grid is marked and scrolled into view. The card does not open. A tap on a tile or a point opens the card, as before.
7. **DN7** On the page near you, swipes move between that page's neighborhoods: the points on the map.
8. **DN8** On a town's page with one of its neighborhoods selected, swipes move between that town's neighborhoods. With none selected, a swipe opens the page of the nearest listed town in that direction, the same as a tap on its tile, and the opposite swipe brings back the town before.
9. **DN9** A tap on the map away from any area clears the selection, so on a town's page the next swipe moves between towns.
10. **DN10** Pinch, the mouse wheel, a double tap, the two-finger turn (with its compass), the long press (What's good here, Walk here) and Locate all work as before.
11. **DN11** On web, the arrow keys on the focused map do what a swipe that way does. `+` and `-` still zoom.
12. **DN12** A screen reader announces the area's name when a swipe or an arrow key selects it.
13. **DN13** Only Explore's map steps. The walk screen, Chronicle, the replay and a day still pan freely.

## Routes and data

- No new routes, dependencies or storage. The selection, and the trail that lets the opposite swipe return (DN5), live in the Explore screen's state.
