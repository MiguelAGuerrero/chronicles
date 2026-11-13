# 0152. Neighborhood boundaries: real shapes from Overture where the tiles have them, a nearest-point share where they do not

Date: 2026-11-12 · Status: accepted · Area: places, explore

## Context
A neighborhood was a named point with a reach: Explore drew a fixed 800 m ring around the selected one, and a walk's 50 m pieces
went to the nearest neighborhood point within 1 km. In a dense city two points a few hundred metres apart (Baltimore's Mount
Vernon and Chinatown) claimed nearly the same ground, so the rings coincided and no part of the map was plainly one
neighborhood's. The gate (`/vision`) said aligned if reshaped (no fill by progress, no count); the steward found no breach
(four drift findings and two on tone, all triaged in the plan).

## Decision
The owner's calls, Nov 12:
- **Real shapes, from Overture's divisions tiles**, the ones town outlines already ride on (`neighborhood` and `macrohood` areas
  on land with a name, read at z12 and kept in `outline_tile`); no new host, no bundled per-city pack.
- **The same shape draws and places**: the smallest shape holding a point owns it, never two; where no shape holds it the nearest
  neighborhood point within 1 km takes it, as before (`hoodAt`, `areas/hoods.ts`). `AREA_RULES` 5: every walk is placed again.
- **A homeowners' or community association is not a neighborhood** ("Silo Point Community Association"): a name ending in
  "Association" is left out; a microhood is a plaza.
- **A point-only neighborhood inside another's shape is dropped** (Chinatown inside Mount Vernon's), the shape's owner standing;
  no share is cut for it. Said plainly: a walk through such a place is titled for the shape that holds it.
- **Our own polygon routine**, no new package: nested shapes are holes, and a nearest-point share is the ground `hoodAt` gives
  it, traced from a grid fixed to the map so two shares meet edge to edge.
- **The line is one line**: the selected neighborhood's own ground, in the app's ink, no fill, no name, no figure, one at a time,
  gone when the selection is cleared, polygon and share alike. The card counts across the shape it draws (`ATLAS_CODE` a11).
- **A moment's place stays whole**: it is derived from the trace, never written onto a capture or a walk, and a changed name is
  not announced.

## Consequences
SQLite migration 26 adds `outline_tile.hoods`; IndexedDB keeps the tile whole and needs no version. Tiles stored before the
decoder (`OUTLINE_DECODE` sub2) are read again. A walk or card whose shapes could not be read is placed by points and the ring,
and tried again. Selecting a neighborhood reads the kept tiles only.
