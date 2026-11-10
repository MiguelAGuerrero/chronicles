# Places out of town: the plan

For the owner to review before any code. The criteria are `spec.md` (OP1-OP17). The open choices are at the end.

## What was found (Nov 9)

- **The archive** (branch `claude/places-archive`, not on main; PW16 unset) is one PMTiles file per region with z12 tiles only, layer `places`, points carrying `name`, `class`, `src`, `id`. It is written by our own writer (`scripts/places-archive/archive.mjs`, no tippecanoe) from a Wikidata query per cell (`fetch-wikidata.mjs`) that enters only items of pinned classes (`classify.mjs`). The app maps `class` to a category and kind in `discovery/archivePois.ts` (`ARCHIVE_CLASSES`) and drops a class it doesn't know (`archivePlace` returns null).
- **Reads** go through `discovery/archive/shell.ts` (`createPlacesArchive`): the manifest at most daily, the region whose box holds the read's centre, the z12 tiles of the read. The US region's box is the data's bounds, so it covers much of Canada (audit F7, deferred).
- **Areas:** a place belongs to the nearest neighborhood within 1 km inside its town, else the town whose outline holds it, else a town or city (villages included, `areas/tilePlaces.ts`) within its reach capped at 1.5 km; else it is an orphan (`area_key` null). Town and village points come from the z11 place layer; the atlas reads them within 12 km, 12 tiles at most.
- **Grouping:** `starsFor` (`lib/places.ts`) merges stars closer than `PIN_GROUP_PX` on screen, every star the same size; the Chronicle map frames a merged star's points on a tap. The map takes `stars` already (`components/map/types.ts`).
- **Explore's map steps area to area** (discrete navigation, decision 0092): a swipe is a step, a tap clears the selection except near an area's point (`tapClears`). A "?" tap must be protected the same way.
- **Walking reach:** the navigator refuses a route over 10 km in a straight line (`NAV.maxM`, `nav/rules.ts`). OP13 uses that, so no new number.
- A 50 km radius at z12 is 100-170 tile reads; at z8 it is 4 at most.

## Design

### Phase 1: the archive (`scripts/places-archive/`, run by the weekly job in chronicles-data)

1. **Two tables, not one.** What *enters* stays a pinned list per source (Wikidata classes, OpenStreetMap tags, GeoNames codes), widened; what *kind* a type gets stays the app's table. A type that enters but has no kind keeps its type and shows as Other places (OP3). The build never takes "every Wikidata item with a location": towns, rivers and roads would flood it.
2. **New Wikidata classes** in `classify.mjs`: shrine, wayside shrine, wayside cross, grotto, pilgrimage site, tourist attraction, and a business with a heritage designation (P1435) (OP4, OP5). Each looked up and pinned with its use count, as today.
3. **`fetch-osm.mjs` (new):** OpenStreetMap places with a name and a pinned tag (OP1), from a per-state or per-province extract filtered with `osmium tags-filter`, one extract at a time so a runner's disk holds it (open choice 2). A business enters only with `heritage=*` or `historic=*` (OP5); chains are dropped by `chains.json`.
4. **`fetch-geonames.mjs` (new):** the country dumps (`US.zip`, `CA.zip`) for pinned feature codes (OP1). CC BY 4.0, credited (OP17).
5. **Canada's federal heritage directory:** only once its licence on open.canada.ca is recorded in the build; until then it is deferred, not guessed.
6. **`merge.mjs` (new):** one place per name within 50 m across sources, Wikidata's id winning, else OpenStreetMap's (OP1).
7. **The town flag** (open choice 1, recommended): the build marks each place `town: 1` when it is within the reach of a city, town or village point (the same `AREA_REACH_M` the app uses, imported from the app's module so there is one copy of the numbers).
8. **An overview level:** `archive.mjs` also writes z8 tiles holding only places without the town flag, same fields. The 50 km read is then at most 4 tiles.
9. **Regions:** the manifest gains a Canada region; each region carries its own boxes (states and provinces), not the data's bounds (OP2).
10. **Fields:** `name`, `class`, `src`, `id`, `town`; the output test fails on any other (OP5, PW7).

### Phase 2: the app

1. **Kinds** (`explore/explore.ts`, `discovery/types.ts`): `KINDS` relabels `monuments` to "Monuments and landmarks" (OP8; id unchanged, so `explore_hidden` keeps a user's switch) and adds `{ id: 'other', label: 'Other places' }` after Curiosities (OP7). `Kind` gains `'other'`; the category for it is open choice 3.
2. **`discovery/archivePois.ts`:** `ARCHIVE_CLASSES` gains the new types (OP4); an unknown type maps to `other` instead of null (OP3); reads `town` as a boolean on the place, never shown.
3. **`lib/pinGroups.ts` (core, new):** the greedy grouping pulled out of `starsFor`, `groupPins(points, zoom, lat, px)`, used by `starsFor` (no behaviour change, its tests stay green) and by the new layer (OP11).
4. **`discovery/outOfTown.ts` (core, new):** `farMarks(places, at, hidden)`: archive places without the town flag, within 50 km, kind on (OP10, OP7); `farCard(place, at, units)`: name, kind label, distance in words, and `walkable` from `NAV.maxM` (OP12, OP13). No list, sort or count is exported (OP14).
5. **`discovery/archive/shell.ts`:** `readFar(at)`: the overview tiles within 50 km, silent on failure, read again after 10 km moved or a new version (OP16). Places are never stored (the archive's rule).
6. **The view** (`src/app/(tabs)/index.tsx`, `components/map/WalkMap.web.tsx` and native): a `farMarks` prop drawn as "?" pins without labels (DOM markers on web, `Marker` on native), grouped by `groupPins` at the map's zoom; a tap on a group frames its points; a tap on one opens `components/atlas/FarCard.tsx`: its name, kind, distance, and Walk here (`showWalk` with the destination) or Open in Maps (`nav/handoff`). `tapClears` protects a far mark as it protects an area's point. Hidden while an area's card or a town's page is open.
7. **Grading** (`atlas/`): `other` joins the kinds with its own steps, a dot on a tile and a row on the card (OP20, decision 0112); far places never enter a ring read (OP15). `ATLAS_CODE` is bumped, so every area is read again once.
8. **Credits:** GeoNames beside OpenStreetMap where the map's credits are (OP17).

## Data

- `ATLAS_CODE` bump (OP20): `atlas_area` is derived, so old rows are re-read, never patched.
- No new store, table or migration. Archive places are never stored (decision 0103's rule). `explore_hidden` may hold `other`.
- The archive's schema gains `town`; `ARCHIVE_CLASSES` and AG5's pinned list change deliberately.

## Tests (feature `explore`, `src/lib/__tests__/explore/`; build tests beside `placesArchiveBuild.test.ts`)

| Criterion | Test | Kind |
|---|---|---|
| OP1 | `placesArchiveSources.test.ts`: "OP1: OpenStreetMap, GeoNames and Wikidata rows of one place within 50 m are one place" | build fixture |
| OP2 | `placesArchive.test.ts`: "OP2: Saskatchewan reads the Canada file, Lititz the US file, the Gulf of Mexico neither" | core |
| OP3 | `placesArchive.test.ts`: "OP3: an unknown type is kept as Other places, not dropped" | core |
| OP4 | `placesArchive.test.ts`: "OP4: the type table is pinned (shrine, wayside cross, grotto, pilgrimage site, historic business)" | core |
| OP5 | `placesArchiveSources.test.ts`: "OP5: a business without a heritage signal, and a chain, never enter; no other field" | build fixture |
| OP6 | `placesArchiveSources.test.ts`: "OP6: the build's sources are the pinned list; no fetch only to sort" | build (the fetch log) |
| OP7 | `explore.test.ts`: "OP7: Other places is a switch, on by default, and hides its marks"; journey `out-of-town` | core + e2e |
| OP8 | `explore.test.ts`: "OP8: the Monuments switch reads Monuments and landmarks and keeps a saved off" | core |
| OP9 | `explore.test.ts`: "OP9: an archive business is a mark within range and a find within 60 m" | core |
| OP10 | `outOfTown.test.ts`: "OP10: only places without the town flag, within 50 km, kind on" | core |
| OP11 | `pinGroups.test.ts`: "OP11: close marks merge, same size, no count field"; journey `out-of-town` (a tap frames) | core + e2e |
| OP12 | `outOfTown.test.ts`: "OP12: the card holds name, kind and distance in words only"; journey `out-of-town` (no label) | core + e2e |
| OP13 | `outOfTown.test.ts`: "OP13: Walk here within NAV.maxM, else Open in Maps only" | core |
| OP14 | journey `out-of-town`: "OP14: no digit or count word in the tab's text, live region, `aria-label` or `title`, save the card's distance line" | e2e |
| OP15 | `atlas.test.ts`: "OP15: an area's profile is equal with and without far places and the other kind" | core |
| OP16 | `outOfTownRead.test.ts`: "OP16: one host, silent on failure, read again after 10 km or a new version" | shell (`fakePorts()`) |
| OP17 | journey `out-of-town`: "OP17: GeoNames is credited beside OpenStreetMap" | e2e |
| OP18 | `outOfTown.test.ts`: "OP18: a found far place is drawn and labelled as an unfound one" | core |
| OP20 | `atlas.test.ts`: "OP20: Other places inside a ring are a dot and a row; thin unchanged" | core |
| OP19 | `snap.test.ts`: "OP19: nextArea never lands on a far mark"; `outOfTown.test.ts`: "OP19: the card has no next or previous" | core |

A new e2e journey, `out-of-town` (`scripts/e2e/journeys/`), serves a fixture archive with an overview level: a shrine 30 km from a town (the Saskatchewan case), a cluster of three, and the Lititz bakery inside its town's reach (it must not show on the layer, OP10, and shows as a "?" on an exploring walk, OP9).

## Deferred, and why

- Canada's heritage registers, until their licences are recorded (0109).
- Sorting by name words or a recorded date: welcome, but not a step of this slice (0111).
- HABS and other registers that add places of their own: a source question for later (0111).
- "Where you're heading" for the 50 km: the app knows only walk routes.
- VISION.md's Shapes line for places reached by car: the owner's to write.

## Native, never run on a device

The far marks as `Marker`s on MapLibre RN, a tap on one beside discrete navigation's pan responder, and Open in Maps from the card. Each goes in `docs/NATIVE_UNVERIFIED.md` with its Do/Expect line when written.

## Order

Places worth the stop is merged and live first (PW16). Then phase 1 (the build, in this repo's scripts, published by chronicles-data), then phase 2. Tests first for each phase.

## The steward's review (Nov 9), triaged

| Finding | Triage |
|---|---|
| S1 [breach] reusing the grouping would bring the Chronicle's `starLabel` ("3 places, 2 walks, zoom in") | Accepted: OP11 fixes one accessible name with no count; `starLabel` is not reused |
| S2 [breach] a found far place would turn green and read "Found: name" | Accepted: OP18 |
| S3 [drift] the card's kind line could show a listing | Accepted into OP12: a `KINDS` label word for word, "A place" for Other places |
| S4 [drift] swipes or a next/previous could page through far places | Accepted: OP19 |
| S5 [drift] OP14's "no digit" contradicts the card's distance | Accepted into OP14: a digit only in the distance line; labels and titles scanned too |
| Silent 1: the owner's add file is the one editorial way in | Put to the owner: no reason needed, the owner's call is enough (decision 0112) |
| Silent 2: when the layer reads | Accepted into OP16: only while Explore's map is on screen, as the atlas's loop |
| Silent 3: a 50 km field invites planning a drive | The owner's pending Shapes line ("a walk can start where you park") |

## The owner's choices (Nov 9, decision 0112)

1. Out of town is a build flag, from city, town and village points with the app's reach numbers.
2. OpenStreetMap places come from Geofabrik's state and province extracts, filtered with osmium one at a time.
3. Other places get a presence dot and a kind row on the atlas (OP20); `ATLAS_CODE` is bumped.
4. The owner's add file needs no stated reason: the owner's call is enough.
5. The Saskatchewan test case is the St. Laurent Shrine near Duck Lake unless the owner names another.
