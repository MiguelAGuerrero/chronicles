# Activity density: plan

For the owner's review before any code. The spec is `specs/activity-density/spec.md`
(AD1-AD16).

## Two calls this plan needs from the owner

1. **A new dependency, `pmtiles`** (BSD-3, from Protomaps, about 16 KB, depends on
   `fflate`). It reads a tile out of Overture's single large file with byte-range
   requests, and decompresses with `fflate` where the platform has no
   `DecompressionStream` (Hermes on the phone). The alternative is our own reader of
   the PMTiles v3 header and directories, about 150 lines plus gzip. Recommended: the
   library, installed with `EXPO_OFFLINE=1 npx expo install pmtiles`.
2. **Following Overture's newest release automatically (AD6).** Overture keeps only
   two or three releases online, about two months each (on 2026-11-03 the bucket held
   2026-09-23.0, 2026-09-23.1 and 2026-10-21.0; 2026-08-20.0 was gone). A pinned
   release would stop working every two months until someone bumps it. The bucket's
   listing is public and open to browsers, so the app can pick the newest release
   itself, once a day, the way it already follows the map's tile build. Recommended:
   follow it automatically.

## Files

- **`src/lib/activity/weights.ts`** (pure, new): the one table of what counts and how
  much (AD1), for both sources:
  - OpenMapTiles `poi` class and subclass → full, half, quarter or nothing;
  - Overture `taxonomy.hierarchy` (root and second level) → the same.

  `discovery/tilePois.ts` keeps its own table for marks (AD2).
- **`src/lib/activity/points.ts`** (pure, new):
  - `activityFromTilePois` (OSM, every class, unnamed places included);
  - `activityFromOverture` (confidence ≥ 0.8, not closed; AD4);
  - `mergeSources`, which removes duplicates (AD5).

  Output: `ActivityPoint { at, weight, name | null, source }`.
- **`src/lib/activity/overture.ts`** (new; network, not imported by tests):
  - `ensureOvertureRelease()`: lists the bucket at most once a day and keeps meta
    `overture_release` and `overture_checked_at` (AD6);
  - `overtureTiles(tiles, shouldStop)`: reads the z14 tiles through `pmtiles` and
    decodes them with the existing `@mapbox/vector-tile`, keeping an in-memory cache
    per release and tile for the session (AD8). On any failure it returns `null` and
    the read carries on without Overture (AD7).
- **`src/lib/landing/grade.ts`** (pure, new): the density along streets and the grades.
  - `densityAlong(points, segments)` (AD9):
    - each point snaps to its nearest named street within 40 m (bucketed with the
      existing `Buckets` / `EdgeGrid`);
    - each street piece is sampled every 10 m;
    - a sample's density is the sum of `weight × (1 − d/120)` over snapped points on the
      same named street within 120 m (the simple form of kernel density along a
      network).
  - `gradeStretches(...)` (AD10):
    - floor: density ≥ 3;
    - grades by the read's own distribution, weighted by length over the stretches
      above the floor: strong is the top 15%, medium the next 30%, faint the rest;
    - neighbouring samples with the same grade join into stretches.

    These numbers are starting points, tuned on the Phillipsburg fixture and the
    Zurich test tiles and recorded in `LANDING_RULES`.
  - `busyStreets(...)` (AD13): runs of one name at medium or above, at least 120 m long,
    strongest first, each with its peak.
- **`src/lib/landing/analyze.ts`**:
  - `analyzeArea` takes `points: ActivityPoint[]` in place of `places: Place[]`.
  - It returns `graded: { lines, grade }[]` beside `strips`, which now come from
    `busyStreets`.
  - Pockets become clusters of medium-or-stronger stretches whose combined length is at
    least 200 m, shaded by their hull. They are named as today.
  - Landing and the fallbacks stay.
  - `LANDING_RULES` gains the new numbers and loses `perPlaceM`, `minStripPlaces`,
    `denseWeight` and the category weights.
- **`src/lib/landing/read.ts`**, **`src/lib/explore/exploreRun.ts`** and
  **`src/lib/atlas/read.ts`**: build points from OSM plus Overture, and pass them in.
  Rows record `overture: release | null` so a read without Overture is read again
  (AD7).
- **`src/lib/landing/view.ts`**: `LANDING_CODE` goes to `l4`. A row is stale when its
  tile build or its Overture release differs from the current one (AD6).
  `LandingView` carries the graded lines.
- **`src/lib/atlas/atlas.ts`**: `ATLAS_CODE` goes to `a2`. `sketchOf` and `sketchPaths`
  take the graded lines and return one path per grade (AD14).
- **`src/components/map/types.ts`**:
  - `stripsGeoJSON` carries `grade` per line;
  - `HOTSPOT_GRADES` holds the width and opacity for each grade (AD12).
- **`src/components/map/WalkMap.web.tsx`** and **`WalkMap.native.tsx`**: the `strips`
  layer's width and opacity read `['get', 'grade']`.
- **`src/components/atlas/MiniMap.tsx`**: three magenta paths, one per grade (AD14).
- **Attribution** (AD16): the map's credit line gains "Overture Maps Foundation". On web
  this is the style's `attribution`; on native it is the source's `attribution`
  property, to be checked in `node_modules/@maplibre/maplibre-react-native` before
  writing.
- **Docs:**
  - `.claude/rules/landing.md`: the analysis section rewritten;
  - `.claude/rules/explore-and-discovery.md`: the note on density's place table;
  - `docs/decisions/0077-activity-density.md`;
  - `docs/PRODUCT.md`, `docs/ARCHITECTURE.md` (the Overture adapter and its network
    host);
  - `docs/NATIVE_UNVERIFIED.md`.

## Data

- **No new truth.** No schema change: no SQLite migration and no IndexedDB version.
  - Landing rows keep `analysis` as JSON, so the graded lines ride inside it.
  - Atlas rows keep `profile` as JSON.
  - The code bumps (`l4`, `a2`) make every old row stale, so it is measured again.
- **Meta:** `overture_release` and `overture_checked_at`.
- **Overture places are never stored.** They live in memory for one read. Only what is
  derived from them (grades and names in landing and atlas rows) is kept, as cache.
- **Data use:** a z14 Overture place tile over a downtown is about 0.5 MB (two tiles
  over Phillipsburg and Easton came to 1.1 MB). A read of 1.5 km covers 4 to 9 tiles.
  The session cache stops the atlas from fetching a tile twice.

## Tests, one per criterion

Pure tests run under `npm test`; the e2e is `scripts/e2e-web.js`.

| Id | Test | File |
|---|---|---|
| AD1 | `AD1: every kind counts at its weight; ATMs and parking count nothing` | `activityDensity.test.ts` |
| AD2 | `AD2: marks and presence bars are unchanged by the new kinds` (checks `placesFromTilePois` and `presenceSteps` on a fixture with a barber and a bank) | `activityDensity.test.ts` |
| AD3 | `AD3: an Overture read asks for the same z14 tiles as the map read` (`overtureTilesFor` is pure) | `activityDensity.test.ts` |
| AD4 | `AD4: Overture places under 0.8 or closed are left out` | `activityDensity.test.ts` |
| AD5 | `AD5: a place in both sources counts once` | `activityDensity.test.ts` |
| AD6 | `AD6: the newest listed release is chosen; a new release makes rows stale` (parses a saved bucket listing; `isStale`) | `activityDensity.test.ts` |
| AD7 | `AD7: without Overture the read is measured from OSM and marked to read again` | `activityDensity.test.ts` |
| AD8 | `AD8: a tile is fetched once per release in a session` (fake fetcher) | `activityDensity.test.ts` |
| AD9 | `AD9: density follows the street and fades within 120 m; a corner place adds to its own street` | `activityDensity.test.ts` |
| AD10 | `AD10: grades are the same at one and four times the density; below the floor nothing grades` | `activityDensity.test.ts` |
| AD11 | `AD11: South Main Street in Phillipsburg grades medium or strong` | `activityDensity.test.ts`, fixture `phillipsburg.json` |
| AD12 | e2e `check(..., 'AD12: graded strips draw with three widths')` on the walk map, plus `AD12: stripsGeoJSON carries the grade` | `scripts/e2e-web.js`, `landingView.test.ts` |
| AD13 | `AD13: a busy street is a run of one name at medium or above, at least 120 m` | `activityDensity.test.ts` |
| AD14 | `AD14: the sketch has one path per grade` | `atlas.test.ts`, plus an e2e check on the tile's SVG |
| AD15 | e2e `AD15: no digits in busy-street text`, plus a unit check of `characterLine` | `scripts/e2e-web.js`, `atlas.test.ts` |
| AD16 | e2e `AD16: the attribution credits Overture` | `scripts/e2e-web.js` |

**The Phillipsburg fixture (AD11).** It is saved once from Overture's real tiles for the
two z14 tiles over downtown Phillipsburg, release 2026-10-21.0. Both are reachable from
this cloud session; OpenStreetMap's are not.
- Places: name, position, `taxonomy`, `confidence` and `operating_status` only, about
  1,000 rows.
- Streets: Overture's transportation `segment` layer, named roads only, mapped to
  `StreetSegment` by a test-only helper.

So AD11 tests Overture's places alone. When OSM tiles for the town can be read, they get
added.

**The e2e.** The e2e serves its fake world as vector tiles already. For Overture it
serves a small PMTiles file written by a new `scripts/pmtiles-encode.mjs` (one
directory, uncompressed tiles), at a URL the e2e sets in place of the bucket. The
release check reads a fake listing.

## Deferred

All recorded in `docs/DEFERRED.md`:
- Overture places as marks, finds or presence bars: marks are the owner's attractions
  rule, and the bars must mean the same everywhere.
- Building footprints, land use, address points and centrality as density signals:
  only if Overture and OSM together still miss a town.
- A downloaded copy of Overture tiles kept across launches.
- A side-by-side count of OSM and Overture over Phillipsburg, which needs the
  OpenFreeMap tiles this session can't reach.

## Native paths that will not have run on a device

All listed in `docs/NATIVE_UNVERIFIED.md`:
- `pmtiles` byte-range `fetch` under React Native, including whether a 206 response's
  `arrayBuffer()` works and whether the `Range` header passes.
- `fflate` decompression on Hermes.
- The data-driven line width on the native `strips` layer.
- Overture's attribution on the native map.
