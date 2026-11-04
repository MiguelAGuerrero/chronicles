# Town presence: plan

For the owner's review before any code. Spec: `specs/town-presence/spec.md` (TP1-TP11).

## Files

| File | Change |
| --- | --- |
| `src/lib/atlas/pockets.ts` (new, core) | `findPockets(points, extent)`: 400 m cells in a local projection, 3x3 smoothing, greedy peaks 1.5 km apart, floor, cap 5 (TP4). Pure, no clock. |
| `src/lib/atlas/extent.ts` (new, core) | `inExtent(p, outline)` (point in polygon, holes), `extentTiles(outline, from, budget)`: the z14 tiles the outline touches, nearest the point first, `{ tiles, partial }` (TP2, TP3). Reuses `inOutline` in `areas/outlines.ts`. |
| `src/lib/atlas/atlas.ts` (core) | `AtlasProfile` gains `extent?: 'outline' \| 'ring'`, `pockets?: Pocket[]`, `partial?: boolean`. `presenceSteps`/`thinRing` take the places already filtered by extent (TP1, TP9). `TILE_BUDGET`, `POCKET_RULES` in `ATLAS_RULES`. `characterLine`/`tileLabel`: partial wording (TP3). `MARKS_EXPLAINED` line for towns (TP8). `ATLAS_CODE` a4 → a5, and a row is current for a neighborhood under a4 (TP10, below). |
| `src/lib/atlas/read.ts` (shell) | `readRing` for a town with a whole outline: reads `outlines.borders` for the town's whole outline, tiles from `tilesOf`, `profileFrom` filters places and activity points by `inExtent`, sets `extent`, `partial`, `pockets`. Else the ring, as now. |
| `src/lib/discovery/tilePois.ts` (core) | Shops gains the shopping-centre classes (TP11) after the OSM classes are confirmed. `MARKABLE_CLASSES` unaffected (shops are never marks). |
| `src/components/atlas/AtlasCard.tsx` | "Busy areas" section for a town (TP7); heading text from `extent` (TP8); the partial line (TP3). |
| `src/components/atlas/AtlasTile.tsx` | Label wording for partial (TP3). |
| `src/lib/atlas/useAtlas.ts` | Passes the town's outline source to `readRing`; no loop change. |

## Data

Cache only. `profile` is JSON in `atlas_area` (SQLite) and an object in IndexedDB, so `extent`, `pockets` and
`partial` need no migration and no IndexedDB version. The `ATLAS_CODE` bump re-reads rows; TP10 asks that
neighborhood rows not be re-read, so `rowCurrent` keeps a neighborhood row valid under the previous code
(a `CODE_SINCE` map per level), and only a town's row goes stale. No new truth.

## Tests per criterion

| Id | Test |
| --- | --- |
| TP1 | `atlas.test.ts`, `TP1: a town counts the places inside its outline, holes excluded; a neighborhood and an outline-less town keep the ring` |
| TP2 | `townPresence.test.ts`, `TP2: the extent is the whole-town outline, not the z12 pieces` (the z10 fixture `townBorders.json` vs the clipped z12 `townOutlines.json`) |
| TP3 | `townPresence.test.ts`, `TP3: tiles are capped, nearest the busiest first, and a capped town is partial`; `atlas.test.ts`, `TP3: the label says part of the town, with no digits` |
| TP4 | `pockets.test.ts`, `TP4: peaks 1.5 km apart, busiest first, capped, floor; one mass with two peaks gives two; none above the floor gives none` |
| TP5 | `pockets.test.ts`, `TP5: Whitehall's busiest pocket is the MacArthur Rd corridor` on a new `__tests__/whitehallPlaces.json` fixture (`scripts/fixture-overture.mjs`, radius 6 km around the outline) |
| TP6 | `pockets.test.ts`, `TP6: Allentown and Bethlehem give at least two pockets, 1.5 km apart` (fixtures from the same script) |
| TP7 | e2e `grading`: the fake grid's town card shows "Busy areas" with a Walk to; a neighborhood's card does not. `atlas.test.ts`, `TP7: a pocket's name is the busiest street through it, else "A busy area"` |
| TP8 | `atlas.test.ts`, `TP8: the heading and explanation say whole outline for a graded town and keep "around its centre" for a ring`; the e2e checks the heading |
| TP9 | `atlas.test.ts`, `TP9: fewer than 3 places in the outline is thin` |
| TP10 | `atlas.test.ts`, `TP10: a town row under a4 is stale; a neighborhood row under a4 is current` |
| TP12 | `atlas.test.ts`, `TP12: a town whose outline could not be read is graded by the ring for now and read again after the retry wait` |
| TP11 | `discovery.test.ts`, `TP11: a shopping mall and a department store are Shops and never marks; supermarkets stay out` |

Fixtures are real: `scripts/fixture-overture.mjs` (places) and `scripts/fixture-outlines.mjs` (z10 outlines),
Overture's bucket is reachable from cloud sessions. My prototype of these numbers is in the session scratchpad.

## Open points for you (my recommendations first)

1. **OSM classes for TP11.** The tiles' `poi` table in `tilePois.ts` has no mall or department store class
   (supermarkets and errand shops are left out by the v1 spec's choice, and stay out), so a mall mostly counts as nothing in Shops today, apart from
   gift/clothes/jewelry-type shops. That is a second reason Whitehall's Shops read "none" (the first is the
   800 m ring). I can't read the OpenFreeMap tiles from here (the host is blocked), so I'd add the OpenMapTiles
   names (`shop` / `mall`, `department_store`) behind a test, and note in
   `docs/NATIVE_UNVERIFIED.md` that the real class names are confirmed only on your phone. Recommended: add
   them.
2. **The town card's picture.** Today it draws the 800 m ring at one scale around the point. For a graded town
   that would show the empty ring beside bars that say "lots", the same mismatch as the screenshot.
   Recommended: draw the picture around the town's busiest pocket (the ring there), headed "Around
   <street>". Alternative: the whole outline at a smaller scale, which is a bigger change to the sketch.
3. **Tile budget.** Recommended 60 z14 tiles (Whitehall's outline touches 21, so it is whole; Allentown and Bethlehem fit in their 42-tile boxes).
   Larger towns (Philadelphia, Houston) are partial and say so.
4. **Neighborhoods** keep the ring now; their "share of the town" stays the next slice, as
   `specs/atlas-grading` says.

## Deferred

- Neighborhood share of a town (the rest of "Whole areas").
- Density shading on the picture (atlas-grading's layer 3).
- A tenant-aware mall rule (a mall's stores counting once); needs mall footprints.
- Retuning `STEPS` for whole towns: a township passes 50 shops easily, so Shops and Food read "lots" almost
  anywhere with a corridor; the pockets carry the difference. After we get a feel for it.

## Native

No native-only code. The reads use the same shell and tile decoder as the ring; native has never run on a
device, so the larger read (35-60 tiles per town) and its time on a phone are unverified: they go in
`docs/NATIVE_UNVERIFIED.md`.
