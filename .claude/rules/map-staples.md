---
paths:
  - "src/lib/{traceEnds,scaleBar,useLocate}.ts"
  - "src/components/map/ScaleBar.tsx"
  - "src/components/LocateButton.tsx"
  - "src/lib/__tests__/map/{traceEnds,endsPaint,scaleBar,units,unitsStore,locationOff,pinThumb}.test.ts"
---
# Map: staples (start and end, the scale bar, Locate, a photo pin)

## Map staples (quality of life, QL1-QL12; Nov 3)

- **Start and end markers** (`lib/traceEnds.ts`, pure): every map that draws a
  trace marks the first point of the first run (a white disc, a ring in the
  trace's green) and, once the walk has ended (`ended` prop: the replay and the
  day replay), the last point of the last run (a ring in `COLORS.walked`). A live
  walk has no end marker; the dot is its end. One `ends` circle layer above the
  trace and under the walker and pins, with the trace's opacity (hidden while
  navigating). Its data is re-sent only when the ends string changes, never per
  publish. Chronicle draws no trace, so no markers. A walk begun on a ride is
  marked where the walking began (accepted).
  - Since `tend map T16` (decision 0154) shape tells the two apart, not colour alone: the start hollow (white,
    ringed in the trace's green), the end solid (filled in `COLORS.walked`, a white ring). One paint for both
    maps, `ENDS_PAINT` (`map/types.ts`). The `qol` journey reads both middles on the replay with the pins and the
    walker hidden: they are DOM markers standing over the end.
  - Since `tend map T25` (decision 0162) the end is a bullseye, so it differs in shape from the walker's solid dot
    too: a walked outer ring (`ENDS_RING_PAINT`, a second circle layer `ends-ring` on the `ends` source, filtered to
    the end and drawn first, with a thin white edge), then its walked centre and white band (`ENDS_PAINT`'s end
    branch). The start and the dot are unchanged; the end is the start's width, 22 px. Both layers take the
    trace's opacity. The `qol` journey reads the end across, at its band (5 px out) and its ring (8 px out).
  - Since `tend map audit 25` the start is drawn in `ends-ring` too, under the end's ring (`ENDS_RING_PAINT`
    matches on kind; the start is `endsGeoJSON`'s first feature), and `ends` is filtered to the end, drawing only its
    centre and band (`ENDS_PAINT`): a walk that ends on or near its start keeps its bullseye whole. The line above
    reads so: `ends-ring` is no longer filtered, and `ENDS_PAINT` has no branches. The `qol` journey walks a small
    loop and reads the end over the start, and pictures Hold with the dot and the end both on the map.
- **Scale bar** (`lib/scaleBar.ts`, pure; `components/map/ScaleBar.tsx`): the
  longest 1, 2 or 5 × 10^n metres within 100 px at the map's own `view` (zoom and
  latitude), in the bottom-left corner, as a sibling of the map inside the
  wrap View (never inside maplibre's own DOM). Decorative: pointer events off,
  hidden from screen readers (`aria-hidden`, so an e2e locator that skips hidden
  ancestors must allow the bar itself when reaching its line). Each screen keeps
  it clear of its bottom UI with `scaleInset`: the walk screen above the capture
  row (the map's bottom edge is the strip's top, so `insets.bottom` doesn't
  apply inside it), the tabs above the sheet at its current height, the replay
  above the card. Native's `view` updates every 0.25 zoom (the existing
  threshold), so the bar is coarser there.
- **Locate** (`lib/useLocate.ts`, `components/LocateButton.tsx`): a 44 pt edge
  button on Navigate (gone with a walk open) and Explore (gone under the long
  press's card), at the walk screen's Recenter look. A tap reads one **fresh**
  fix (`locateOnce(..., { fresh: true })`: `maximumAge` 0 on web, no fix
  stamped before the ask on native). Without `fresh`, a tap within 15 s of
  Navigate's focus fix got the browser's cached position (`LOCATE_MAX_AGE_MS`),
  and the e2e's 1 km move went unseen. The fix is kept as the last fix, the dot
  moves there, and the map fits 250 m around it; nothing tracks after. A second
  tap while busy does nothing. Denied says what the recorder's start says, with
  Open Settings on a phone; a timeout says "Couldn't find your position".
- **E2E:** `E2E_ONLY=qol` runs the slice's scenario alone (~30 s). The web map
  writes `data-ends`, `data-center` and `data-walker` on its container for it.
  The fit centres the fix in the view above the drawer, so the canvas's own
  middle (`data-center`) sits off the fix by the padding: the check is "inside
  the 250 m framed", never "at the middle".
- **Native** (unverified on a device): the `ends` layer's `match` stroke colour
  on MapLibre RN, the scale bar over the native map, `locateOnce` fresh on
  expo-location, the edge button over the native sheet.
- **The scale bar follows the units setting** (QL15, round 2): `scaleBar(mpp, maxPx,
  units)`; imperial picks feet in 1, 2, 5 × 10^n up to 2,000 ft, then miles. `meters`
  stays in metres, so the e2e's `data-m` is always metres. Both maps call `useUnits()`
  and pass it, so the bar redraws on a change.
- **No scale bar over a blank world** (`tend map T17`, decision 0154): Navigate and Explore pass `hideScaleOnBlank`; with
  no fix (`walker`) and nothing the base tiles drew in view, the bar is gone (`scaleShown`, `lib/scaleBar.ts`). Trap: an
  unfiltered `queryRenderedFeatures()` always finds the app's world-wide `veil` polygons, so the web keeps the base
  style's layer ids at `load`, before `addOverlay`, and queries only their fills (`blankLookLayers`, audit 15); native
  counts the `omt-query` source's roads, water and places (`drawnFrom`, audit 14). The e2e's fake streets draw at the
  world's zoom, so its blank world needs a style with no features (`qol`).
- **A photo's pin shows its small copy** (QL26, QL27): `pinThumb(pin)` (`lib/pins.ts`,
  pure) gives the copy's ref only for a pin of one photo, or since VT3 one video (its still), with a `thumb_path` other
  than `THUMB.none`, never `file_path`: a map never decodes full photos or plays a video. A video's pin wears
  `pin-video-mark` at the head's bottom right, clear of the stack, clock and bell corners, and is still labelled Video (VT4). `CapturePinView`
  resolves it with `useMediaUri` and draws a round `Image` (`pin-thumb`) inside a ring
  of the photo colour; the icon shows until it loads and comes back on error. The web
  markers' key and the native Marker keys include the ref, so a copy made after the
  pin was drawn replaces the icon (the rebuilt marker shows the icon for a moment).
  Memory pins pick up a copy made mid-walk only when their capture set changes
  (`memories.ts` sends only changed ids; deferred).
