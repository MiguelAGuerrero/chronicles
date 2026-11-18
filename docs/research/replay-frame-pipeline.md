# The replay's frame pipeline, measured

Nov 18, 2026. The owner watched a replay on the live site on an iPhone, in the browser: the map and walker stutter, the
walked line lags, cards and bubbles stutter, and it feels slow and heavy. Measured the same day on the web build
(`db8e8e3`) in headless Chromium, the processor slowed 4x and 6x to stand in for a phone, on the `replay` journey's
seeded walk, the path beat only. **Not an iPhone**: no WebKit, no real GPU (headless Chromium draws WebGL in software,
so the tables use a small canvas; at the phone's real canvas size every variant is bound by software GL), one fixture,
three runs a cell at most. The numbers say where the cost is, not what a phone does. The scripts and the two spikes'
patches are in `specs/replay-ceremony/spike/` (throwaway, never built into the app).

## Today (HEAD)

| slowdown | frames a second | clock ticks a second (30 meant) | screen renders a second | map `setData` a second | line's end / dot behind the camera |
|---|---|---|---|---|---|
| none | 60 | 30 | 38 | 109 | 3 / 0 px |
| 4x | 21-25 | 15 | 17 | 73 | 20 / 17 px |
| 6x | 15-18 | 11 | 11.5 | 49 | 34 / 29 px |

Where the script time goes at 4x: MapLibre 55% (its render 26%, GeoJSON round trips to its worker 25.5%), React's
render of the screen, the map component and the stage 26.5%, overlays 7.7%, formatting the time of day and a title that
only the card shows about 6%, the ceremony's own logic (`rhythmFrame`) 0.5%.

The causes, in order:
1. **GeoJSON sources are the animation channel** (`WalkMap.web.tsx`): six `setData` a tick, each a worker round trip and
   about five tile reloads. Four carry nothing in a replay (`cone`, `trace-link`, `rides`, `alternates`).
2. **MapLibre renders every tick**, forced by those source changes.
3. **One React state a tick at screen level** (`useCeremonyClock`'s 33 ms interval): the screen, `WalkMap` (73 hooks)
   and the stage all render.
4. **The dot is a GeoJSON layer and the camera a `jumpTo`**, so the dot trails the camera by a worker round trip; the
   follow effect skips moves under 2 px, so under a card the map steps about three times a second.

The pacing slice of the same day (replay pace, decision 0203) did not change the cost of a second: frames a second
before and after are the same within the runs' spread. It made the path beat 41% longer on this walk (25.0 s to 35.3 s)
and more than doubled the time under a photo card (5 s to 12 s), the dearest phase.

## Two spikes

- **A, stop the waste** (three files): never re-send an unchanged or empty collection; the time of day and the card's
  title not recomputed a tick.
- **B, a loop outside React** (A included): one `requestAnimationFrame` loop owns the time and applies each frame
  itself: the walker as the DOM marker the live walk already uses, `jumpTo` every frame, the walked line sent once and
  revealed by a paint property (`line-gradient` over `line-progress`, which works in maplibre-gl 6.16 and costs about
  1.6 ms a frame at 4x with no worker traffic), the screen rendered only when something discrete changes.

| | frames a second at 4x / 6x | full updates a second at 1x / 4x / 6x | script per update, 1x | `setData` a second | line's end / dot behind |
|---|---|---|---|---|---|
| HEAD | 24 / 15.5 | 30 / 15 / 11 | 7.1 ms | 109 | 20 / 17 px at 4x |
| A | 32 / 22.6 | 30 / 19 / 14 | 5.4 ms | 39 | 17 / 14 px at 4x |
| B | 32 / 22.6 | 60 / 32 / 23 | 3.2 ms | 0.2 | 0 / 0 px at every slowdown |

A is most of the frame-rate gain. B halves the script cost of an update again, doubles the updates and removes the lag:
the line's end, the dot and the camera are drawn in the same frame. B's cautions: it makes the map draw every frame, so
a phone's GPU decides its rate (unmeasured; plan a ceiling on frames a second), and it uncovers work the 2 px skip hid
(the pins' move listener reading layout on every move; the tile cover of about 30 sources). In the spike the overlays
still went through React in one leaf (21% of B's script time): the real build drives them without it.
