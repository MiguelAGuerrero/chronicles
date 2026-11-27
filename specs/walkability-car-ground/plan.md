# Walkability: only the car ground, hatched, and its stretch on the route: the plan (CG1-CG11)

Built under `/tend inbox G5 yes` (`/slice walkability-car-ground --from=G5`): read by the steward, not held for the owner.
The look is the owner's pick of 2026-11-27 ("A (Recommended)", then "Too 'keep out'", then "Soft A2 (Recommended)"),
the read's edge theirs ("Fade over ~100 m (Recommended)"), and the icon's reach ("Everywhere (Recommended)"); decision
0271 records them. No migration, no stored field, no new route, no host, no derivation bump:
the cells, their rule (`walk/form.ts`, `walk/cells.ts`) and `WALK_CODE` are untouched; only their drawing changes, and it
is computed on read, never stored. No new dependency: `react-native-svg` (the legend's swatch) and `fflate` (the native
hatch image's PNG) are already in `package.json`.

The base it lands on (`node scripts/tend.js base walkability layers walk-screen map`, Nov 27):

- walkability is unseen: nothing above low open (never swept)
- layers is unseen: nothing above low open (never swept)
- lands on a rough base: walk-screen (a change since its sweep added a screen or a control (85af994, 264773e, 5212633, 1b4d486, 0cee290))
- lands on a rough base: map (a change since its sweep added a screen or a control (b9fc26b))

A warning only: the slice builds its own criteria and takes none of those items on.

## How it draws

- **The areas** (`walk/carGround.ts`, new, core): the judged cells in, `{ areas, edges, key }` out. The car cells are
  sampled on a fixed global lattice (25 m north to south; the same step in degrees east to west), smoothed with a
  Gaussian of 90 m that counts only ground that was read (a normalised convolution), and outlined at one half by marching
  squares, inside on one side, holes kept and put in their outer ring. A stair of 250 m cells evens out into one slope and
  every corner rounds over about 90 m (CG3). The lattice is global, so a point's shape depends only on the cells within
  270 m of it, whichever read it came from (UF1's "the same cell reads the same", for the drawing). Rings start at their
  smallest lattice crossing, so the same cells give the same rings.
- **The edge** (CG4): the outline's runs whose two lattice points were both read; where the outline meets ground nobody
  read (the edge of the 1.5 km read) it is not lined.
- **The fade** (CG4, the owner's "Fade over ~100 m"; the auditor's F1, audit 10): a signed chamfer distance from the
  edge of what was read (halfway between the last point read and the first not); the car ground is cut by it into three
  pieces that never overlap, whole beyond 100 m and two steps of 50 m toward the read's edge (two lattice steps each, so
  each step's edges lie where its distances say), drawn at 2/3 and 1/3 of the hatch's strength (`kind` 'area-1',
  'area-2'), and the edge line the same. The share is in metres too (a thousand to the unit), so it never undercuts a
  step's distance. The pattern fill draws without antialiasing, so the steps meet with no hairline. Outlines are thinned
  to 1.5 m (Douglas-Peucker); a read across the antimeridian is taken next to its first car cell (audit 12); the key is an
  FNV-1a over the sorted cells (audit 15).
- **The hatch** (`walk/hatch.ts`, new, core): one tile that repeats with no seam (lines corner to corner of a tile of
  `run` by `rise`), its pixels from the look, four by four samples a pixel for a soft line edge; the web map's
  `addImage` takes it at the screen's pixel ratio (1 to 3). The look is `WALK_STYLE.car` in `components/map/types.ts`:
  `{ run: 1, rise: 1, spacingPx: 9, lineWidthPx: 1.25, lineOpacity: 0.4, edgeWidthPx: 1, edgeOpacity: 0.65, color:
  '#3b4a6b' }` (CG2, Soft A2, the edge raised to 3:1 by the owner). MapLibre scales a fill pattern by up to two times between whole zoom levels, so the 9 px
  is exact at a whole zoom and wider between; the owner's pictures showed it so. `swatchLines(look, size)` places the
  legend's lines half a step off the diagonal: two lines, none corner to corner (S4). `hatchPng(look, ratio)` (core, `fflate`'s zlib) encodes the same pixels as a PNG for the native map.
- **The route's casing** (CG6): `aheadWatch`'s store gains `runs`, the route's runs of car ground alone
  (`areaStretches`, 300 m or more, unmerged: a fast road on plain ground is never cased; the steward's S1), set with the
  stretches and cleared on a new route, End or the layer off. `stretchLines` (core, `ahead.ts`) cuts the route's own
  points between each run's `fromM` and `toM`; `insideCarGround` (core, `carGround.ts`) cuts those lines again to the
  drawn car ground (any fade step), walking them in 5 m steps and finding each crossing by halving, so a casing begins
  and ends within a metre of the hatch's edge (the steward's S3); `casingLines` composes the two. `useCarRoute` (view,
  beside `useRouteWarning`) hands the walk's map `carRoute` while the layer is on; a route preview hands none. The map draws it
  as a slate line 14 px wide over the route's white edge (12 px) and under the route (8 px): 3 px of slate each side.

## Files

| File | Change |
|---|---|
| `src/lib/walk/carGround.ts` (new, core) | `carGroundOf(cells)`: the areas in their fade steps, the edges and a key (CG1, CG3, CG4, CG9); `insideCarGround(lines, ground)` (CG6). |
| `src/lib/walk/hatch.ts` (new, core) | `HatchLook`, `hatchTile`, `hatchImage` (RGBA), `hatchPng` (CG2, CG10), `swatchLines` (CG5). |
| `src/lib/walk/tint.ts` | Removed: `tintOf` (two tints by rows) has no caller left; its tests move to `carGroundOf` (UF9, UF12). |
| `src/lib/walk/useWalkability.ts` | Draws `carGroundOf(cells)`; `Walkability.draw` is a `CarGround`. |
| `src/lib/walk/ahead.ts` | `stretchLines(path, stretches)` (CG6, CG8). |
| `src/lib/walk/aheadWatch.ts` | `stretches(route, list, runs)`: the store's `runs`, the area runs alone, set with the stretches, cleared with them (CG6, CG11). |
| `src/lib/walk/useRouteWarning.ts` | Hands the watch the area runs beside the merged list; `useCarRoute(route, enabled, ground)` (CG6). |
| `src/components/map/types.ts` | `WALK_SLATE`, `WALK_STYLE.car` (the owner's look), `walkHatchAt` (the quarter images' names), `WALK_BELOW`, `ROUTE_CAR_WIDTH`, `ROUTE_CAR_LAYOUT`, `ROUTE_CAR_START_PAINT`; `walkabilityGeoJSON` hands areas and edges with a `kind` and nothing else (CG9); `carRouteGeoJSON`; the `carRoute` prop. |
| `src/components/map/WalkMap.web.tsx` | The hatch image, `walk-car` (fill-pattern, faded by `kind`, no antialiasing) and `walk-car-edge` (line, faded the same) in place of `walk-foot` and `walk-car`; `route-car` between `route-edge` and `route`; `data-walk` reads `car:<areas>|edges:<n>`, `data-route-car` the casing's lines, for the e2e. |
| `src/components/map/WalkMap.native.tsx` | The same layers: `<Images>` with the committed hatch PNGs, `fillPattern`, the edge line, the `route-car` line (CG10; never run on a device). |
| `assets/map/walk-hatch-<q>.png`, `@2x`, `@3x` (new, twelve) | `hatchPng(hatchLookAt(WALK_STYLE.car, q), 1..3)`, one a quarter zoom, byte for byte; a unit test fails when the look changes and they do not. |
| `scripts/walk-hatch.ts` (new) | Writes those three images from the look (`node_modules/.bin/tsx scripts/walk-hatch.ts`). |
| `src/components/HatchSwatch.tsx` (new, view) | The legend's swatch: the look's lines in SVG at the same angle, spacing, width and strength, centred (CG5). |
| `src/components/LayersControl.tsx` | The car swatch is the hatch with the edge as its border; the foot swatch goes. |
| `src/lib/layers/registry.ts` | Walkability's legend: one row, "Built around cars" (CG5); `SwatchKey` loses `foot`. |
| `src/components/WalkBandIcon.tsx` | The car icon in `WALK_SLATE`, not `theme.accent` (CG7; the foot and mixed icons unchanged). |
| `src/app/walk.tsx` | `useCarRoute` with the drawn ground, and `carRoute` to the map but on a preview (CG6). |

Fourteen source files under `src/` (one removed), the images' script and three images. Tests, journeys, the harness and the records are apart.

## Data

No new truth and no stored field. The cells are derived on read as today (UF8); the areas and edges are derived from them
on each read and kept in memory only while drawn. Nothing is written. `WALK_CODE`, `SNAP_RULES`, `STREET_CODE` and
`LANDING_CODE` are untouched: the cells' rule does not change, only their drawing.

## Tests per criterion

Unit tests in `src/lib/__tests__/walkability/` (feature `walkability`) unless named; journeys `walkability` and `headsup`.

| Id | Unit test | Journey check |
|---|---|---|
| CG1 | `walkCarGround.test.ts`: "CG1: only car cells are drawn: foot, neither and empty cells draw nothing" | walkability: "CG1: the dense grid around you draws nothing, the sparse arterials east of it are drawn as car ground" (Explore and Navigate); headsup: the owner's scene pictured at 390 and 320 (the steward judges the finding against the owner's words) |
| CG2 | `walkHatch.test.ts`: "CG2: the hatch is the owner's look: 45 degrees, 9 px apart, 1.25 px at 40%, one slate, clear between the lines, seamless"; "CG2: no red or orange: the layer, its edge and the route's casing are the one cool slate"; "CG2: the edge is 1 px at 65%, 3:1 or more against Positron's land; the lines stay 1.25 px at 40%" | the owner's scene pictured (`headsup-scene`, `headsup-scene-320`) |
| CG3 | `walkCarGround.test.ts`: "CG3: neighbouring car cells are one area"; "CG3: a stair of cells is drawn as one slope, no 250 m step"; "CG3: corners round"; "CG3: deterministic: the same cells in any order, or read with other tiles around them, draw the same"; "CG3: the cost grows with the cells, not their square" | |
| CG4 | `walkCarGround.test.ts`: "CG4: the edge is drawn where car ground meets read ground, never along the read's edge" | |
| CG5 | `src/lib/__tests__/layers/`: "CG5: Walkability's legend is one row, Built around cars, its swatch the hatch" | walkability: "CG5: the legend has one row, its swatch the hatch in slate with its edge, its icon slate" |
| CG6 | `walkCasing.test.ts`: "CG6: a stretch's line is the route between its fromM and toM, on the route's own points"; `walkAheadWatch.test.ts`: "CG6: the watch keeps the route's runs, and a new route or none clears them" | headsup: "CG6: with the layer on, the route's stretch in car ground is cased in slate"; "CG6: with the layer off, no casing" |
| CG7 | (view) | headsup: "CG7: the heads-up's icon is slate, not the accent; its words unchanged" |
| CG8 | `walkCasing.test.ts`: "CG8: the casing adds no point the route does not have between its cuts" | headsup: WH8, WH13 as today (nothing buzzed, the bar's words unchanged) |
| CG9 | `walkTint.test.ts` (UF12, moved): "CG9, UF12: the map is handed areas and edges with a kind and nothing else: no number" | |
| CG10 | `walkHatch.test.ts`: "CG10: the native map's hatch images are the web's pixels" (the committed PNGs decode to `hatchImage`); `docs/NATIVE_UNVERIFIED.md` items | `UNTESTED`: `device:` the native drawing |
| CG11 | `walkCarGround.test.ts`: "CG11: no car cell draws nothing"; `walkCasing.test.ts`: "CG11: no stretch, no casing" | walkability: WK13, ML2 as today (off draws nothing and reads nothing); headsup: "CG11: End takes the casing away" |
| audit 1 (S1) | `walkCasing.test.ts`: "walkability-car-ground audit 1: only runs of car ground are cased: a fast road on plain ground is not, an area run under a fast road still is"; `walkAheadWatch.test.ts`: "walkability-car-ground audit 1: the watch's runs are the area runs it is given, not the merged stretches" | |
| audit 2 (S2) | `walkCarGround.test.ts`: "walkability-car-ground audit 2: toward the read's edge the hatch fades over 100 m in steps, never a straight cut" | the owner's scene's pictures |
| audit 3 (S3) | `walkCasing.test.ts`: "walkability-car-ground audit 3: a casing begins and ends within 25 m of the drawn car ground's edge"; "walkability-car-ground audit 3: a crossing of car ground under 300 m is uncased" | |
| audit 4 (S4) | `walkHatch.test.ts`: "walkability-car-ground audit 4: the swatch draws two lines, none corner to corner" | walkability: the legend picture |
| UF9, UF10, UF11 | `walkTint.test.ts` moved to the new drawing (UF9 now "only car ground, one area, no seam"; UF11's Allentown check: the car ground drawn, the foot ground not) | walkability's existing checks rewritten from `foot:N|car:M` to `car:N` |

Existing checks this changes: `layers` (ML5, ML3: `data-walk` read as `foot:N|car:M`), `walkability` (UF9, UF11, WK20,
WK13, UF10, WK1b: the same and the legend's two rows), `walkAudit.test.ts` (`tintOf`'s key and empty drawing, walkability
audit 13, moved to `carGroundOf`), `layersAudit.test.ts` (walkability audit 15: two tints of one hue, now the one slate
apart from the accent and the borders).

The cells' rule and the card's words (CG1): the existing `walkForm`, `walkSummary` and `walkAudit` tests, untouched, and
a scratchpad differential over the five real fixtures (`walkFixtures.json`, Overture's own tiles): each cell's band and
each place's card words on `main` and on this branch, every difference printed (none expected), not committed.

**Size of the testing** (`docs/TESTING.md`, "Size the testing to the change"): flow. The journeys `walkability` (about 2
min), `headsup` (about 3 min) and `layers` (it reads `data-walk`'s old form, ML3 and ML5), each once at the end, plus
`launch` as the smoke. The `headsup` journey
gains the owner's scene (the `edge` mode of the harness: a residential grid meeting arterials, a navigated route into
it, the walker walking toward it until the heads-up shows), pictured at 390 and 320.

## Deferred

- A quiet label inside large car areas (the brief's D): the entry's "After it", only if the hatch alone does not say it.
- A flat tint below some zoom if the hatch turns to noise zoomed out: the hatch is a screen-space pattern, so it keeps
  its spacing at every zoom; none is planned unless a picture shows the noise (the brief's engineering unknown).

## Native, never run on a device

`<Images>` with a `require`d PNG, a `FillLayer`'s `fill-pattern`, the edge line and the `route-car` line on MapLibre RN
11; the hatch's look at the phone's pixel ratio. Each an item in `docs/NATIVE_UNVERIFIED.md`.

## Cost

- **What it reads:** nothing new. The cells as today (n: the cells in the 1.5 km read, about 100 to 600).
- **What it computes:** `carGroundOf` once per new read, O(L · k) for L lattice points in the car cells' bounds plus
  270 m (at most about 120,000 for a read that is all car) and k = 23 taps a pass, each fade step contoured only in its own
  box. Measured in Node after the auditor's round: about 8 to 70 ms on the five real fixtures (4 tiles; runs vary); 128 to 138 ms on a
  12-tile mixed read (520 to 720 cells; 146 to 192 pieces, 8,800 to 12,200 vertices, 330 to 460 KB of GeoJSON), so
  several times that on a phone, once per new read (a device item). Never per frame or per fix. The hatch images once
  per map. The casing (`insideRunsAlong`, edges indexed by latitude): 7 to 11 ms on a 4 km route over that read, once
  per new route, runs or ground (memoised by them).
- **Harness:** the five fixtures timed in the unit test (the scaling check); on a phone, device only.

## The actions a person takes

| Goal | How often, where | The control | Matrix row (`docs/research/ui-references.md`, section 2) | How adjacent apps do it |
|---|---|---|---|---|
| See which ground is built around cars | every map look with the layer on; on foot, a glance | none: the map's own drawing | 19, a status that needs no action (shown where it applies, no control) | Charts hatch the restricted area; AccessMap colours the path |
| See where the route enters it | every navigated walk with the layer on | none: the route's casing | 19, the same | Komoot points the warning to its section |
| Read what the hatch means | first use, now and then | the legend's row (a `Tooltip`, 44 px), in the Layers drawer, as today | none fits; unchanged since specs/walkability WK22 (a legend row) | every app in the section keeps a legend |

**Where the owner will look first:** at the map around the walker and the line ahead; the hatch is there, and the route's
casing starts where the hatch begins. No control is new or moved.

**Defaults that make something quieter:** the hatch's line strength (40%, Soft A2, `WALK_STYLE.car`) and the casing's width (3 px of slate each
side) are the owner's pick; the edge is not drawn along the read's edge (CG4), so a hatch cut off by the read reads as
going on rather than ending.

## Against precedent

AccessMap marks hard ground in red; this is one soft slate, never red or orange (VISION, "Guidance is structural …
never whether it is good"). Komoot shows its warnings off the map; here the route carries it, because the walker is on
foot and glancing, and the heads-up's words need a place on the map to point to. The charts hatch only a band inside
the boundary; here the whole area is hatched, sparsely, because the areas are small at walking zoom and a band would
read as a line.

## The expectation (lens 0)

`npm run expectations -- due walkability`: walkability has no line. Drafted for the steward, then for the owner at the
run's close (provisional in this run):

1. A person who goes out to notice, using the Walkability layer, would reasonably expect, on a walk they are navigating,
   to see at a glance on the map around them which ground is built around cars and where their way enters it, without
   opening a key (the steward's S5: Explore has no words for the hatch, so the line holds the navigated scene). Check: the walkability journey's CG1 check.
   Grounds: VISION "Who it is for"; adjacent-apps "Mark ground that is hard on foot" (aviation charts, AccessMap;
   unverified). Serves: Earn; upholds "Guidance is structural": the ground is described, not judged.
2. … would reasonably expect a route that enters ground built around cars to show, on its own line, where it does,
   before they reach it, without being rerouted or alarmed. Check: the headsup journey's CG6 check. Grounds: VISION
   "Who it is for"; adjacent-apps "Mark ground that is hard on foot" (Komoot; unverified). Serves: Earn.
3. … would reasonably expect an area's card to say in words how its ground is built, never as a score. Check: the
   walkability journey's "WK11, UF13, UF14" check. Grounds: VISION "Who it is for"; VISION Never, "Scores …"; not yet
   recorded (how adjacent apps describe a neighbourhood's streets). Serves: Earn.

## The steward's plan review (Nov 27)

Aligned with changes; triaged by the run's coordinator, the owner answering three questions in person (spec, Decisions):
accepted 5, the owner's 3, rejected 0.

- **S1 high, accepted** (audit 1): the casing came from the merged stretches, so a fast road on plain ground would be
  cased and an area under a fast road dropped. Now the area runs alone.
- **S2 medium, the owner's**: the hatch stopped in a straight cut at the read's edge. "Fade over ~100 m (Recommended)"
  (audit 2).
- **S3 medium, accepted** (audit 3): runs follow 250 m cells and the hatch a smoothed outline, so the casing could start
  short of the hatch. Now cut to the drawn ground; the 300 m floor said in CG6.
- **S4 low, accepted** (audit 4): the swatch read as a slashed box. Now two lines, none corner to corner.
- **S5 low, accepted**: expectation line 1 limited to the navigated scene.
- **Quiet default, accepted**: Explore pictured at its own zoom over car-heavy ground among the soft candidates.
- **Silent 1, the owner's**: "Too 'keep out'": the look picked again, "Soft A2 (Recommended)".
- **Silent 2, the owner's**: "Unread should differ": an `[owner]` entry filed by the run's record; out of this slice.

## The diff's review (Nov 27): one round

The steward (aligned with changes) and the ux-reviewer (not ready as pictured); the auditor's report is to come. The
owner answered four questions in person (spec, Decisions); the coordinator ruled the rest. The regression tests are
`walkability-car-ground audit 5-9`, written before their code:

- **audit 5** (steward S1 = ux U2, the owner's "Hold at every zoom"): the walk screen drew the hatch up to twice its
  spacing. `hatchQuarter(zoom)` picks one of four images, each `hatchLookAt(look, q)` drawn 2^(-q/4) smaller, so the
  screen keeps 9 to 11.5 px apart and 1.25 to 1.5 px thick; the web map switches `fill-pattern` as the zoom crosses a
  quarter, the native map from its view's zoom; twelve PNGs (`walk-hatch-<q>[@2x|@3x].png`). Unit test (the model)
  and a journey check measuring the screen at five zooms.
- **audit 6** (S2 = U3): the owner's scene drew no streets or names inside the car ground: the e2e style's streets are
  inline, so the scene's never joined them. The harness's style now carries them, and their names, while the scene is
  served; a journey check finds a street and a name rendered inside the car ground.
- **audit 7** (S3 = U7): the fade pictured on Explore at the read's edge, zoom 14.6 and 13.2, Soft A2; a unit test that
  the fade's pieces tile the car ground (no gap, no overlap: no dashed fragments) and a journey check that the faded
  steps are drawn.
- **audit 8** (S4 = U8, the owner's "Square swatch, no box border"): the swatch's border and rounding go; the hatch runs
  to its edges.
- **audit 9** (U5): the casing's round cap reached past the hatch's edge by half its width (about 12 m at the walk's
  zoom); the casing is now cut square (`line-cap: butt`), and the start dot sits on its first point.
- **CG6** (U1, the owner's "Mark where it starts"): a slate dot, radius 4 with a white ring, at each casing's start.
- **CG2** (U4, the owner's "Edge to 3:1, lines soft"): the edge at 65%.
- **CG5** (U6, the owner's "Add a cased route sample"): the row's sample, a short blue line on a slate casing.
- **S5**: this plan's l.88 and l.149 named A's numbers; now Soft A2's.
- **Silent 1, 2** (the steward): filed as `[owner]` entries by the run's record, beside "Unread should differ".
