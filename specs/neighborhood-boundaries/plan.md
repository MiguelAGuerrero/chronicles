# Neighborhood boundaries: plan

Spec: `specs/neighborhood-boundaries/spec.md` (HB1-HB12). Draft for the owner's review; no code is written until you say go.

## The idea in one paragraph

Overture's divisions tiles, which the app already reads for town outlines, also hold `neighborhood` and `macrohood` polygons. They ride the same z12 tile read and the same `outline_tile` cache as towns. One new core function, `hoodAt(point, town, candidates, outlines)`, answers "which neighborhood is this point in": the smallest polygon holding it (HB2), else the nearest neighborhood point inside the town within 1 km (HB4). Placing a walk (`assignAreas`) and Explore's membership (`areaFor`) both call it, so they cannot disagree (HB8). Explore draws the selected neighborhood's own ground from the same function (HB9), and its card counts across that ground (HB11).

## Files to touch

Core (decisions, tested first):
- `src/lib/areas/types.ts`: `HoodOutline` (id, name, subtype, polygons, bbox, areaM2, representative point); `PlaceCandidate.hoodOutline?`.
- `src/lib/areas/hoods.ts` (new, core): `hoodAt`, `joinHoodOutlines` (HB5, as `withOutlines` does for towns), `hoodGround(hood, candidates, town)` (the drawn shape: polygon minus smaller polygons inside it, or the nearest-point share, HB9), and the representative point (a point inside the polygon, not the centroid, so concave shapes work).
- `src/lib/areas/divisionTiles.ts`: decode `neighborhood` and `macrohood` (HB1); the file's header comment about neighborhood areas not being used is rewritten.
- `src/lib/areas/outlines.ts`: `OutlineTile.hoods`, `OutlineSet.hoods`, `OUTLINE_DECODE` bumped to `sub2` so stored tiles are read again; `hoodAllowed` follows HB3.
- `src/lib/areas/assign.ts`: `nearest('neighborhood', ...)` becomes `hoodAt`.
- `src/lib/explore/explore.ts`: `areaFor` calls `hoodAt` (HB8).
- `src/lib/areas/rules.ts`: `AREA_RULES = '5'` with its history line (HB7).
- `src/lib/atlas/read.ts`: a neighborhood's `Extent` (its ground) so the existing `within: inExtent` path counts across it (HB11).

Shell and adapter:
- `src/lib/areas/outlineRead.ts`: carries `hoods` through the cache, nothing else new; a tile still read once (HB12).
- `src/lib/areas/overtureOutlines.ts`: no change in what it fetches; the same tile.
- `src/lib/db/migrations.ts` (migration 26: `ALTER TABLE outline_tile ADD COLUMN hoods TEXT NOT NULL DEFAULT '[]'`), `src/lib/db/sqliteStore.ts`, `src/lib/db/index.web.ts` (objects hold `hoods`; no IndexedDB version bump, as the store has no new index). A contract case in `dbContract.ts` for the changed method (FC7).
- `src/lib/finish.ts`: passes the hood outlines into placing, as it passes the town outlines.

Views:
- `src/components/map/WalkMap.tsx`, `WalkMap.web.tsx`, `types.ts`: the `ring` prop becomes `ground?: { polygons: LngLat[][][] } | null`; the web twin and native draw the same GeoJSON line layer (`ringGeoJSON` is replaced by `groundGeoJSON`). The ring stays for the range preview (E21), which is not a neighborhood.
- `src/app/(tabs)/explore.tsx`: line 574 passes the selected neighborhood's ground; `useExploreGround` (new hook in `src/lib/explore/`) reads the cached tiles, never the network (HB12).

## Data

- **Cache, no new truth.** Hood polygons are derived from Overture and live in `outline_tile` (cleared with the derived stores). SQLite migration **26**; IndexedDB **no `VERSION` bump** (the object store holds whole tile objects; a tile stored without `hoods` fails `tileCurrent` through the decode stamp and is read again).
- `Area` and `WalkArea` keep their shape and key (`level`, name, parent); only the rule that fills them changes, so `AREA_RULES` goes to 5 and every walk is placed again.

## Tests: one per criterion, test first

New feature folder none; all in `src/lib/__tests__/places/` (the `places` feature) except Explore's membership.

| Id | Test file | Name |
|---|---|---|
| HB1 | `places/hoodDecode.test.ts` | `HB1: neighborhood and macrohood are read, microhood, maritime and unnamed are not` (real Baltimore fixture, `scripts/fixture-outlines.mjs`) |
| HB2 | `places/hoods.test.ts` | `HB2: of nested polygons the smallest owns a point, never two` (Downtown West in Downtown; Mount Vernon beside Seton Hill) |
| HB3 | `places/hoods.test.ts` | `HB3: a polygon counts only inside the point's town` |
| HB4 | `places/hoods.test.ts` | `HB4: unclaimed ground goes to the nearest point within 1 km, and a polygon hood never takes outside its polygon` |
| HB5 | `places/hoods.test.ts` | `HB5: polygon and tile point of one name are one candidate and keep their area key` |
| HB6 | `places/hoods.test.ts` | `HB6: a point-only hood inside a polygon` (the owner's call below) |
| HB7 | `places/areas.test.ts` + shell | `HB7: AREA_RULES 5 places every walk again; a failed hood read places by points and is retried` |
| HB8 | `explore/explore.test.ts` | `HB8: areaFor and a walk's placement agree on a point` (property over a grid of points on the fixture) |
| HB9 | `places/hoodGround.test.ts` | `HB9: a polygon's ground has its nested polygons cut out; a point-only hood's share has no overlap with its neighbors` |
| HB10 | `explore/hoodGround.test.ts` + journey | `HB10: the drawn ground and its accessible name carry no count, share or tint` |
| HB11 | `explore/atlas.test.ts` | `HB11: a neighborhood's profile counts inside its ground, not an 800 m ring` |
| HB12 | `places/hoodOutlinesShell.test.ts` (`fakePorts()`) | `HB12: unreadable tiles leave points and the ring, say nothing, and are retried` |

The journey: a check added to `scripts/e2e/journeys/outlines.js` (it already covers `src/lib/areas/**` and `atlas`): with the real-shaped Baltimore tiles mocked into the harness, selecting a neighborhood shows its boundary (`data-ground`, replacing `data-ring` for a neighborhood), two adjacent neighborhoods' boundaries do not overlap, and the card has no digit. The marks/atlas/freelook journeys are the ones `check:affected` names for `explore.tsx` and `WalkMap`.

## Decisions the owner needs to make now

1. **HB6: Chinatown (a point with no polygon) inside Mount Vernon's polygon.** The spec's two shapes:
   - (a) *The polygon's owner stands, the point-only name is dropped.* Simplest and never overlaps, but Chinatown then never appears on Explore for that part of town. **Recommended for the first cut**, because Overture holds no Chinatown polygon, and a carved-out 200 m disc invents an edge nobody drew.
   - (b) *A 200 m share carved out of the polygon.* Keeps the name, at the cost of a made-up edge.
2. **A polygon-difference routine.** HB9 (cutting nested polygons out of a polygon, and a nearest-point share out of the ground others hold) needs polygon boolean operations. Options: add the small `polygon-clipping` package (pure JS, no native code, about 20 KB; a library, so yours to approve), or write a bounded routine of our own that handles only the convex-cell and hole cases. **Recommended: our own routine**, because nested neighborhoods are holes, not intersections, and the cells are convex before they are clipped to the town; it keeps the dependency list as it is. It is the largest unknown in the slice; if it fights back I will stop and ask before adding the package.

## Deferred (and why)

- **Showing every neighborhood's boundary at once.** Explore shows the one selected, as it does its ring. A map of all outlines is a different screen (and invites "which have I walked", a coverage view the vision rules out).
- **Neighborhood polygons on the Chronicle map's stars.** Stars stay points (merged within 44 px); only the naming of the neighborhood changes through HB7.
- **Bundled per-city packs.** Not needed unless the measurement of your cities shows Overture failing; recorded in `docs/DEFERRED.md`.
- **Naming rules for Overture's association-type names** ("McHenry Pointe Homeowners Association"): shown as Overture names them; the owner can ask for a clean-up.

## Native paths that will not run on a device

The native map's boundary line layer (`WalkMap.tsx`), and the SQLite migration 26 and `outline_tile` write with `hoods` on a phone (the web and `node:sqlite` run are the proof so far). Both go into `docs/NATIVE_UNVERIFIED.md` as `**Do:** … **Expect:** …` items (HB9, HB12).

## Screen changes: one line per action

| Action | Goal and situation | Control | Matrix row |
|---|---|---|---|
| Select a neighborhood on Explore | "Which part of town is this?", at the start of a walk or in free look, often | The map's boundary line around its ground, replacing the ring; no new control | Map selection feedback (matrix section 2, "show what is selected on the map"); precedent: Apple Maps outlines a tapped neighborhood or town as a single line |
| Read the neighborhood's card | "What is here?", often | Unchanged; its numbers now count across the drawn ground (HB11) | Unchanged |

No new control, no new copy, and nothing that counts.

## Risks

- A walk is placed again for every user; `placeAll` runs it in the background (decision 0137), reading tiles by byte range, so the first launch after this reads more tiles for hood polygons than for town outlines alone. Tiles are cached, never read twice.
- Overture's macrohoods can cover most of the city (Downtown). HB2's "smallest wins" handles the overlap, but a macrohood becomes a big neighborhood where no smaller polygon holds a point; the spec accepts this.
- The release changes shapes: tiles stored under a release are kept (as towns); the rules tag excludes the release, so a new edition alone places nothing again (TO9), and the drawn shape can lag the walk's placement by one release. Accepted, as for towns.
