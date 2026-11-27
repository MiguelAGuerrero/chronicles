# 0271. G5's hatch is A: 45 degrees, 9 px apart, a 2 px edge, in slate; and one slate car icon everywhere

Date: 2026-11-27 · Status: accepted · Area: walkability, layers, map · Amends: [0232](0232-walkability-draws-only-the-car-ground.md) (it left the hatch's look open) · From: the owner, in person, Nov 27, picking from four candidates drawn on the web build (`specs/walkability-car-ground`)

## Context
Decision 0232 chose to draw only the ground built around cars as a soft hatch with a smooth edge, and left the hatch's
look (its density, angle and edge width) for the owner to pick from candidates side by side on the web build (G5's
`Open:` line; 0235's review, I4: a look call is never the builder's). Four were drawn on the owner's scene, a navigated
walk into car ground with Walkability and Storefronts on and the heads-up showing, at 390 px, each with its legend
swatch and the route's slate casing: A 45°, 9 px apart, 1.5 px lines, a 2 px edge; B 45°, 6 px apart, 1 px, 1.25 px;
C about 63°, 13 px apart, 2 px, 3 px; D about 27°, 8 px apart, 1.25 px, 1.5 px. The car icon's slate (G5's criterion 7)
was asked too: the heads-up only, or everywhere it is drawn.

## Decision
- **The hatch is A** ("A (Recommended)"): lines rising to the right at 45°, 9 px apart across them, each 1.5 px at 55%,
  on a clear ground; the edge 2 px at 85%; all in slate `#3b4a6b`; the route's casing as drawn, slate, 3 px each side of
  the route under its own colour.
- **One slate car icon everywhere** ("Everywhere (Recommended)"): the pedestrian with the car badge is slate wherever it
  is drawn, the card's words unchanged. In the code that is the heads-up and the legend: the area card draws no icon,
  and gains none.

## Consequences
- `WALK_STYLE.car` in `src/components/map/types.ts` holds the look; the web map, the native map's images and the
  legend's swatch are drawn from it, and a test pins it.
- A later change of the look is the owner's, drawn and asked the same way.
