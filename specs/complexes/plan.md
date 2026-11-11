# Complexes: the plan

For the owner's review before any code (`/slice` step 3). Spec: `specs/complexes/spec.md` (CX1-CX16). Nothing is built.

## What is known and what is not (measured Nov 11, Overture 2026-10-21.0)

- Strawberry Square and Lehigh Valley Mall are named polygons in `buildings` (OpenStreetMap geometry, ODbL), each in a
  z14 tile of 347 KB and 864 KB. Only about 5% of buildings are named. `base` land use has no names. The malls are not
  place points.
- **Not known yet:** whether Markets, Campuses, Stations and Civic have a named polygon of their own. A campus is probably a
  `base` `education` or `medical` land-use polygon (unnamed) around a place point that names it; a station is a place
  point with no polygon. **Civic:** in the Capitol's z14 tile Overture names the buildings one by one (Capitol Building,
  Finance Building, North Office Building, State Museum of Pennsylvania) and I found no "Capitol Complex" polygon or
  government land use there (one tile and its z13 land use read; an adjacent tile may differ). The plan's first step is a
  fixture script that finds a real example of each kind. A kind with no real example is deferred in `docs/DEFERRED.md`,
  not guessed (CX3), and the Capitol Complex waits for a chronicles-data pack if Overture never holds its outline.
- **The bytes** are the cost. A neighborhood's ring is about 4 to 9 z14 tiles; reading every `buildings` tile would be
  2 to 8 MB. The read therefore starts from the places the atlas already reads and fetches `buildings` or `base` only for
  tiles that hold a candidate (CX14), so it is usually one to three tiles, once per release.

## Files

| File | Change |
|---|---|
| `src/lib/complexes/rule.ts` (core, new) | `COMPLEX_KINDS` (five), the one table from what a polygon holds to a kind (reads presence classes: `classesOfOverture`); `complexesIn(polygons, places, ...)`: the named polygons that hold enough places of a kind (CX1-CX3). Minimums are constants, never shown. |
| `src/lib/complexes/types.ts` (core, new) | `Complex { key, name, kind, outline, at }`; `ComplexSource` (CX13); `COMPLEX_CODE`. |
| `src/lib/complexes/lines.ts` (core, new) | The card's words and a11y labels: the kind word only, the order (nearest to the area's point, ties by name then id) and the few shown before "See more" (CX4-CX6). |
| `src/lib/complexes/place.ts` (core, new) | `complexAt(fix, complexes)`: the complex whose outline holds a point or lies within `STREET_REACH_M` of it, with `near`, and one tie rule for overlaps (CX11). |
| `src/lib/complexes/overtureSource.ts` (adapter, new) | The only file that knows Overture's `buildings` and `base` schema; decodes a tile into polygons and keeps the named ones; reads through the existing `TileReader` (`net/tileReader.ts`) and the existing host, so no new host and no `check:vision` allow entry. |
| `src/lib/complexes/read.ts` (shell, new) | `complexApp`: for an area, picks candidate tiles from the places already read, reads each tile once per release, stores a row per tile, returns the complexes; a failure is silent and retried after `retryMs` (CX12, CX14). |
| `src/lib/db/types.ts`, `db/stores.ts`, `db/migrations.ts`, `db/index.web.ts`, `db/sqliteStore.ts` | A derived store `complex_tile` (key `z/x/y`, the release, the decoder code, the complexes of that tile) in `DERIVED_STORES`: the next SQLite migration, IndexedDB `VERSION` 18 to 19 with an `oldVersion < 19` step. A migration, so it is your call (below). |
| `src/lib/atlas/atlas.ts`, `atlas/useAtlas.ts` (core, view) | The selected area's complexes next to `busyAreas`; `ATLAS_CODE` is not bumped (nothing it stores changes). |
| `src/lib/discovery/curation.ts` (core) | A guard test only: a complex is never a mark (CX8); no code change expected. |
| `src/lib/resurface/context.ts`, its shell (core, shell) | `placeLine` takes an optional `{ complex, near }` and leads with it, keeping street and town; the shell reads only complexes already cached under the fix and never fetches (CX11-CX13). |
| `src/lib/discovery/settings.ts`, `components/ExploreSettings.tsx` (shell, view) | Five switches "Shopping, Markets, Campuses, Stations, Civic", meta `complex_hidden`, parsed as `explore_hidden` is, `parseHidden`-style (CX10). |
| `src/components/atlas/AtlasCard.tsx` | A "Complexes" section after "Busy areas": the nearest few (name, kind word, Walk to), then a "See more" button (expanded state announced, no number) that lists the rest (CX4). |
| `src/components/map/*` (view, both platforms) | A `complexes` prop: one fill-less line layer and name labels at close zoom for the selected area only, drawn the way the area's border is (`lit`), a tap eases to it (CX9). |
| `src/lib/net/policy.ts` (adapter) | The Overture host's description names `buildings` and `base` as well (the host is already allowed; `check:vision` unchanged, CX16). |
| `scripts/fixture-complexes.mjs` (new) | Saves real tile fixtures for Strawberry Square, Lehigh Valley Mall, a capture beside a mark inside one, and one example per other kind that has one into `__tests__/complexes/` (run by hand, never in CI). |
| `scripts/features.js` | `complexes` in `explore`'s specs; `IN_PROGRESS` while building. |

## Data

- **New cache, no new truth.** `complex_tile` is derived (cleared by `purgeDerived`, tagged `COMPLEX_CODE` and the release),
  like `outline_tile`. SQLite migration: the next entry in `MIGRATIONS`; IndexedDB `VERSION` 18 to 19.
- **Never on a capture, a moment, a walk or an `Area`** (CX7, CX11, CX12).
- **A complex split by a tile edge** comes in two pieces with one Overture building id; the adapter joins them by that id.

## Tests (one per criterion, written first as todos)

Files in `src/lib/__tests__/complexes/`; every name starts with its id and `:`.

| Id | Test file | What the test pins |
|---|---|---|
| CX1 | `rule.test.ts` | the Strawberry Square and Lehigh Valley Mall fixtures are complexes; a named church and a named office tower are not; the minimums are not shown |
| CX2 | `rule.test.ts` | a mall-like point, a cluster with no polygon and the Capitol's separate buildings are not complexes; the outline is the source's, unchanged |
| CX3 | `rule.test.ts` | every complex has one of the five kinds; a polygon that fits none is dropped |
| CX4 | `lines.test.ts` + journey | the card lists the nearest few with name, kind word and Walk to, and "See more" lists the rest, none dropped; no holds-line; none shows no section and no "none"; a partial read says "Complexes near here" |
| CX5 | `lines.test.ts` | no line or label holds a digit or a counting word from the named list; a name with a digit passes |
| CX6 | `lines.test.ts` | nearest first, ties by name then id, the same order after "See more"; the label has no number; no "biggest" or "busiest" |
| CX7 | `notVisited.test.ts` | nothing marks a complex visited, counts complexes or assigns a walk; Walk to writes nothing about a complex |
| CX8 | `notMark.test.ts` | a complex is no mark, checklist item, find or bar; the capture-in-a-complex fixture finds its mark as before |
| CX9 | `mapLayer.test.ts` + journey | only the selected area's, no fill, own hue, width and opacity within the border, named at close zoom; labels are name and kind word; no layer summary |
| CX10 | `kinds.test.ts` | a kind off leaves the card and map only; the read and the moment's line ignore it; all five off shows nothing |
| CX11 | `placeLine.test.ts` | inside: "Strawberry Square, N 2nd St, Harrisburg"; within 40 m outside: "Near ..."; farther: MC1; overlapping complexes give one name |
| CX12 | `placeLine.test.ts`, `view.test.ts` (shell, `fakePorts()`) | no request on any surface; none cached is the street line; the line changes once and never back |
| CX13 | `surfaces.test.ts` | the complex reaches only the arrival line of Memories and the gallery viewer; never stored on a capture, moment, thread entry or walk |
| CX14 | `read.test.ts` (shell, `fakePorts()`) | one row per tile and release; recomputed on a new code; cleared by `purgeDerived`; a complex across a tile edge is one |
| CX15 | `overtureSource.test.ts` + the layer check | the adapter reads the real fixtures; core never imports it |
| CX16 | `read.test.ts` | only candidate tiles within the tile and byte budgets, each once; a failure shows nothing and retries; the host table is unchanged |

A new journey `scripts/e2e/journeys/complexes.js` (the harness gets a small fake `buildings` tile, as `curiosities` fakes
the archive) checks CX4, CX9 and CX10 on the web build.

## Deferred, and why

- A star, an Area level and a replay line for a complex (the owner's call, 2026-11-11).
- A kind with no real fixture (see above), recorded in `docs/DEFERRED.md` when found.
- A chronicles-data pack for complexes (a later source behind `ComplexSource`).
- Complexes in the walk screen, in Navigate and in Walk me back; only Explore and the arrival line this slice.
- A title suggestion, search results and the share reel naming a complex (CX13).

## Native, never run on a device

The map layer's outline and labels, the new switches and the SQLite migration are web-verified only. Each gets an item in
`docs/NATIVE_UNVERIFIED.md` (CX9, CX10, CX12) and, where a phone alone can check it, an `UNTESTED` line.

## Screens: one line per action (goal, how often, control, matrix row)

| Action | Goal and situation | Control | Matrix row |
|---|---|---|---|
| Read what complexes are here | See where there is a lot of life; each time an area is opened | A section of the area card, rows of name and kind word | 11 (a row that opens a related item) |
| Read the rest | Every complex of the area, not only the nearest; occasional | "See more" button at the end of the section, expanded state announced, no number | 11 (a control that reveals related items in place) |
| Go to one | Walk to a complex; occasional | Walk to on the row, as Busy areas have it | 11 and DW |
| See it on the map | Know its extent; each time | Outlines for the selected area; a tap eases to one | no row (map layer; precedent: the town's tinted border, TB1-TB9) |
| Hide a kind | Filter what the card shows; rare | A switch in the settings list beside "What I'm into" | 14 (a switch in a list row, effective immediately) |

No control the matrix says to avoid.

## Steward's findings (Nov 11), triaged

Two breaches of a Never or Always line and nine drifts or gaps; I accept all but two in part, and they are in the spec.

| # | Finding | Triage |
|---|---|---|
| 1 | Viewing a moment could fetch a tile: data leaving the device without a tap; contradicts MC2 | **Accepted.** CX12; the plan's "read the one tile" is withdrawn. The cache fills only from reads the walker already makes. |
| 2 | A complex replacing the street breaks "a moment arrives whole"; a footprint stated as where it was | **Accepted.** CX11: the complex leads and the street stays; "Near ..." within 40 m; one tie rule. My earlier recommendation to replace the street is withdrawn. |
| 3 | "what it holds, by kind" is a size proxy and a tally by another name | **Accepted.** The line is gone (CX4). |
| 4 | An uncapped A-Z list is a to-do list; the gate favours big ones; a partial read looks complete; Walk to vs CX7 | **Accepted, reshaped by the owner** (no cap): the card opens on the nearest few and "See more" lists the rest with no number (CX4, CX6); CX1 says the minimum is a gate, never a measure; CX4 titles a partial read "near here"; CX7 says Walk to stores nothing. |
| 5 | CX5 untestable: names with digits, no word list, the layer's screen-reader summary | **Accepted.** CX5 exempts names and names the words; CX9 forbids a summary. |
| 6 | A second taxonomy beside "What I'm into"; silent on the read, the line and all-off | **Accepted in part.** CX10 pins the read, the line and all-off. I keep a separate group of switches rather than adding to "What I'm into", since those govern marks. |
| 7 | Quiet outlines untestable; a footprint overstates the place | **Accepted.** CX9 and CX2 say how, and that the outline is never inflated. |
| 8 | Which surfaces may name a complex | **Accepted.** CX13. |
| 9 | The line flickers as the cache fills | **Accepted.** CX12 (changes once, never back). |
| 10 | A new theme or host, and no byte cap | **Accepted, host checked.** `buildings` and `base` sit on the host the app already allows (the same bucket and release as places); CX16 pins the host table and adds the caps. |
| 11 | Thin criteria: sort key, the CX8 fixture, tile-edge join, the layer check | **Accepted.** CX6, CX8, CX14, CX15. |

Silent questions: (1) a title suggestion never names a complex: "suggest, never write" holds (CX13). (2) Whether a station is a
place a walker notices: for you, below. (3) Navigate and Walk me back naming a complex: deferred. (4) A name from
OpenStreetMap contributors is open-data presence, as 0080 and 0084, not other people's activity: I will write that in the
decision record at the end of the slice.

## Open for the owner

1. **The migration.** `complex_tile` (derived, one row per tile and release) is new storage. Alternative: memory only, a
   read on every launch. Recommended: the cache.
2. **How many show before "See more".** The owner chose nearest first and a "See more" (no cap). I use 4 as the constant unless you say another number.
3. **Stations.** The steward notes the vision is silent on transport. Recommended: keep Stations as a kind, since a station
   with shops and services inside is a place made of places.
