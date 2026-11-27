# 0271. G5's hatch is Soft A2: 45 degrees, 9 px apart, light lines and a hairline edge, fading at the read's edge; one slate car icon everywhere

Date: 2026-11-27 · Status: accepted · Area: walkability, layers, map · Amends: [0232](0232-walkability-draws-only-the-car-ground.md) (it left the hatch's look open) · From: the owner, in person, Nov 27, picking from four candidates drawn on the web build (`specs/walkability-car-ground`)

## Context
Decision 0232 chose to draw only the ground built around cars as a soft hatch with a smooth edge, and left the hatch's
look (its density, angle and edge width) for the owner to pick from candidates side by side on the web build (G5's
`Open:` line; 0235's review, I4: a look call is never the builder's). Four were drawn on the owner's scene, a navigated
walk into car ground with Walkability and Storefronts on and the heads-up showing, at 390 px, each with its legend
swatch and the route's slate casing: A 45°, 9 px apart, 1.5 px lines, a 2 px edge; B 45°, 6 px apart, 1 px, 1.25 px;
C about 63°, 13 px apart, 2 px, 3 px; D about 27°, 8 px apart, 1.25 px, 1.5 px. The car icon's slate (G5's criterion 7)
was asked too: the heads-up only, or everywhere it is drawn. The steward's plan review then asked two questions of the
owner: whether A reads as "keep out", and whether unread ground should look different from plain ground; and found that
the hatch stopped with a straight cut at the edge of what was read.

## Decision
- **The hatch is Soft A2**, in three answers: "A (Recommended)" from the four; then, asked by the plan's steward whether A
  reads as "built around cars" or as "keep out" (a hatched area with a firm boundary is the charts' mark for restricted
  airspace), "Too 'keep out'"; then, from three softened A's drawn on the same scene with Explore at its own zoom (A1 1.5
  px lines at 40% with a 1.25 px edge at 70%; A2 1.25 px at 40%, a 1 px edge at 60%; A3 1.5 px at 35%, no edge), "Soft
  A2 (Recommended)": lines rising to the right at 45°, 9 px apart across them, each 1.25 px at 40%, on a clear ground; the
  edge 1 px at 60%; all in slate `#3b4a6b`; the route's casing as drawn, slate, 3 px each side of the route under its own
  colour; the legend's swatch two lines, none corner to corner.
- **The hatch fades toward the edge of what was read** ("Fade over ~100 m (Recommended)"): over about 100 m, never a
  straight cut, with no edge line along it, so the end of a read never looks like a tile that failed (0232).
- **Unread ground should differ from plain ground** ("Unread should differ"): with foot ground drawn as the plain map,
  plain also means "not read" and "neither". Not built with G5: an `[owner]` entry asks how.
- **One slate car icon everywhere** ("Everywhere (Recommended)"): the pedestrian with the car badge is slate wherever it
  is drawn, the card's words unchanged. In the code that is the heads-up and the legend: the area card draws no icon,
  and gains none (the owner was told, Nov 27).

## Consequences
- `WALK_STYLE.car` in `src/components/map/types.ts` holds the look; the web map, the native map's images and the
  legend's swatch are drawn from it, and a test pins it.
- A later change of the look is the owner's, drawn and asked the same way.
