---
paths:
  - "src/lib/landing/**"
  - "src/components/LandingMarks.tsx"
  - "src/lib/__tests__/{landing,landingView,landingWalk}.test.ts"
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
- **The analysis** (`landing/analyze.ts`, pure) finds hotspots by density
  only: the eight scan categories, weighted.
  - **Strips:** a named street's frontage places (within 30 m), linked place
    to place no more than a block (80 m) apart, measured by their joining
    tree, so bends, loops and same-named streets work. A strip needs ≥5
    places, ≥1 per 40 m, over ≥200 m.
  - **Pockets:** places with ≥4 weight within 100 m, linked the same way;
    ≥8 weight, spanning ≥200 m.
  - **Naming:** a pocket takes its heaviest strip, else its neighbourhood,
    else "A busy pocket".
  - **Landing:** a station by the pocket lands on the pocket's own street,
    else the strip's busiest point, else the densest place. A landing snaps
    at most 150 m.
  - **Fallbacks** (main roads, main-street names from `mainStreets.json`, the
    centre) apply only with nothing dense.
  - Bucketed lookups: 5,000 places in about 0.2 s on a desktop.
- **Hotspots are magenta** (`HOTSPOT`), the one hue no other layer uses;
  the pin is `HOTSPOT_PIN` for AA text. Remembered areas
  (`landing` store: SQLite migration 7, IndexedDB v6) are a cache kept across
  builds and drawn dimmed when stale (`LANDING_CODE`, bumped by hand). An area
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
  to the app's own decoder; the base map still uses the GeoJSON style.
- **Native** (unverified on a device): layer order (no `beforeId` yet), markers,
  migration 7.
