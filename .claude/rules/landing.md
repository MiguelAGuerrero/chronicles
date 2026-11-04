---
paths:
  - "src/lib/landing/**"
  - "src/lib/activity/**"
  - "src/components/LandingMarks.tsx"
  - "src/lib/__tests__/{landing,landingView,landingWalk,activityDensity}.test.ts"
---
# Landing

What's good here (`lib/landing`): reading an area, finding busy strips and pockets, drawing hotspots, and the on-walk chip and dead-zone pill. The codemap is in `docs/ARCHITECTURE.md`; the decisions and their history are in `docs/decisions/`.

- **What's good here** (a home long press from z10): `landing/read.ts` reads
  the area with the tile decoder, with no camera moves, on both platforms.
  - A z11 read finds the towns, and the nearest town or city within 1.5 km
    becomes the centre (never a village, and never one so far that the press
    falls outside the read).
  - It then reads the z14 tiles of 1.5 km around the centre.
  - Cancel aborts the fetches and keeps nothing.
- **Activity density** (AD1-AD16, decision 0080; supersedes L4 and L5's fixed
  thresholds). Busy means a density of places, never foot traffic.
  - **What counts** (`activity/weights.ts`, the one table for both sources):
    full for shops, food, drink, attractions; half for services, health,
    civic places, worship, parks; a quarter for offices and vehicle services;
    nothing for ATMs, parking, stops, schools. Unnamed OSM places count. The
    marks table in `discovery/tilePois.ts` is separate and unchanged (AD2).
  - **Sources** (`activity/points.ts`): `activityFromTilePois` (OSM) and
    `activityFromOverture` (confidence ≥ 0.8, not closed), merged by
    `mergeSources`: a named OSM place and an Overture place of the same name
    (or one name inside the other, 6+ letters) within 60 m are one.
  - **Overture** (`activity/overture.ts`): the newest release in the bucket's
    listing, checked at most daily (meta `overture_release`,
    `overture_checked_at`; a failed check waits 10 min). A release that
    answers 403/404 is passed over for the one before (`newestRelease`'s
    skip set). Any failure returns `null` and the read goes on from OSM
    alone. Places are never stored. Quiet walks' reads ask Overture for
    nothing (`readAround`'s `withOverture`).
  - **`OvertureReader`** (`activity/reader.ts`, a shell given its archive
    and decoder, tested with fake archives) is the robust part, because pmtiles' header fetch takes no
    signal and pmtiles keeps a failed header for good: each tile loads once
    per release (`TileMemo`) under its own timeout and abort; a reader stops
    waiting at its own deadline or `shouldStop`, never aborting a load
    another reader shares; any load failure drops the archive so the next
    read opens it afresh; the memo holds only places that count.
  - **Layers:** `weights.ts`, `points.ts`, `release.ts`, `grade.ts` and
    `spatial.ts` are core; `reader.ts` and `overture.ts` are shells (timers,
    held state, the db); `useOvertureRelease.ts` is a view.
  - **Staleness:** screens judge it with `useOvertureRelease()` (checked on
    mount), never a bare `knownRelease()`, which is null on a cold start. A
    read without Overture never replaces a row or profile measured with it
    (`replacesRow`, `keptProfile`).
  - **Density** (`landing/grade.ts`): each place snaps to its nearest named
    street within 40 m (a corner place is its nearest street's; a place on
    a cross street's line is the cross street's). Streets with places are
    sampled every 10 m along each line, however its vertices fall; a sample
    within 2 m of one already taken on the street is skipped (joints, a
    piece given twice). A sample sums `weight × (1 − d/120)` over the
    same-named street's places within 120 m. Lengths (busy streets,
    pockets) are `runLength`: samples thinned to one per 30 m, then their
    joining tree, so two carriageways measure as one street.
  - **Grades** are fractions of the read's high point (the density beaten by
    only 5% of sampled length where any place is felt): strong ≥ 0.7, medium
    ≥ 0.4, faint above the floor (2). Medium and strong also need 3 and 4, so
    one small cluster is never strong. Scale-free once these minimums are
    cleared; the fringe where density fades past the floor reaches a little
    further with more places (AD10's test compares 2× with 8×).
  - **Busy streets** (`Strip`): one name at medium or above, linked within
    25 m, at least 120 m long, heaviest first. **Pockets**: medium-or-stronger
    samples of any street linked within 80 m, together 200 m or more, named
    for their heaviest busy street, else the neighbourhood, else "A busy
    pocket". `graded` keeps every stretch per street and grade, for drawing.
  - **Landing:** a station by the top pocket lands on its own street, else
    the top busy street's peak, else the pocket's densest sample. A landing
    snaps at most 150 m. **Fallbacks** (main roads, `mainStreets.json`, the
    centre) name the landing only with no busy street or pocket; the graded
    stretches still draw (activity-density audit 1).
  - **Tests:** synthetic shops sit 8 m off their street and clear of corners,
    or a cross street takes them. `phillipsburg.json` is Overture's real
    places and streets around downtown Phillipsburg (release 2026-10-21.0,
    `scripts/fixture-overture.mjs`); South Main Street must grade (AD11).
  - 15,000 street pieces and 5,000 places measure in well under a second on
    a desktop.
- **Hotspots are magenta** (`HOTSPOT`), the one hue no other layer uses, in
  three grades (`HOTSPOT_GRADES`: width and opacity per grade, every grade
  3:1 on the base map and a road (L9); stale areas at 0.45 of the opacity).
  The atlas's mini-map dims a ring measured with another release. Areas analyzed before grades draw their strips as
  medium. The walk map's container carries `data-graded` for the e2e;
  the pin is `HOTSPOT_PIN` for AA text. Remembered areas
  (`landing` store: SQLite migration 7, IndexedDB v6) are a cache kept across
  builds and drawn dimmed when stale (`LANDING_CODE`, bumped by hand; l4 is
  activity density). A row measured with another Overture release, or
  without one while a release is known, is stale too (`isStale`). An area
  centred within 1 km of a remembered one replaces it. Markers are rebuilt only
  when areas change, never per zoom. A strip's name keeps 80 m from the pin.
- **Busy areas are information only** (the owner's call, Nov 1): no Start here
  pin, no card, no Walk the loop (L10, L13, L16 retired by explore).
  `analysis.landing` is still computed and stored; nothing draws it.
- **On the walk** (slice 3, `landing/walk.ts` pure), only while exploring:
  - **Chip:** "On <strip>" goes on at 30 m and off past 45 m (`stripAt` with
    the current strip).
  - **Dead-zone pill:** nothing is read from storage until it could fire
    (`deadZoneDue`). It doesn't count paused time, shows only when no card,
    route or settings panel is up, never on a quiet walk, and is spent only once seen.
  - Remembered areas of the current rules are read again on returning to the
    front.
- **The trace hides while navigating** (the owner's call, Nov 2: an indoor
  jumble buried the route back). It is still recorded and comes back when
  navigation ends.
- **The e2e serves its fake world as real vector tiles** (`scripts/mvt-encode.mjs`)
  to the app's own decoder; the base map still uses the GeoJSON style. Its
  fake Overture is a PMTiles archive (`scripts/pmtiles-encode.mjs`) served by
  byte range, with Brook Street's places only there.
- **Native** (unverified on a device): layer order (no `beforeId` yet), markers,
  migration 7, and activity density's native paths (`docs/NATIVE_UNVERIFIED.md`).
  The native map's credits don't name Overture (deferred).
