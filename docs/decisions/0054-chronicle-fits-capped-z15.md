# 0054. Chronicle's fits are capped at z15

Date: 2026-11-02 · Status: accepted · Area: tabs, map

## Context
The second batch of the tabs audit (U5-U15, audit 6; the owner's calls, Nov 2). A fit to one place zoomed in too close.

## Decision
Chronicle's fits are capped at z15 (U15, `FIT_MAX_ZOOM`). Native widens the bounds instead (`capFitBounds`), for every fit (default z17, as web).

## Consequences
- `fitMaxZoom` goes to fitBounds on web; MapLibre RN's fitBounds has none.
- The walks list zooms out only when the view doesn't already hold every place (`lib/zoomOut.ts`).
- Native unverified: `capFitBounds` on MapLibre RN's fitBounds.
