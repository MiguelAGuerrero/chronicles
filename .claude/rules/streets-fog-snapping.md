---
paths:
  - "src/lib/{streets,snapper,finish,tiles,tileMath,tileBuild,mapReads}.ts"
  - "src/lib/discovery/{tileDecode,tileFetch}.ts"
  - "src/lib/db/segmentBounds.ts"
  - "src/lib/__tests__/{bridges,core,segmentTiles,tileBuild,colors}.test.ts"
  - "src/lib/__tests__/mvtFixture.ts"
  - "scripts/mvt-encode.mjs"
---
# Streets, fog and snapping

Deriving streets from tiles, the fog, snapping a walk to streets, tile builds and the in-code tile decoder. The codemap is in `docs/ARCHITECTURE.md`; the decisions and their history are in `docs/decisions/`.

## Unwalked streets, the fog, live reads

- **Unwalked streets near me** count named streets only (the owner's call), within
  1 km by real distance. Pieces along this walk's trace (20 m) are left out of
  the fog until stop credits them.
- **The trace is green, on a white edge, and the fog is quiet** (the owner's
  call, Nov 1, after a scan's read filled a phone's walk map with grey). Fog is
  `FOG_STYLE`: 50% opacity, 1–2.5 px, narrower than the 4.5 px trace. It is bold
  only while "unwalked streets near me" is on. `colors.test.ts` checks the
  hues and contrasts.
- **Street reads from the live view (`collectView`) only count at z14.** Below
  z14, tiles are simplified and pieces get other ids, so `collectView` returns
  `complete: false` and nothing is cached. On web it also keeps only features
  from z14 tiles (`feature._z`). The walk screen tags them with the build from
  `ensureTileBuild()`, never `'unknown'`, and runs once per 100 m actually moved,
  one run at a time.

## Tiles decoded in code

- **Tiles decoded in code** (`tileDecode.ts`, `tileFetch.ts`; ambient hints, which
  brought them, were retired by explore): pbf 5 (`PbfReader`/`PbfWriter`, no
  default export) and @mapbox/vector-tile 3. Reads are all or nothing, 10 s per
  tile. `tile_url` is stored beside `tile_build` in `ensureTileBuild`. Decoded
  tiles give the same street ids as the map read (`mvtFixture.ts`, a test-only
  encoder, since the tile host is blocked from cloud sessions).

## Derivation

- **Streets are derived on the device** (`src/lib/streets.ts`), behind the replay's
  first beat (`snapWalk` in `src/lib/finish.ts`). The map's `collect(centers)` steps
  the camera at z14 behind a cover and reads the source features.

- Names live in the `transportation_name` layer, not `transportation`. OpenMapTiles
  `subclass` is the OSM highway value, so there is no `sidewalk` or `crossing`.
  Crosswalks are short footways (30 m or less) crossing a street.
- Tile simplification drops the shared node where straight streets cross, so
  junctions are found geometrically, including between lines of one MultiLineString
  and where a line crosses itself.
- **Segment ids must not depend on which tiles loaded.** Each line is clipped to its
  own z14 tile, which removes the buffer overlap. Copies are re-stitched on tile
  edges, pieces are cut only at junctions, then chunked from a canonical end. The id
  is class plus endpoints plus midpoint, because two pieces can share both endpoints
  (loops, divided streets). Pieces that run off the loaded tiles are dropped.
- Lines that overhang their home tile by more than 80 m are treated as untiled and
  split across every tile they cross. This is what keeps hand-made fixtures working.
- **Junction points are unprojected from the first line kept, not the first line read**
  (the fog streaks, Nov 1). The inverse scale once ignored that offset, so every
  inserted junction collapsed onto one spot whenever a crosswalk came first or the first
  line was stitched: straight 200 m bridges to one point, 10x the streets. Real tiles hit
  it on most multi-tile reads; hand-made fixtures rarely do. `STREET_CODE` (`tiles.ts`)
  drops the street cache once when derivation changes, and areas analyzed before
  `LANDING_CODE` l3 are left off the map. Real OpenMapTiles tiles for tests: tileserver-gl's
  `test_data.zip` release on GitHub has a planetiler Zurich mbtiles, reachable from cloud
  sessions.
- **Bridges and tunnels** (NB1-NB7, Nov 3). Only a bridge or tunnel leaves
  the ground (`levelOf`): a bridge at its `layer`, else 1; a tunnel at its
  `layer`, else 0 (mostly building passages). A `layer` on anything else is
  ignored: embankment roads carry one, and side streets end on them.
  - Lines on different levels meet only where one lands on the other: an end
    of it touches the other line, and that end touches nothing else on its
    own level. So a bridge joins its approach, a footbridge lands mid-street,
    stairs land mid-span. A path passing under, even split into two ways
    there, or a ground junction under a bridge, does not.
  - Crosswalk removal and stitching compare levels. Across levels, the
    sidewalk merge takes a footway only where it runs the street's way (35°),
    so an untagged bridge sidewalk goes and a path crossing under stays; a
    footway that landed on another level (`landings`) is never merged.
  - Junction keys are per line (`withJunctions` returns one set per line),
    so a line passing through another pair's junction point isn't cut.
  - The route graph merges a piece end only with another piece's end
    (`streetRoute.ts` `addEnd`), never an inner vertex.
  - `STREET_CODE` 3 purges the cache once. Real Zurich tiles (9 z14 tiles):
    about 180 fewer pieces of 22,300, the main network unchanged, and
    identical ids with the tags stripped.
  - **A route starts on the street you walk along** (`streetRouteSource`
    `join` with `RouteHint.heading`, from `live.heading`): within
    `NAV.headingJoinM` (12 m) of the nearest street, one within 35° of the
    heading wins. On a bridge, the path below can be the nearer line.
  - **After the audit (Nov 3):** 11 findings, 7 fixed (`bridges audit N` in
    `bridges.test.ts`). Deferred: a 200 m chunk end on a bridge within 3 m
    of a junction below still merges with it (`MERGE_M`); the 12 m heading
    window can pick a parallel street at an alley mouth (first leg only);
    indoor `level` is not read.
- Avoid anything O(n²) over features. Index with `EdgeGrid`. A 3.6 km downtown, about
  16k features, should derive in under a second.
- Snapping ignores the 20 m at each end of a piece, where the junctions are, and
  credits pieces of 40 m or less only if the trace ran down their middle.
  `WALKED_THRESHOLD` (0.5) is still an open product decision.
- **Walking along, not across** (the owner's call): a sample only counts where
  the trace runs within 35° of the street's direction, using the trace's heading
  over 10 m either side, so crossing at a corner credits nothing. A named street
  counts only once about a block of it was walked (`STREET_MIN_M` 80 m, or 80%
  of a shorter street). Until then its pieces stay fog. "Streets walked" and
  "new streets" count named streets only. Changing these rules means bumping
  `SNAP_RULES` in `tiles.ts`, which marks every walk to re-snap when its replay
  next opens.
