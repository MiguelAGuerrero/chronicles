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
    loop and reads the end over the start, and pictures Pause with the dot and the end both on the map.
  - Since `tend map T50` (decision 0244) a loop's two ends within one marker's diameter on screen (22 px,
    `endsTogether` in `lib/traceEnds.ts`, at the map's `view` zoom) are one mark: the start leaves the `ends` source
    and is drawn as a halo round the end's bullseye (`ENDS_LOOP_PAINT`, `endsLoopGeoJSON`: its own `ends-loop` source
    and layer, under `ends-ring`, with the trace's opacity), 3.5 px of white between the end's walked ring and the
    start's green, since the two colours are near one grey (1.2:1). Sent again only when the zoom flips them between
    one mark and two; `data-ends` still names both points, `data-ends-together` says which. A pin's stalk still stops
    at the two 11 px discs, not the halo's 17 px (DEFERRED).
  - Since `tend map 13` (decision 0172, O13) a pin standing on a start or end stops its stalk at the marker's edge:
    `stalkLift` (`lib/pins.ts`, core; `END_MARK_R`, 11 px, held equal to `ENDS_RING_PAINT`'s outer radii) says how far
    the foot rises, on screen at the map's zoom and bearing, for a pin whose whole stalk (`PIN_STEM`, the stem's 8 pt
    above the foot) crosses a marker, not its foot alone (`tend map audit 33`). Both maps draw the lift as padding under the pin, never as
    an offset, so the marker stays anchored at its point and the pin's target still covers the marker (the markers take
    no tap). The web re-measures on `zoom` and `rotate` and writes only a change; native reads `view` and the settled
    bearing (unverified on a device). No lift while the markers are hidden with the trace.
  - **Trap: an e2e Pause during a short walk's path beat.** The path beat of the `qol` loop (60 m) runs in about a
    second; a Playwright `click` (it waits for the button to hold still) took 140 to 780 ms and a poll of round trips
    missed the moment, so the dot was on the end at Pause. Wait in the page (`waitForFunction`, `polling: 'raf'`) and tap
    the button's box with `mouse.click` (`tend map 12`).
  - Since `map-palette` (decision 0188, T22 answered) the walked colour is the ink `#5b5d9f`, apart from the accent:
    the end's centre and ring are no longer "the walked orange", and the lines above that say T22 is open read so. The
    trace's white edge is `TRACE_EDGE_OPACITY` of the trace's own opacity on both maps.
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
- **Since `tend walk-screen 5`** (decision 0172, O21) Locate's timeout, or no location at all, says "Couldn’t find
  your position. Try again in a moment." in the quiet notice's tone, not red, so the screens' live regions say it. A
  quiet tone is no longer a refusal: `LocateError.refused` is (`locate/notice.ts`), which Explore reads to hold Find
  me back; never test the tone for it.
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
