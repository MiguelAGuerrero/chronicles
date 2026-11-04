# 0089. A town is graded across its whole outline, and its pockets are listed

Date: 2026-11-04 · Status: accepted · Area: explore, atlas

## Context
Whitehall's card said "none" for every kind. A township's label point is an administrative spot, and the bars counted only the places within 800 m of it (44 in Overture, 7 of them shopping). MacArthur Road and the Lehigh Valley Mall are 1 to 4 km away; the densest 800 m inside the outline holds 488 places. A second cause: the Shops table had no class for a mall or department store.

## Decision
The owner's calls, Nov 4 ("my intuition is the entire outline, unless there's a way to resolve multiple pockets of density within a city", then "proceed with your defaults"):
- A town with an outline is graded across the whole outline (Overture's z10 whole-town outline, never the clipped z12 pieces), at most 60 z14 tiles, nearest its point first; a wider town says it covers part of it (TP1-TP3).
- Its pockets of activity are found by peak picking on a smoothed 400 m grid (peaks 1.5 km apart, up to five, above a floor) and listed as "Busy areas", each with Walk to; the picture is drawn around the busiest (TP4-TP7). Connected dense cells would merge a city into one blob (Allentown: 137 cells).
- A mall and a department store count toward Shops, one place each. Supermarkets and errand shops stay out (the v1 spec's choice) (TP11).
- Neighborhoods keep the 800 m ring; their share of the town is the next piece of "Whole areas" (`specs/atlas-grading`).

## Consequences
- `ATLAS_CODE` a5: town rows are read again, neighborhood rows stay current (TP10). A town whose outline can't be read is graded by the ring for now and retried (TP12).
- The spec is `specs/town-presence/spec.md` (TP1-TP12); the plan is `specs/town-presence/plan.md`.
- A whole township passes the top step of Shops and Food almost anywhere with a corridor, so the pockets carry the difference; retuning `STEPS` waits for a feel of it on real towns.
