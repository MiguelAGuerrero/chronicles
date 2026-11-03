---
paths:
  - "src/lib/areas/**"
  - "src/lib/{places,backlog}.ts"
  - "src/components/StarView.tsx"
  - "scripts/build-boundaries.js"
  - "assets/boundaries/**"
  - "src/lib/__tests__/{areas,places}.test.ts"
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
- **Natural Earth's 50m admin-1 is too coarse.** It leaves Manhattan, Hoboken
  and Miami Beach outside every state. The shipped US pack is built from the
  10m edition (577 KB). Rebuild it with
  `node scripts/build-boundaries.js <ne_10m_admin_1_states_provinces.geojson> US assets/boundaries/us.json`
  (GitHub's raw host for `nvkelso/natural-earth-vector` is reachable from
  cloud sessions; naciscdn.org is not).

## Home is the places map

- **Home is the places map** (the owner's call, v0.5; the log screen is gone).
  `src/app/(tabs)/chronicle.tsx` (the Chronicle tab, once the home) shows stars where walks were, at the level for the zoom
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
