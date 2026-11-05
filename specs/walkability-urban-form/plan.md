# Walkability by urban form: plan (built 2026-11-05; see the spec's Record for what changed)

Spec: `specs/walkability-urban-form/spec.md` (UF1-UF20). Replaces how the layer, the area card and (in part) the heads-up judge walkability.

## What I'm asking you to look at

0. **Two choices of mine in the layers (specs/map-layers).** Town borders default **on** (so nothing shipped quietly disappears); and turning Busy
   streets on where nothing is remembered **reads the area once**, as What's good here does, so the layer is not blank on a quiet walk.

1. **The rule (UF4, UF6)** and its starting numbers. They come from a prototype on real tiles and are meant to be tuned against fixtures, not
   trusted: the prototype marked about 70% of a 10 × 9 km window around Allentown car-oriented, which is too much.
2. **That a cell near the edge of what was read is left out**, not guessed: a cell needs its whole 450 m neighbourhood inside the tiles read, so the
   tint fades out about 450 m before the edge of the area read. That is honest about what was read, and it means a read centred on you shows a tint
   a little smaller than the map view at low zoom.
3. **The places signal reads Overture's places** (the same tiles and cache as busy streets) and not OpenStreetMap's, to avoid a second source in this
   slice. Say so if you want OpenStreetMap's too.

## Layers (specs/map-layers, ML1-ML13) come first

The owner asked on 2026-11-05 for the tint to be one **layer** among several, off by default, with busy streets and town borders moved into the
same system. That is built **before** the urban-form engine, as its own deployable step, because it also fixes the clutter today:

1. **The layers system.** `src/lib/layers/registry.ts` (core: the list of layers, their defaults and legend rows), `layers/store.ts` (a shell, one
   meta key `map_layers` holding every layer's state, with `walk_layer` read once into it), `useLayers.ts` (the hook the maps call), and
   `components/LayersControl.tsx` (the button and the panel) replacing `WalkLayerControl`. The existing walkability line layer keeps drawing for
   now, behind its switch, until the tint replaces it.
2. **Busy streets as a layer.** The walk screen's `hotView` stops depending on Explore mode; the Explore map and the Navigate ready map gain the same
   `landing` drawing from a hook that lists the remembered areas near the map (`useBusyLayer`), plus the one-time read when switched on (ML9).
3. **Town borders as a layer.** The `borders` prop is handed to a map only when the layer is on.
4. **Then the urban-form engine and tint** (below), as the Walkability layer's drawing.

Tests: `src/lib/__tests__/layers/` (a new feature folder, `layers` in `scripts/features.js`): the registry and defaults (ML1, ML2, ML7 with the old
`walk_layer` read), the store with `fakePorts()` (ML5, ML7), the busy layer's data and the one-time read (ML8-ML10); the e2e journey `layers` for
ML3-ML6, ML8, ML12 (the button, the panel, each switch redrawing the map, a reload keeping them), with `walkability`, `tabs`, `ready`, `marks` and
`outlines` rerun because borders and busy streets move.

## Files

New (`src/lib/walk/`):

| File | Layer | Does |
|---|---|---|
| `form.ts` | core | `judge(signals) -> 'foot' \| 'car' \| 'neither' \| 'empty'` and its constants (UF4-UF7), pure |
| `cells.ts` | core | cuts tiles into 250 m cells, measures each 450 m neighbourhood with a spatial index (junctions, local and arterial length, crosswalks, sidewalks), calls `judge` (UF1-UF3, UF18) |
| `tint.ts` | core | cells to drawable shapes: runs of same-band cells merged into rectangles, a key that changes only when the picture does (UF9) |
| `places.ts` | shell | the places per tile from the activity reader, for UF6 (UF17) |

Changed:

- `types.ts`, `overtureSegments.ts`: `TileFacts` and `WalkTile` gain `junctions` (Overture's `connector` points, from the tile already read).
- `overpass.ts`: junctions are the points where two or more ways share a node.
- `bands.ts`: `WALK_CODE` to `w2`. The street band stays for the heads-up's fast roads and the tooltips.
- `layer.ts`: `drawFor` is replaced by `tintFor`; `ringWords` by `cellWords` (UF13).
- `ahead.ts`, `aheadWatch.ts`, `useRouteWarning.ts`: area-entry stretches (UF15) beside road stretches.
- `useWalkability.ts`, `useAreaWords.ts`, `components/WalkLayerControl.tsx`, `components/map/{types,WalkMap.web,WalkMap.native}.tsx`: fill layers
  instead of line layers; the legend's swatches.
- `scripts/fixture-walkability.mjs` and `src/lib/__tests__/walkability/fixtures/*.json`: five real fixtures cut from Overture (below).
- The e2e harness's fake transportation tile, and the `walkability` and `headsup` journeys.

## Data

- **Cache, not truth.** The same `walk_tile` store gains a `junctions` column: SQLite migration 20 (`ALTER TABLE walk_tile ADD COLUMN junctions TEXT`,
  appended, never editing 19), IndexedDB stores the whole object so its `VERSION` does not change. `WALK_CODE` w2 makes older rows read again.
  I will re-check the migration number against `main` when I build.
- **Cells are never stored** (UF8).
- No change to `SNAP_RULES`. Nothing new leaves the device.

## Tests, one per criterion, written first

Real fixtures (`scripts/fixture-walkability.mjs`, like the town-outline fixtures): the ways and connectors within about 700 m of five points, taken
from Overture release 2026-10-21.0 and rounded, so the repo holds about 400 KB: Allentown downtown (Hamilton at 7th), the residential grid (19th and
Liberty), Lehigh Valley Mall, an Upper Macungie suburb, Zurich's old town.

| Test file (`src/lib/__tests__/walkability/`) | Criteria |
|---|---|
| `walkForm.test.ts` | UF4 (each fixture reads as stated), UF5 (adding or removing sidewalk and crosswalk data never lowers a reading), UF6, UF7 |
| `walkCells.test.ts` | UF1 (same cell, same reading, whichever other tiles are read; a cell with an unread neighbourhood is left out), UF2 (service ways add nothing), UF3 (junctions from connectors; from shared nodes), UF18 (a 12-tile fixture judged under a second) |
| `walkTint.test.ts` | UF9 (merged runs, no gaps between same-band cells, neither and empty not drawn), UF12 (no number in any line) |
| `walkCardWords.test.ts` | UF13 (the thresholds and the words), UF14 (the fixtures' cards) |
| `walkAreaAhead.test.ts` | UF15 (a run of car cells of 300 m or more along a route; once; a road stretch inside it is said as the road) |
| `walkReader.test.ts`, `walkOverture.test.ts`, `walkNetwork.test.ts` (existing, extended) | UF3 (junctions kept and read from the cache), UF8, UF17, UF19 |
| e2e `walkability`, `headsup` | UF9-UF11, UF14, UF15, UF16 (both tints drawn; the legend's two rows with swatches; the card's words; the area-entry line on a route) |

## Order

1. Fixtures script and the five fixtures. `judge` and `cells` with their tests, tuning the starting numbers until the fixtures read as UF4 states.
2. Junctions through the adapters and the cache (types, Overture connectors, Overpass shared nodes, migration 20, the contract, `WALK_CODE`).
3. Places lift (UF6).
4. Tint, the fill layers on both maps, the legend with swatches, the hooks.
5. The card's words.
6. The heads-up's area-entry stretches.
7. Journeys, docs, `/docs-gc`, the end-of-slice checks. An `/audit` only if you ask.

## Risks

- **The numbers.** Walkable and car-oriented are judgement calls at the margin. The fixtures pin five places; a sixth can disagree. I'd rather ship it
  with a way to look at it than with false precision, so the plan keeps every threshold in one table in `form.ts`.
- **A tint of squares.** Cells of 250 m are coarse; merged same-colour runs and no outline keep them from looking like pixels, but I won't know how it
  looks until it is on a screen. Native has never run.
- **One more read.** Places add Overture's places tiles for a layer read and a card, the same tiles the busy streets read.
- **Overpass junctions** are estimated from shared nodes and are the weakest source; they matter only when Overture can't be read.

## Deferred, and why

Routing, scores, slope and lighting, a long press on a tint, native credits: see the spec's "Not in this slice".

## Native (never run on a device)

The fill layers on MapLibre RN, migration 20, the connector decode in the native runtime, the legend's swatches. All go in `docs/NATIVE_UNVERIFIED.md`.
