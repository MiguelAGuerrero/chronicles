# Discrete navigation: the plan

For the owner to review before any code. The criteria are in `spec.md` (DN1-DN13).

## What exists

- Explore (`src/app/(tabs)/index.tsx`) has one small `WalkMap` over a grid of tiles. `selected` (ring, name in the accent colour, tile marked) and `open` (the card) are set together by `pick()`. A town's page is `townSeen`, entered with `enterArea()`, which frames the town.
- `WalkMap.web.tsx` builds maplibre-gl with `dragPan` on, its own long press and tap timers, and `dragRotate` off. `WalkMap.native.tsx` uses MapLibre RN v11, whose `Map` takes `dragPan?: boolean` (`node_modules/@maplibre/maplibre-react-native/lib/typescript/module/components/map/Map.d.ts:267`).
- The map's bearing is already in Explore's state (`bearing`, for the compass).

## Design

1. **The decision, pure (`src/lib/atlas/snap.ts`, `@layer core`).**
   - `swipeHeading(dx, dy, bearing)`: the compass heading a drag points to, as a pan would move the map. The target lies opposite the finger's travel on screen, then the screen angle is turned by the map's bearing.
   - `nextArea(from, candidates, heading, { coneDeg: 45, last })`: the nearest candidate whose bearing from `from` is within 45° of `heading`, or null (DN2, DN4). If `last` holds the previous step and the heading is within 45° of its reverse, that step's origin comes back first, when it is still listed (DN5).
   - `SNAP_STEP`: `minSwipePx: 24`, `coneDeg: 45`.
   - Which list a swipe walks (DN7, DN8) is a small pure function too: `snapScope({ town, selected })` returns `'neighborhoods' | 'towns'`.
2. **The map reports swipes (`WalkMap` web and native, `components/map/types.ts`).**
   - A new prop, `onSwipe?: (dx: number, dy: number) => void`. When it is set, the map no longer pans by one finger. Web sets `dragPan` off and native `dragPan={false}`. The map reports a single-pointer move of at least 24 px when the pointer lifts, unless the move was a long press, two fingers or a pinch.
   - Web: the pointer is tracked on the existing `mousedown`/`touchstart` → `mouseup`/`touchend` path, beside the long press, so a hold never becomes a swipe. maplibre's `keyboard` handler is turned off. A keydown on the map's container sends arrows as swipes and `+`/`-` as zoom (DN11).
   - Native: a `PanResponder` on the wrapping View captures single-touch moves past the threshold. Pinch, rotate and long press stay with MapLibre's own recognizers.
   - Every other screen passes no `onSwipe`, so it keeps `dragPan` (DN13).
3. **Explore uses it (`(tabs)/index.tsx`).**
   - `onSwipe` → `swipeHeading` → `snapScope` → `nextArea` over the page's points (neighborhoods), or over `allTowns` with the open town as the origin.
   - A neighborhood step sets `selected` only, never `open` (DN6). The camera eases to the area's point at the current zoom (`mapRef.showPoint`, which already respects reduced motion), and the step goes in a `last` ref for DN5. `AccessibilityInfo.announceForAccessibility(name)` covers DN12.
   - A town step calls `enterArea(town)` (DN8). The `last` ref holds the town before, so the reverse swipe goes back to it.
   - The grid's `ScrollView` gets a ref. Each tile reports its `y` with `onLayout`, and a step scrolls the selected tile into view (DN6).
   - `onPress` on the map, away from a point, clears `selected` and `last` as well as `spot` (DN9).
   - `pick()`, `leave()` and blur clear `last`, so the trail never outlives what it was for.

## Tests per criterion

| Id | Test |
|---|---|
| DN1 | e2e `snap`: "DN1: a drag that points at no area leaves the map's centre where it was" (`data-center` before and after) |
| DN2 | `snap.test.ts` "DN2: a drag left goes east, up goes south; turned 90° it follows the map"; "DN2: only areas within 45° count, the nearest wins"; "DN2: under 24 px is not a swipe"; e2e `snap` "DN2: a drag left selects the neighborhood to the east, and the map centres it" |
| DN3 | `snap.test.ts` "DN3: with nothing selected, a step starts from the map's middle" |
| DN4 | `snap.test.ts` "DN4: nothing that way returns null"; covered on screen by DN1's e2e check |
| DN5 | `snap.test.ts` "DN5: the opposite swipe returns where it came from, though another is nearer" |
| DN6 | e2e `snap` "DN6: a swipe selects, the card stays closed, the tile is marked and in view" |
| DN7 | `snap.test.ts` "DN7, DN8: the page near you steps neighborhoods; a town's page steps towns until one of its neighborhoods is selected" |
| DN8 | the same unit test; e2e `snap` "DN8: on a town's page a swipe opens the next town, and the opposite swipe brings the first back" |
| DN9 | e2e `snap` "DN9: a tap on the map clears the selection" |
| DN10 | e2e `snap` "DN10: the wheel still zooms; the long press still offers What's good here"; the compass is still checked by `qol` and `ready` |
| DN11 | e2e `snap` "DN11: ArrowRight on the focused map selects the area to the east; + zooms in" |
| DN12 | e2e `snap` "DN12: a swipe announces the area's name" (react-native-web writes the announcement to its live region) |
| DN13 | e2e `snap` "DN13: Navigate's map still pans by a drag"; `ready` and `replay` unchanged |

The e2e's fake world gets a few more neighborhoods and a second town around Fox Point, only in the `snap` journey (behind a flag, like `serveDivisions`), so other journeys' tile counts don't change. The journey gets a row in `scripts/e2e-scenarios.js` covering `src/app/(tabs)/index.tsx`, `src/lib/atlas/snap.ts` and `src/components/map/WalkMap.web.tsx`.

## Data

- None. No truth, no cache, no migration, no `ATLAS_CODE` bump (nothing a read keeps changes).

## Deferred

- **A bounce at the edge** (DN4): with nothing that way the map stays still, and there is no rubber-band feedback. It can be added if stillness reads as broken.
- **A fling's speed** doesn't choose how far to go: one swipe is always one step.
- **Towns on the page near you** stay tiles: swipes there move between neighborhoods only (the owner's call).

## Native, never run on a device

- `dragPan={false}` on MapLibre RN, the `PanResponder` swipe beside MapLibre's own pinch, rotate and long press recognizers, and the announcement. These go in `docs/NATIVE_UNVERIFIED.md`.
