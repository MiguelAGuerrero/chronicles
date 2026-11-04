# Town borders: the plan

For the owner to review before any code. The criteria are `spec.md` (TB1-TB9).

## What exists

- One map component, `WalkMap` (`components/map/WalkMap.web.tsx`, `.native.tsx`), draws every map screen: Explore (`app/(tabs)/index.tsx`, its small map and a town's page), Chronicle (`chronicle.tsx`), the walk screen (`walk.tsx`), the replay (`replay/[id].tsx`) and a day (`day/[key].tsx`). It already draws a filled shape (the range `ring`), so a fill layer and a line layer are an established pattern on both platforms.
- Town outlines (decision 0083) read z12 tiles, keep them in `outline_tile` and decide the town (`townAt`). Pieces are cut at the z12 tile's edge, so they decide well but would draw as boxes.

## Design

1. **Borders to draw, pure (`areas/borders.ts`, core).**
   - `bordersFor(set, { tinted, lined })` turns outlines into a `BorderView`: one feature per town, with `role: 'tinted' | 'lined'`, simplified for drawing (`simplify`, about 10 m) and capped at 40 towns (TB9).
   - Which town is tinted comes from the decision, by the same outline `id` (TB1); a town decided by its point tints nothing.
   - `bordersGeoJSON(view)` (in `components/map/types.ts`, beside `ringGeoJSON`) is the FeatureCollection the map draws.
2. **Whole borders (TB6).**
   - The reader (`createOutlines`) gains `borders(points)`, which reads the z10 tile(s) under the points with the same source.
   - `overtureOutlines.tile` takes a zoom; `outlineTileFrom` is unchanged. Pieces of one town from two z10 tiles merge by id, as at z12.
   - Deciding stays on z12 (`known` and `read` keep their tiles); drawing uses only z10.
   - Matching: a drawn town is the z10 outline with the decided town's `id`, so Whitehall's drawn border is the same Whitehall that was decided.
3. **The map draws it (TB8).**
   - `WalkMap` gets `borders?: BorderView | null`. On web there are three layers in one source: `border-fill` (tinted only), `border-line` (tinted, firm) and `border-lined` (others, thin). They go below the first road layer, so streets, labels and every overlay sit above them.
   - Native mirrors them as `ShapeSource` + `FillLayer` / `LineLayer` with `belowLayerID`.
   - Colors come from a new `BORDER` token set in `map/types.ts`. `colors.test.ts` checks that the fill keeps the base map's streets and labels readable (contrast with the fill composited at its opacity), and that the line stays visible on the base map.
4. **Each screen (TB1-TB5).**
   - **Explore:** `useAtlas` already holds the outlines under you; it also asks `outlines.borders([from])` and exposes `borders`. The tinted town is the `townOf` answer (the town page's own town when one is open, TB2).
   - **Chronicle:** the walked towns come from `Area` rows of level town (the home already reads them). `outlines.borders(points of those towns)` reads at most 12 z10 tiles. Every walked town is drawn `tinted` in one style, from zoom 8 (`minzoom` on the layers) (TB3).
   - **Walk screen:** the borders around the walker (the z10 tile under the walk's start, read once per walk), all `lined`. The town you're in (`townAt`, the z12 set) gets the firmer line (TB4).
   - **Replay and a day:** the walk's (or the day's walks') `WalkArea` town rows, `tinted`, and the rest of the tile `lined` (TB5).
   - Each screen keeps its borders in a memo keyed by the towns' ids, so nothing rebuilds per render or zoom (TB9).
5. **Storage (TB7).** `OutlineTile` gains `z`, and keys become `z/x/y`. SQLite migration 17 adds the column and clears the table; IndexedDB v15 clears `outline_tile` (`oldVersion < 15`). It is derived, so the next read refills it. `Db` methods are unchanged; contract cases cover a z10 and a z12 tile under one x/y.

## Tests per criterion

| Id | Test |
|---|---|
| TB1 | `townBorders.test.ts` "TB1: the town you're in is tinted, the others lined; a town decided by its point tints nothing" (real Whitehall/Catasauqua z10 fixture); e2e `outlines` journey "TB1: Explore's map draws Pawtucket tinted" (the map's `data-borders` attribute) |
| TB2 | `townBorders.test.ts` "TB2: a town's page tints that town"; e2e "TB2: the town page draws its border" |
| TB3 | `townBorders.test.ts` "TB3: walked towns are one tint, whatever their metres"; e2e "TB3: Chronicle draws the walked town" |
| TB4 | `townBorders.test.ts` "TB4: the walk screen's borders are lines only, yours firmer" |
| TB5 | `townBorders.test.ts` "TB5: a walk's towns are tinted" |
| TB6 | `townBorders.test.ts` "TB6: a town from two z10 tiles is one border; Whitehall's drawn border is whole, not the z12 box" |
| TB7 | `townBordersShell.test.ts` "TB7: z10 tiles are kept and drawn offline; no tile, no borders"; `dbContract.ts` z10/z12 keys |
| TB8 | `colors.test.ts` "TB8: the border fill keeps streets and labels readable; the line shows on the base map"; e2e checks the layer order on web (border layers below the first road layer) |
| TB9 | `townBorders.test.ts` "TB9: shapes are simplified and capped at 40 towns" |

The e2e's fake divisions archive gains a z10 tile with Pawtucket and a neighbor, so the `outlines` journey covers TB1-TB3 on web.

## Deferred

- Labels on borders (the map's own town labels stay; no new ones).
- Tapping a region to open its town. The stars and tiles already do that.
- Dark map styling: the app has one map style today.

## Native, never run on a device

- `ShapeSource` with fill and line layers under `belowLayerID` on MapLibre RN.
- Migration 17. Both go into `docs/NATIVE_UNVERIFIED.md`.

## Docs

- The `map` and `places-and-areas` rules.
- `docs/decisions/0087-town-borders.md`.
- `docs/PRODUCT.md`, `docs/STATUS.md`, and the e2e table in `docs/TESTING.md`.
