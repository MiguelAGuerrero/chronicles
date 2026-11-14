# Storefronts: plan (SF1-SF18)

For the owner to read before any code. Spec: `specs/storefronts/spec.md`. The gate (Nov 14) is in the spec's Vision section: aligned if reshaped.

## Shape in one paragraph

A second pack family, `storefronts`, built in chronicles-data from OpenStreetMap `shop=*` and published beside the places archive on the same Pages site. The app reads it by z12 tile through `lib/net` exactly as it reads the places archive, but the reader is its own module, never stored, never merged with the map's places. A new `Storefronts` entry in the layer registry turns the read on and the drawing on; three screens host it (Explore, Navigate ready, the live walk). Nothing in presence, discovery, the atlas or the landing knows it exists.

## Two halves

| Half | Where | Built in this slice? |
|---|---|---|
| **The app** (contract copy, reader, type table, layer, drawing on both maps, tap card, journey) | this repo | yes, against a fixture pack served by the e2e harness |
| **The pack** (the OSM shop adapter, the schema, the regional build, the manifest, the Pages publish) | chronicles-data (not attached to this session) | the contract is agreed here first (below); the adapter is built there. Until a real pack is published the app reads nothing and the layer says "Not available right now" (SF7) |

The contract goes first so both halves build to one thing: `contract/storefronts.schema.json` and `contract/storefront-types.json` in chronicles-data, pinned in the app under `src/lib/__tests__/storefronts/contract/` like the places contract (SF8).

## Data

**Pack record** (SF4): `{ type: string, name: string, at: [lon, lat], chain?: true }`, one z12 tile layer named `storefronts`, one record per shop, `type` the OpenStreetMap `shop` value as it is (`second_hand`, `antiques`, `books` ...). Nothing else: no id beyond what PMTiles needs, no brand string, no phone, website, hours or description. The build uses `brand`, `brand:wikidata` and `operator` to set `chain: true` and drops them (SF5). A shop with no name is not a record (no label to give, and a tap card with no name says nothing).

**Manifest**: the same shape as the places manifest (`regions`, each with `current` and `previous` files, `blocks`), at `<base>storefronts/manifest.json`. The app reuses `parseManifest`, `pickRegion`, `regionUrl`, `manifestDue` from `discovery/archiveManifest.ts`; only the base path and the meta keys differ. If that module's names turn out to say "archive" too loudly the reuse is by import, not a copy, and a rename is its own commit.

**Not stored (SF6, SF18).** Storefront places live in memory for the session's reads (a small map keyed by z12 tile), never in the place cache. No SQLite migration, no IndexedDB version bump. The only persisted things are two meta keys, declared in `src/lib/meta.ts` (`storefronts_manifest`, `storefronts_checked_at`, owner `storefronts`) and read and written with direct `getMeta`/`setMeta` so the meta scan sees them. The layer's on-state is the existing `map_layers` JSON; a stored value from before has no `storefronts` key and reads as off (SF2, tested).

**The network.** No new host: the pack lives on `miguelaguerrero.github.io`, already in `ALLOWED_HOSTS` and `HOSTS`. `EXPO_PUBLIC_STOREFRONTS_BASE` points the e2e build at `/storefronts-e2e/`, which the harness serves, as `EXPO_PUBLIC_PLACES_BASE` does for the archive.

**The type table (SF9).** One list in core, `storefronts/types.ts`: shop value to drawn or not, from presence's `boutique` shop values (antiques, second_hand, charity, gift, florist, boutique, jewelry, toys, outdoor, photo, stationery, clothes, bag, books, music, musical_instrument). It is kept in `storefronts/`, not in `presence/presence.ts`, because presence's table is "what a place is" for density and marks and this layer is explicitly not that (SF17); a test checks the two lists agree so the layer never draws what presence calls an errand. `mall` and `department_store` (presence calls them destinations) are not drawn this slice: a mall is not one storefront. Both are named as defaults below.

## Files to touch

New, all under `src/lib/storefronts/` unless said (each starts with `// @layer`):
- `types.ts` (core): the record's type, `isDrawn(type)`, the drawn list, the words for a type ("Thrift shop", "Antiques", "Bookshop" ...), `NEAR_ZOOM` constant.
- `read.ts` (core): `storefrontsFromTile(features)` (SF4: keeps the four fields, drops the rest and anything not drawn), `thin(places, zoom)` (SF10: one mark per cell at a zoom, same size, no count), `nearest(places, lngLat, radiusM)` (SF14), `withinOf(places, you, m)` (SF12's 800 m).
- `shell.ts` (shell): `createStorefronts({ db, clock, io })`, the manifest at most daily, the region, the tile reader, a per-session tile map; failure is "no storefronts" and a flag the panel's line reads (SF7). Modelled on `discovery/archive/shell.ts`.
- `index.ts` (adapter): the app's instance on `ports`, `lib/net` and PMTiles, as `discovery/archive/index.ts` does; its `decode` reads the `storefronts` layer.
- `useStorefronts.ts` (view): `useStorefronts(centre, on, stillness?)`, returning `{ places, reading, failed }`; reads only when `on`, only when the map has settled (the `stillness` ref, as busy does), and not below `NEAR_ZOOM`. Never reads while off (SF2).
- `src/components/StorefrontCard.tsx` (view): the tap card (SF14-SF16).
- `src/lib/__tests__/storefronts/` (tests, below) and `contract/` (the pinned copy).

Existing, changed:
- `src/lib/layers/registry.ts`: a `storefronts` entry, `defaultOn: false`, icon `bag-handle-outline`, one legend row "Shops" (a new `SwatchKey`, `'shop'`), a note ("From OpenStreetMap. Thrift, antiques, books, records, clothing and gift shops. Tap one for its name.").
- `src/lib/layers/notes.ts`: the "Zoom in to see them" and "Not available right now" lines for Storefronts.
- `src/components/map/types.ts` and `WalkMap.web.tsx`, `WalkMap.native.tsx`: a `storefronts` prop, a source and one circle layer drawn like `found-pins` (web `setData('storefronts', ...)`; native a `GeoJSONSource` with a `CircleLayer`), placed under the dot, trace, route and pins (SF12); the press handler's hit order gets the storefront last (SF14). No text layer (SF11).
- `src/app/(tabs)/explore.tsx`, `src/components/walk/useReady.tsx`, `src/app/walk.tsx`: each calls `useStorefronts` with its fix or centre and passes the result and the card to the map (SF1, SF3); the walk's and ready's pass `near` (800 m of the fix).
- `src/components/StartSettings.tsx`: its `LayersKey` lists the new row (SF3, from the registry, so it is one line if any).
- `src/lib/meta.ts`: the two keys.
- `scripts/features.js`: a feature `storefronts` (source `src/lib/storefronts/**`, `src/components/StorefrontCard.tsx`; rule `storefronts`; journeys `storefronts`; specs `storefronts`) and the spec in `IN_PROGRESS` (`branch: claude/nice-hopper-nvpwap`, `since: 2026-11-14`, 7 days at most).
- `.claude/rules/storefronts.md` (a rule file of its own, `paths:` narrowed to that folder, decision 0173), and one line in `layers.md`.
- `docs/ARCHITECTURE.md` (codemap, the pack, no web exception expected: PMTiles and MapLibre both run on web), `docs/PRODUCT.md`, `docs/NATIVE_UNVERIFIED.md`, `docs/DEFERRED.md`, `docs/STATUS.md` (by `npm run records` only).
- `docs/decisions/<next>-storefronts.md`, numbered with `npm run book:next-decision` after the last fetch and checked with `--check` before publishing, never claimed early: the owner's calls above, **amends 0044** (shops may be drawn as a layer, never as marks), and a line for VISION.md's Precedents for the owner to approve (agents propose, the owner edits VISION.md).

## Tests per criterion

A new feature folder `src/lib/__tests__/storefronts/` and a journey `scripts/e2e/journeys/storefronts.js` (covers `src/lib/storefronts/**`, the registry, the card, the three hosts).

| Id | Test (name starts with the id) | File |
|---|---|---|
| SF1 | the three hosts each draw the marks of the fixture pack when the layer is on; the Layers button on each opens a panel with a "Storefronts" row, its legend and an icon that is not Busy streets' | journey `storefronts`; `registry.test.ts` (distinct icon and name) |
| SF2 | off by default; a stored `map_layers` with no `storefronts` key reads off; while off the shell is never called and the harness serves no storefront request | `layerState.test.ts`; journey (request log) |
| SF3 | one setting for every map; the registry row reaches `LayersKey` | `layerState.test.ts`; journey on `ready`, Explore and the walk |
| SF4 | a tile feature with extra fields (rating, hours, phone, website, id, description) yields a place holding only type, name, position and chain | `read.test.ts` |
| SF5 | `chain: true` is kept; absent is not flagged; nothing is inferred from a name ("Goodwill" with no flag is not a chain) | `read.test.ts` |
| SF6 | a shell over `fakePorts()`: manifest at most daily, region by position, tiles by z12, nothing written to the place cache, only the two meta keys, a host check against `ALLOWED_HOSTS` | `shell.test.ts` |
| SF7 | failed manifest, failed tile, empty region and no region each give no places, a flag, and no throw; the notes say "Not available right now" with no alert text | `shell.test.ts`; `notes.test.ts` |
| SF8 | the pinned contract's types, schema and example read through the app's reader; a class not in `storefront-types.json` is not drawn | `contract.test.ts` |
| SF9 | the drawn list is exactly the listed values; every other value (supermarket, hairdresser, an invented one) is not drawn; presence's boutique shop values are a superset check | `types.test.ts` |
| SF10 | `thin`: the same size, no count in its output, close places merge at a low zoom and split at a high one; below `NEAR_ZOOM` the map is given nothing | `read.test.ts`; journey (`data-storefronts`) |
| SF11 | the map's layer list has no symbol layer for storefronts; the legend and card copy hold no digits | `mapProps.test.ts` (as `map/busyNames.test.ts` reads layers) |
| SF12 | `withinOf` 800 m on the walk maps and unbounded on Explore; the layer order puts storefronts under the dot, trace, route and pins (a pure `storefrontOrder()` the maps call, like `busyLayerOrder`) | `read.test.ts`; `order.test.ts`; journey checks the capture stack is clickable |
| SF13 | the words grep (`layers.test.ts`) runs over the new entry | `registry.test.ts` |
| SF14 | `nearest` picks the one nearest within the reach and none beyond; pins, marks and "?" win a shared tap (the press handler's order, a pure `pressTarget()`); a tap elsewhere closes | `read.test.ts`; `pressTarget.test.ts`; journey |
| SF15 | the card's text for a flagged and an unflagged place; no field of the place can reach it beyond name and type (a type-level test: the card's input has two fields) | `card.test.ts` |
| SF16 | on `ready` and the walk the card's box and the capture stack's box do not overlap, and a capture starts with the card open | journey |
| SF17 | an import-boundary test: no file under `presence`, `discovery`, `atlas`, `landing`, `explore` imports `storefronts`; the three codes are unchanged | `boundary.test.ts` |
| SF18 | `Object.keys` of every store the shell touches: only the two meta keys; a captured moment's record has no storefront field | `shell.test.ts` |

Layer check: `storefronts/types.ts` and `read.ts` core (no clock, randomness, module state; import only core), `shell.ts` shell, `index.ts` adapter, `useStorefronts.ts` view. `npm test` and lint enforce it.

Tests go in first as todos in their own commit (`Storefronts: tests first (SF1-SF18, failing)`), which `check:test-first` reads.

## Screens: one line per action (goal-to-control matrix)

| Goal | How often, where | Control | Matrix row | Where the owner will look first |
|---|---|---|---|---|
| Turn the shops on or off on the map | Occasional, a map on any of the three screens | The Storefronts switch in the existing Layers panel | #14 Toggle a setting | The Layers button on the map they are looking at, the same place as Busy streets and Town borders |
| Know what the marks mean | Passing | A legend row "Shops" and its note under the switch | #19 A passive status | Under the switch |
| Know the layer is not drawing | Passing | The panel's quiet line ("Zoom in to see them", "Not available right now") | #19, #21 | Under the switch |
| Learn what one mark is | Occasional, a map on any of the three | A tap on the mark opens a small card: name, kind in words, "A chain" if flagged | #24 A quick, scoped sub-task without losing context (a card, not a sheet, so the map stays in view) | On the mark itself |
| Close the card | Every time | A tap elsewhere on the map, and a visible close symbol | #23 Dismiss | Where they tapped |

No new top-level control, no capture behind a tap, nothing over the capture stack (Always: capture one tap away).

**Defaults I took that make something quieter or narrower (overrule any):**
1. The marks are **one colour, one size, no glyph per type**, neutral grey-ink, not the accent, the busy magenta or the borders' colours; the type is said on the card and the legend names the family. (Native glyph images per type are heavy and look like a directory.)
2. **No per-type switches and no chain filter** in the panel this slice: one switch for the whole layer. They are the first things deferred; they need the panel to hold more than switches and status lines.
3. **`mall` and `department_store` are not drawn.**
4. **On the walk maps the marks draw only within 800 m of you** (DC18's number for busy names); Explore draws across what the map shows once it has settled.
5. **Below zoom 14 nothing is drawn** (`NEAR_ZOOM`), the zoom the tiles' own places are complete at.
6. **The card has no action.** No Walk here, no Open in Maps, no route; circuits and the hand-off to Maps come later.
7. **Icon `bag-handle-outline`** for the layer. Busy streets already uses `storefront-outline` and its row says "Busy with places: streets with many shops"; the two sound alike, which is a confusion risk the cold find will test (SF1). If it fails, the fix is words or icon, not a merge.

## Every surface (from the code, not from memory)

`grep` of the hosts: the Layers button is in three places (`explore.tsx:815`, `useReady.tsx:297`, `walk.tsx:1715`), the legend (`LayersKey`) in two more (`walk.tsx` and `StartSettings.tsx`). The map is one component with two builds (`WalkMap.web.tsx`, `WalkMap.native.tsx`). Other hosts of the map that do not pass a Layers button (the Chronicle map, replay, the planner's drawer, a day's map, the town page's tile) are **not** hosts of this layer: they have no Layers button and the owner's call was "every map that has the Layers button". A line each in the rule file says so.

## Steward findings

(Added after the steward runs; each accepted into a criterion or rejected with its reason.)

## Deferred, and why

Circuits (the next slice, once the data exists); per-type switches, chain filter, labels, hours, a card action, errand shops, regions beyond the first pack: all are in the spec's "Not in this slice" and go to `docs/DEFERRED.md` with the slice. The pack's adapter is built in chronicles-data.

## Native paths that will not run on a device

The new circle layer and its source on MapLibre React Native; the press hit order on native; the layer over the walk's live map at walking pace; PMTiles byte-range reads of the storefront pack on a phone's network. Each goes into `docs/NATIVE_UNVERIFIED.md` as a Do/Expect item (the ones only a phone can check go in `UNTESTED` with `device: <why>`).

## Risks the owner should know

- **Density on the live walk.** A town centre can hold hundreds of shops; at 800 m the marks may crowd the trace. `thin` and the 800 m bound are the levers; the `ux-reviewer`'s pictures with a dense fixture decide.
- **Data quality.** OSM shop coverage varies a lot by town; the layer will be sparse in some. The panel's note says the source and says nothing about completeness.
- **Two readers of "a shop".** Presence calls a shop a weight; the layer calls it a mark. SF9's superset test and SF17's boundary test keep them from drifting into each other.
- **The pack does not exist yet.** The app's half can ship against fixtures; the layer will read nothing in production until chronicles-data publishes a storefront pack.
