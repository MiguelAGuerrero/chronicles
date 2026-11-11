---
paths:
  - "src/lib/areas/**"
  - "src/lib/{places,backlog}.ts"
  - "src/components/StarView.tsx"
  - "scripts/build-boundaries.js"
  - "assets/boundaries/**"
  - "src/lib/__tests__/places/**"
---
# Places and areas

Placing walks in neighborhoods, towns, cities and states (`lib/areas`), the boundary pack, and the home as the places map (stars, placing old walks). The codemap is in `docs/ARCHITECTURE.md`; the decisions and their history are in `docs/decisions/`.

## Areas

- **No dataset is hard-coded** (the owner's rule). `src/lib/areas/assign.ts`
  knows only two interfaces from `areas/types.ts`:
  - `PlaceCandidate`: a named point with a level and a reach.
  - `BoundarySource`: which country and state contain a point.
  Datasets reach it through adapters:
  - Map tiles go through `tilePlaces.ts`, the only file that knows the
    OpenMapTiles place classes.
  - Outlines ship in the app's own boundary-pack format (`boundaryPack.ts`).
    `scripts/build-boundaries.js` builds one from Natural Earth; another dataset
    gets its own script that writes the same pack.
  Area keys are level + name + parent key, never a dataset's ids. Tests run the
  assignment against in-memory sources, and only adapter tests touch real data.
- **One model on both platforms.** `Area` and `WalkArea` are cache, stored
  through the shared `Db` interface: SQLite migration 5 on native, IndexedDB
  v4 on web. They are written with the walk's snap in one transaction. Areas no
  walk refers to are dropped. Offline, a walk keeps its old rows. The view
  must read only walks, summaries, `Area` and `WalkArea`, never traces or media.
- **Placement.** The active trace (the filter applied, no pauses, gaps or
  standstills) is cut into 50 m pieces. Each piece counts for the nearest place
  within reach at each level: neighborhood 1 km, town/village 3 km, city
  10 km. Between a town and a city, the closer for its size wins.
  - States come from the boundary pack. A point within 1 km outside every
    outline (a pier) takes the nearest state. Without a pack, the tiles' state
    points stand in.
  - Town and city points rarely lie in a walk's z14 street tiles, so
    `collectPlaces` reads the place layer at z10 (`PLACES_ZOOM`) around the walk.
  - Changing `AREA_RULES` or a pack's edition re-places every walk through the
    `snap_rules` meta.
- **Town outlines decide first** (TO1-TO12, decision 0083; `AREA_RULES` 2).
  A piece's town is the smallest Overture locality outline holding it
  (`townAt` in `areas/outlines.ts`); only where no outline read covers the
  point does the nearest point win. Where the tile under a point was read, a
  town whose outline misses it is never taken by its point (that was the
  Whitehall/Catasauqua bug). A neighborhood point counts only inside the
  piece's town outline (`hoodAllowed`).
  - **Sources:** `areas/divisionTiles.ts` is the only file that knows
    Overture's schema (`division_area` subtype `locality`, class not
    `maritime`; `division` points joined by `division_id`). `withOutlines`
    joins a label point to its outline when the point is inside it (or
    beyond the tiles read, within 3 km), keeping the label point, so stars and
    keys stay put; an outline-only town gets Overture's point, else the
    middle of what was read.
  - **Reads:** z12 tiles under the points, at most 12 (`outlineTilesFor`),
    through `outlines` (`outlineReader.ts`). Each tile is kept in
    `outline_tile` (derived, migration 16, IndexedDB v14) and never read
    again; the release is not in the rules tag, so a new edition alone
    re-places nothing.
  - **Retry:** a walk whose tiles failed is saved by points with
    `placesRead` false (`placesRead()` in `assign.ts`), so it is placed again;
    one wider than 12 tiles (`tooMany`) is placed by points for good.
  - **Drawing** (TB1-TB9, decision 0088): borders come from the z10 tiles
    (`outlines.borders`, `BORDER_ZOOM`), whole towns; deciding stays on z12.
    The tinted town is matched to the decided one by the source's id.
    `outline_tile` keys are `z/x/y` (migration 18, IndexedDB v15).
  - **Wards are not towns** (fix ward-subdivision; `AREA_RULES` 3, `ATLAS_CODE` a6):
    Overture files Allentown's "10th Ward" as a `locality` under the city, so
    every `locality` was a town. `outlineTileFrom` finds a locality whose
    hierarchy has another locality above it, unless Overture classes it a
    settlement (`city`, `town`, `village`) or gives it a population (Manhattan in
    New York, Coplay in Whitehall stay towns). The hierarchy rides on the
    `division` point, which is often in another tile than the piece, so the
    reader remembers the ward ids in meta `outline_nested` and filters every
    kept or fresh tile with them (`withoutNested`); a ward whose point tile has
    not been read yet leaks until it is. Kept tiles carry the decoder in their
    `release` (`stampRelease`, `OUTLINE_DECODE`); one without it is read again,
    so bump `OUTLINE_DECODE` when the decoder's output changes. A dropped ward is
    not a neighborhood either: neighborhoods come from the map tiles' place
    points only. An unclassed, unpopulated village inside a township (Deer
    Park, IL) is dropped too (the owner accepted it; `docs/DEFERRED.md`).
  - **Hamlets inside a town are neighborhoods** (whole-towns audit 7, decision 0128; `AREA_RULES` 4): `finish.ts` adds
    `hamletsFromTiles` to the candidates, and `hoodAllowed` takes a hamlet only inside the outline that decided the
    piece's town (never by a town's point, never out of town), so a hamlet listed on Explore's town page is walked too.
  - **Traps:** outlines are clipped at tile edges, so "not inside" means
    something only where the point's own tile was read (`coveredBy`).
    Of nested outlines the smaller wins by area of the pieces read (Midtown
    is Manhattan, not New York). Real fixtures: `__tests__/places/townOutlines.json`
    (`scripts/fixture-outlines.mjs`). Overture's bucket is reachable from
    cloud sessions.
- **Natural Earth's 50m admin-1 is too coarse.** It leaves Manhattan, Hoboken
  and Miami Beach outside every state. The shipped US pack is built from the
  10m edition (577 KB). Rebuild it with
  `node scripts/build-boundaries.js <ne_10m_admin_1_states_provinces.geojson> US assets/boundaries/us.json`
  (GitHub's raw host for `nvkelso/natural-earth-vector` is reachable from
  cloud sessions; naciscdn.org is not).

## Home is the places map

- **Home is the places map** (the owner's call, v0.5; the log screen is gone).
  `src/app/(tabs)/index.tsx` (the Chronicle tab, the home again since 0112) shows stars where walks were, at the level for the zoom
  (`levelForZoom`: neighborhoods from z11, towns from z6, states below, and
  countries below z3 once two countries are walked). Stars merge within 44 px,
  and all are one size. A bottom sheet (`HomeSheet`, built on Animated and
  responders, no library) peeks with a Walks | Days switch (no counts, U8,
  U13) and opens to the
  walks list or a place's walks. Start floats above it.
  - Walks with no places are placed in one pass behind a cover
    (`placeAll`); a failure waits for the next launch.
  - It reads only walks, summaries, `Area` and `WalkArea` (`places.ts`), never
    traces or media. Keep it that way.

- **Placing old walks** happens in `lib/backlog.ts`, the home's one read of
  traces.
  - It runs in one pass, and every map read in it times out.
  - It needs a known tile build to start.
  - A walk counts as tried only once its placing begins. Leaving the screen
    or tapping Skip stops the pass after the walk at hand.
  - A walk is "placed" once snapped under the current rules, even with no
    rows to show. A partial street read (`complete: false`) is not done.
- The map refits only when the places walked change, never just because the
  screen came back into focus, so a replay keeps the user's view.
- **Stars:**
  - A merged star zooms in to its places' points. A single star is selected
    (ringed) and eased above the sheet with `showPoint`.
  - The 8 busiest single stars show their name.
  - A walk with no town is "Elsewhere in" its state, at town and
    neighborhood zoom.
