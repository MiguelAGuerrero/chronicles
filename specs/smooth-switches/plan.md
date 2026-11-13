# Plan: Smooth neighborhood switches (SS1-SS10)

The owner reviews this before any code. The numbers come from the fresh agent's investigation (Nov 13). Its probe (a small town, five neighborhoods 0.9-1.3 km from its point and one 2.4 km out, each with a short shopping street, the Busy layer on, zoom 14.5, five switches forward and five back) becomes the slice's journey.

## Files and what changes

**The outline (SS1, SS2)**: `src/lib/areas/useHoodGround.ts`.
- **Compute after the settle.** The outline is derived in an effect once the camera has settled. Explore passes the same `stillness` it gives the Busy layer, so the derivation leaves render.
- **Keep what was derived.** Derived outlines are kept for the screen's life, keyed by the neighborhood, the number of tiles it was read from and the candidates. A revisit takes the kept outline at once.
- **The cache rule is core** and tested: `groundKey` and a bounded `keepGround` in `areas/hoods.ts`, 24 entries, oldest dropped first.
- **No storage change.** The outline is still read only from kept tiles (HB12).

**The map's sends (SS3, SS5, SS6)**: `src/components/map/WalkMap.web.tsx` and `WalkMap.native.tsx`.
- **Lines and pockets** are sent only when `landing.graded` or `landing.pockets` change (identity), never because names were dropped. The `alternates` effect stops depending on `landing`.
- **Busy names** on the web:
  - Explore tells the map a switch's ease is starting (a `holdBusyNames()` on the map's handle, called by `selectKey` with the camera move). The map clears the names with one empty send.
  - The names are sent once at that ease's `moveend`, with the rooms worked out for the camera that settled.
  - Any other move (a drag, a zoom, a follow camera on the walk screen or Navigate) clears nothing (SS10). The existing `moveend` resend of rooms stays, sent only when the rooms changed.
  - A change of names while the map is still is sent at once, as now.
- **Native.** Native has no move-start/end rooms. It gets the same keying for lines, and names memoised on the names alone. Native has never run on a device.
- **Area markers** (web) are keyed by area, not by whether they are selected. A selection change re-renders the two roots whose look changed and rebuilds none.

**The Busy layer (SS4, SS7, SS8)**:
- **What is drawn on a town's page** (`atlas/carousel.ts`, core, `busyLinesAround`): the remembered areas near the town's point within its reach plus a ring, the same set for every neighborhood selected in it. A read still starts where the selected neighborhood is (`layerCentre` unchanged), so each neighborhood's ring is read (steward S3). A finished read adds its area to what is drawn, and nothing is removed while on the page. `busyNamesNear` keeps the names to the selected neighborhood's ring (EC7, audit 12 unchanged).
- **A read cut short** (`useBusyLayer.ts`) is marked tried only when it finishes or fails, never when a switch cancels it. The decision is core: `busyReadDue` gains `finished` in `layers/state.ts`.
- **Listing the remembered areas** happens at mount, after a read finishes and on `reload`, not on every centre change. The decision is core: `needsListing` in `layers/state.ts`.

**Explore** (`src/app/(tabs)/explore.tsx`): passes `stillness` to `useHoodGround`, and nothing else. The card, ring and name stay at the selection (the owner: not now).

**Data**: no truth, no cache store, no migration, no code bump. The outline cache is in memory, per screen.

## Tests per criterion

| Id | Test |
|---|---|
| SS1 | `places/hoodGround.test.ts` "SS1: a neighborhood's outline is kept by its key, tile count and candidates; a revisit takes it"; e2e `switches` "SS1: a revisit derives no outline" (`perfCount('hood:ground')` 0 on the way back) |
| SS2 | e2e `switches` "SS2: no outline is derived during a switch's camera move" (`perfMark` stamps against `mark:moved`/`mark:settled`) |
| SS3 | `map/busyNames.test.ts` "SS3: the lines' data is keyed by the lines, not the names"; e2e `switches` "SS3: a switch with the same lines sends no strips or pockets" (`setData:strips`, `setData:pockets` per switch) |
| SS4 | `explore/carousel.test.ts` "SS4: on a town's page the areas drawn are the same for every neighborhood, an outer one's included", "SS4: names stay near the selected neighborhood"; e2e `switches` "SS4: switching neighborhoods on a town's page keeps the same lines" (`data-busy` unchanged after every area was read) |
| SS5 | e2e `switches` "SS5: no busy name drawn mid-move; one names send at the settle" (`setData:busy-names` per switch: an empty one at the start, one full at the end; `data-busy-names` read mid-move) |
| SS6 | e2e `switches` "SS6: a switch rebuilds no area marker" (`marker:area` counts creations only) |
| SS7 | `layers/state.test.ts` "SS7: a read cut short is not tried; selected again it reads" |
| SS8 | `layers/state.test.ts` "SS8: the remembered areas are listed at the start, after a read and on reload only"; e2e `switches` "SS8: a switch lists no remembered areas" (`busy:list`) |
| SS9 | e2e `switches` "SS9: at 4x CPU a switch's long tasks inside the ease total under 100 ms and its worst frame is under 100 ms, revisits too" |
| SS10 | e2e `switches` "SS10: a zoom and a drag (Move map) clear no busy name" (`setData:busy-names` with no empty send, `data-busy-names` kept); e2e `walk` keeps DC16's names checks |

- **New journey `switches`.** The harness gains `smallWorld`, served only while the journey asks, like `snapWorld`. The journey goes on the `explore`, `layers` and `map` features, and the spec on `layers`.
- **SS9 is the measured target.** Before, it was 192-260 ms of long tasks and 117-147 ms worst frames. If the fixes can't reach it on Chromium's model of a phone, I'll come back to you with the numbers, not loosen it.
- **`scripts/perf-explore.js`** gets a revisit pass, so the dense-city numbers stay comparable.

## Screens and controls

No control is added or changed. What a person sees change:
- the names arrive once, at the camera's stop, where today they flicker in two or three times;
- on a town's page, lines no longer pop in and out between its neighborhoods.

No matrix row applies. The UI review (decision 0145) runs on the `switches` journey's shots after the switches.

## Deferred

- **The card, ring and name held until the settle** (the owner: re-measure first).
- **The "?" pins and area points as map layers**, still DOM markers (0160's deferral stands).
- **Native's names timing** (SS5 is the web's; steward S2).
- **The outline derived in a worker:** not needed if a settled, kept outline reads smooth.

## Native that will not run on a device

- The lines' and names' memo keys on MapLibre RN.
- `useHoodGround` waiting for the settle on native (no `stillness` source on native's map yet: it computes as soon as read, as today, cached).

Each gets a `docs/NATIVE_UNVERIFIED.md` item.

## Risks

- **Names at the settle only:** a reader swiping fast sees no names until they stop. That's your call, already made.
- **Lines held on a town's page** grow as its neighborhoods are read; on a big town that is more lines drawn than one neighborhood's (lines are cheap; names are bounded by EC7).

## Steward (Nov 13): 3 findings, all accepted

- S1: names would blink on every move of every map; only a switch Explore makes clears them (SS10).
- S2: SS5 says it is the web's; native's timing deferred.
- S3: a town-centred read could leave an outer neighborhood's far side unread; reads stay per neighborhood, only what is drawn is held around the town.
