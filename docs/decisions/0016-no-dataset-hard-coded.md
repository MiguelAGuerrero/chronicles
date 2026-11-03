# 0016. No dataset is hard-coded in the places assignment

Date: 2026-10 (v0.5) · Status: accepted · Area: places

## Context
v0.5 places: a walk is given its neighborhood, town, city and state. The owner's rule on how datasets reach the code.

## Decision
`src/lib/areas/assign.ts` knows only two interfaces from `areas/types.ts`: `PlaceCandidate` (a named point with a level and a reach) and `BoundarySource` (which country and state contain a point). Datasets reach it through adapters. Area keys are level + name + parent key, never a dataset's ids.

## Consequences
- `tilePlaces.ts` is the only file that knows the OpenMapTiles place classes; outlines ship in the app's own boundary-pack format (`boundaryPack.ts`), built by `scripts/build-boundaries.js` from Natural Earth (the 10m edition; 50m leaves Manhattan, Hoboken and Miami Beach outside every state).
- Tests run the assignment against in-memory sources; only adapter tests touch real data.
- Changing `AREA_RULES` or a pack's edition re-places every walk through the `snap_rules` meta.
