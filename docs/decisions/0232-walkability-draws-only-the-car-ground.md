# 0232. Walkability draws only the ground built around cars, hatched with a smooth edge, and marks the route's stretch through it

Date: 2026-11-19 · Status: accepted, waits on G5's build · Area: walkability, layers, navigation · Amends: 0096 ("both ends shown"), specs/walkability-urban-form UF9-UF11 · From: the owner, in person, Nov 19 (`/investigate`, decision 0231)

## Context
On a phone, with Walkability and Storefronts on and a route navigated, the owner could not tell which tint meant what, nor where the
heads-up "Next: an area built around cars" pointed. Every cell in reach was tinted, so there was no plain map to compare against;
the car tint (slate at 30%) lands near a neutral grey over Positron, which reads as disabled or not loaded; the 250 m cells drawn
without antialiasing gave a stair-stepped block like a tile that failed; the legend is in the settings drawer; and the pill names no
place on the map. The investigation: `docs/research/walkability-car-ground.md`.

## Decision
The owner's three answers, Nov 19, each the recommended option:
- **Only the car ground is drawn.** Ground easy on foot is the plain map. Reverses "both ends shown" (0096) and retires UF11.
- **A soft hatch with a smooth edge.** The car ground is a sparse diagonal hatch in slate with a firm edge, its joined cells rounded
  into one area, so it reads without colour alone and never as a missing tile. Never red or orange (the vision review of Nov 5 holds).
- **The route marks its stretch through car ground** while the layer is on, and the heads-up's icon takes the same slate. It never
  reroutes, warns by sound or haptic, or says "avoid" (WH8, WH13).

## Consequences
- Queued as G5, "Walkability: only the car ground, hatched, and its stretch on the route"; built through `/slice --from=G5`, which
  amends specs/walkability-urban-form (UF9-UF11) and specs/walkability-headsup.
- The area card's words (UF13) and the cells' rule (UF1-UF8) are unchanged: only what the map draws changes.
