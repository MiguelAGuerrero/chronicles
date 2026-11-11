# Complexes: the plan

For the owner's review before any code (`/slice` step 3). Spec: `specs/complexes/spec.md` (CX1-CX14). Nothing is built.

## What is known and what is not (measured Nov 11, Overture 2026-10-21.0)

- Strawberry Square and Lehigh Valley Mall are named polygons in `buildings` (OpenStreetMap geometry, ODbL), each in a
  z14 tile of 347 KB and 864 KB. Only about 5% of buildings are named. `base` land use has no names. The malls are not
  place points.
- **Not known yet:** whether Markets, Campuses and Stations have a named polygon of their own. A campus is probably a
  `base` `education` or `medical` land-use polygon (unnamed) around a place point that names it; a station is a place
  point with no polygon. The plan's first step is a fixture script that finds a real example of each in the data. A
  kind with no real example is deferred in `docs/DEFERRED.md`, not guessed (CX3).
- **The bytes** are the cost. A neighborhood's ring is about 4 to 9 z14 tiles; reading every `buildings` tile would be
  2 to 8 MB. The read therefore starts from the places the atlas already reads and fetches `buildings` or `base` only for
  tiles that hold a candidate (CX14), so it is usually one to three tiles, once per release.

## Files

| File | Change |
|---|---|
| `src/lib/complexes/rule.ts` (core, new) | `COMPLEX_KINDS`, the one table from what a polygon holds to a kind (reads presence classes: `classesOfOverture`); `complexesIn(polygons, places, ...)`: the named polygons that hold enough places of a kind (CX1-CX3). Minimums are constants, never shown. |
| `src/lib/complexes/types.ts` (core, new) | `Complex { key, name, kind, outline, at }`; `ComplexSource` (CX13); `COMPLEX_CODE`. |
| `src/lib/complexes/lines.ts` (core, new) | The card's words and a11y labels: kind word, what it holds by kind only, the order (name A to Z) (CX4-CX6). |
| `src/lib/complexes/place.ts` (core, new) | `complexAt(fix, complexes)`: the complex whose outline holds a point (CX11). |
| `src/lib/complexes/overtureSource.ts` (adapter, new) | The only file that knows Overture's `buildings` and `base` schema; decodes a tile into polygons and keeps the named ones; reads through the existing `TileReader` (`net/tileReader.ts`) and the existing host, so no new host and no `check:vision` allow entry. |
| `src/lib/complexes/read.ts` (shell, new) | `complexApp`: for an area, picks candidate tiles from the places already read, reads each tile once per release, stores a row per tile, returns the complexes; a failure is silent and retried after `retryMs` (CX12, CX14). |
| `src/lib/db/types.ts`, `db/stores.ts`, `db/migrations.ts`, `db/index.web.ts`, `db/sqliteStore.ts` | A derived store `complex_tile` (key `z/x/y`, the release, the decoder code, the complexes of that tile) in `DERIVED_STORES`: the next SQLite migration, IndexedDB `VERSION` 18 to 19 with an `oldVersion < 19` step. A migration, so it is your call (below). |
| `src/lib/atlas/atlas.ts`, `atlas/useAtlas.ts` (core, view) | The selected area's complexes next to `busyAreas`; `ATLAS_CODE` is not bumped (nothing it stores changes). |
| `src/lib/discovery/curation.ts` (core) | A guard test only: a complex is never a mark (CX8); no code change expected. |
| `src/lib/resurface/context.ts`, its shell (core, shell) | `placeLine` takes an optional `complex`; the shell asks `complexApp` for the cached complexes under the moment's fix, and reads that one tile once if it was never read (CX11). |
| `src/lib/discovery/settings.ts`, `components/ExploreSettings.tsx` (shell, view) | Four switches "Shopping, Markets, Campuses, Stations", meta `complex_hidden`, parsed as `explore_hidden` is, `parseHidden`-style (CX10). |
| `src/components/atlas/AtlasCard.tsx` | A "Complexes" section after "Busy areas": name, kind word, Walk to (CX4). |
| `src/components/map/*` (view, both platforms) | A `complexes` prop: one fill-less line layer and name labels at close zoom for the selected area only, drawn the way the area's border is (`lit`), a tap eases to it (CX9). |
| `scripts/fixture-complexes.mjs` (new) | Saves real tile fixtures for Strawberry Square, Lehigh Valley Mall and one example per other kind into `__tests__/complexes/` (run by hand, never in CI). |
| `scripts/features.js` | `complexes` in `explore`'s specs; `IN_PROGRESS` while building. |

## Data

- **New cache, no new truth.** `complex_tile` is derived (cleared by `purgeDerived`, tagged `COMPLEX_CODE` and the release),
  like `outline_tile`. SQLite migration: the next entry in `MIGRATIONS`; IndexedDB `VERSION` 18 to 19.
- **Never on a capture, a moment, a walk or an `Area`** (CX7, CX11, CX12).
- **A complex split by a tile edge** comes in two pieces with one Overture building id; the adapter joins them by that id.

## Tests (one per criterion, written first as todos)

| Id | Test file (`src/lib/__tests__/complexes/`) | Test name |
|---|---|---|
| CX1 | `rule.test.ts` | `CX1: the Strawberry Square and Lehigh Valley Mall fixtures are complexes; a named church and a named office tower are not` |
| CX2 | `rule.test.ts` | `CX2: a mall-like point and a cluster of shops with no named polygon are not complexes` |
| CX3 | `rule.test.ts` | `CX3: every complex has one of the four kinds; a polygon that fits none is dropped` |
| CX4 | `lines.test.ts` + journey `complexes` | `CX4: the card lists complexes by name and kind with Walk to; none shows no section` |
| CX5 | `lines.test.ts` | `CX5: no line or label about a complex holds a digit or a counting word` |
| CX6 | `lines.test.ts` | `CX6: complexes list A to Z, whatever their size or what they hold` |
| CX7 | `notVisited.test.ts` | `CX7: nothing marks a complex visited, counts complexes, or assigns a walk to one` |
| CX8 | `notMark.test.ts` | `CX8: a complex is no mark, no checklist item, no find and no kind bar` |
| CX9 | `mapLayer.test.ts` + journey | `CX9: only the selected area's complexes are drawn, named at close zoom; a tap eases to one` |
| CX10 | `kinds.test.ts` | `CX10: a kind switched off leaves the view and nothing else; on again, no read` |
| CX11 | `placeLine.test.ts` | `CX11: a fix inside a complex reads "Strawberry Square, Harrisburg"; outside, as MC1` |
| CX12 | `read.test.ts` (shell, `fakePorts()`) | `CX12: one row per tile and release, recomputed on a new code, cleared by purgeDerived` |
| CX13 | `overtureSource.test.ts` | `CX13: the adapter reads the real fixtures; the core never imports it` |
| CX14 | `read.test.ts` | `CX14: only candidate tiles are read, at most the budget, each once; a failure shows nothing and retries` |

A new journey `scripts/e2e/journeys/complexes.js` (the harness gets a small fake `buildings` tile, as `curiosities` fakes
the archive) checks CX4, CX9 and CX10 on the web build.

## Deferred, and why

- A star, an Area level and a replay line for a complex (the owner's call, 2026-11-11).
- A kind with no real fixture (see above), recorded in `docs/DEFERRED.md` when found.
- A chronicles-data pack for complexes (a later source behind `ComplexSource`).
- Complexes in the walk screen and in Navigate; only Explore and the place line this slice.

## Native, never run on a device

The map layer's outline and labels, the new switches and the SQLite migration are web-verified only. Each gets an item in
`docs/NATIVE_UNVERIFIED.md` (CX9, CX10, CX12) and, where a phone alone can check it, an `UNTESTED` line.

## Screens: one line per action (goal, how often, control, matrix row)

| Action | Goal and situation | Control | Matrix row |
|---|---|---|---|
| Read what complexes are here | See where there is a lot of life; each time an area is opened | A section of the area card, rows of name and kind word | 11 (a row that opens a related item) |
| Go to one | Walk to a complex; occasional | Walk to on the row, as Busy areas have it | 11 and DW |
| See it on the map | Know its extent; each time | Outlines for the selected area; a tap eases to one | no row (map layer; precedent: the town's tinted border, TB1-TB9) |
| Hide a kind | Filter what the card shows; rare | A switch in the settings list beside "What I'm into" | 14 (a switch in a list row, effective immediately) |

No control the matrix says to avoid.

## Steward's findings

Pending: run after this plan, triaged below.

## Open for the owner

1. **The migration.** `complex_tile` (derived, one row per tile and release) is new storage. Alternative: keep complexes in
   memory only and read the tile on each launch (about 0.3 to 0.9 MB per tile, every launch). Recommended: the cache.
2. **The place line.** "Strawberry Square, Harrisburg" replaces the street inside a complex. Alternative: keep both,
   "Strawberry Square · N 2nd St, Harrisburg". Recommended: replace; a street name inside a mall is noise, and the moment
   still has its fix.
3. **A far moment.** A moment shown for a place where complexes were never read reads that one tile when the line is shown
   (one request, a few hundred KB). Alternative: show only complexes already cached. Recommended: read the one tile.
