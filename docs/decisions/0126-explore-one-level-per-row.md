# 0126. Explore's row is one level at a time: the towns near you, then a town's neighborhoods

Date: 2026-11-10 · Status: accepted · Area: explore · Amends EC3 of [0124](0124-explore-carousel.md) and the pill's label in [0077](0077-one-way-back-from-a-town.md)

## Context
On the owner's iPhone (Nov 10, Whitehall), Explore opened with "Whitehall · Your town" as the title but a
neighborhood (Biery's Port Historic District) selected in the row, and the same row ran on into towns
(Catasauqua, "See its neighborhoods"). A tap on the title opened Whitehall's page, whose back pill read
"Whitehall". The owner: what you see should match where you are. Opening Explore, you are at the town level,
Whitehall selected, and you swipe between towns; a town's neighborhoods are one level in.

## Decision
The owner's calls, Nov 10 (`/fix`, the options recommended):
- **Near you, the row is the towns**: the one you are in leading and so selected on arrival, then the others
  nearest first. No neighborhood shares the row with a town (`rowOf`, `atlas/carousel.ts`).
- **Where the map names no town around you**, the row is the neighborhoods near you, so Explore is never empty
  for want of a town. A neighborhood that belongs to no listed town (past every town's reach, or with no town
  point near) is not shown otherwise.
- **A town's page is unchanged**: its own card, then its neighborhoods. A tap on the selected town opens it.
- **The title names the level**: "Near you · Towns around you" on the towns, the town's name on its page. It is
  no longer a button; the chevron is gone.
- **The back pill reads "Towns"** and returns to the towns with the town you left still selected.

## Vision
Idea: the front row holds only towns, a town's page its neighborhoods, the title and pill name the level.
Verb: earn (you look around one level at a time: the town you are in, then what is in it).
Touches: Never "rankings of places" (the order is distance and the row says nothing of a rank, EC3); Never
"tallies" (no count added). Verdict: aligned. Shape: as asked.

## Consequences
- EC3 in `specs/explore-carousel/spec.md` changes; `carousel.test.ts` "EC3: near you the row is the towns
  alone ..." holds it. The journeys reach a neighborhood through its town's page (`areaTile` in the harness);
  the grading journey serves a town beside Quiet Hollow (`hollowWorld`).
- `otherTowns` is no longer used by the screen (your town is in the row, not the title).
- The map's layers read around you while your own town is selected (`layerCentre`), since its label point can be
  kilometres from you; any other selected area reads around its point, as before.
