---
paths:
  - "src/components/map/**"
  - "src/components/CompassButton.tsx"
  - "src/lib/{mapReads,useTabMap}.ts"
  - "src/lib/compass.ts"
  - "scripts/copy-maplibre-worker.js"
  - "src/lib/__tests__/map/**"
---
# Map

The map component (maplibre-gl on web, MapLibre RN on native), the reactivity budget and web memory. Icons and pins (a pin's head, bell and words, the map's palette, the pins near the view, taps, the selected star) are in `.claude/rules/pins.md`. The codemap is in `docs/ARCHITECTURE.md`; the decisions and their history are in `docs/decisions/`.

## maplibre-gl on web, MapLibre RN v11 on native

- maplibre-gl 6 loads its worker as a separate module, which Metro doesn't bundle.
  `scripts/copy-maplibre-worker.js` (postinstall) copies it into `public/`, and
  `setWorkerUrl('/maplibre-gl-worker.mjs')` points at it. Static hosts must serve
  `.mjs` as `text/javascript`. The worker URL is prefixed with `process.env.EXPO_BASE_URL`,
  so sub-path deploys work.
- On native, `queryRenderedFeatures` misses culled labels and unstyled layers. Query a
  `VectorSource` (with invisible layers so its tiles load) via `querySourceFeatures`,
  the same as `querySourceFeatures` on web.
- Calling `querySourceFeatures` on a source that doesn't exist logs an error instead
  of throwing. Check `map.getSource()` first.
- `fitBounds` is driven by a `fitKey` counter, not by the bounds array identity. On
  native, wait for `onDidFinishLoadingMap` before moving the camera.
- **The web map's credits start closed** (owner, Nov 4). maplibre's compact
  `AttributionControl` opens itself when its credits first fill in and closes
  only on a drag, which put a banner across the bottom of a phone's map.
  `ClosedAttribution` (`WalkMap.web.tsx`) closes it once, the first time it
  turns compact; the (i) button still opens it. Always add it yourself
  (`attributionControl: false`). The e2e's fake source carries an OSM credit
  so the control is drawn (`map attribution` checks in `qol`). Native's
  MapLibre RN `attribution` prop is its own (i) button, untouched.

## The compass (CP1-CP8, decision 0082)

- Two fingers turn the map (web: touch rotate with `dragRotate`, `touchPitch` and `pitchWithRotate` off; native: `touchRotate`, `touchPitch={false}`). `onBearingChange` reports a change of half a degree; the web also writes `data-bearing`. `resetNorth()` eases the bearing to 0 (`MOTION.camera`, instant when reduced) and keeps centre and zoom (web `easeTo`, native `setStop`).
- `CompassButton` draws only while `showsCompass(bearing)` (more than 1° off north). On the live walk it is the top of the column: the `compass` slot above Walk me back while that is shown, else Walk me back's own slot (so no gap and no other button moves); on the ready screen it sits above Locate; on Explore above Locate, only while focused. A map taken down and brought back opens north-up, so Explore resets its bearing state on blur.
- `fitBounds` keeps the current bearing in maplibre; never pass a bearing to a follow or a fit.
- The e2e turns the newest web map through `window.__turn(deg)`, defined only when `window.__perf` is (a two-finger gesture can't be made headless). The `ready` scenario sets `__perf` itself.
- **Trap: a follow jump cuts an ease** (tend map 15). maplibre's `jumpTo` starts with `stop()`, so the live walk's follow (each glide frame's `jumpTo({ center })`, and the recenter on a fix) cut the compass's ease to north after one frame. Both ask `followMoves` (`lib/compass.ts`), which waits while `northAsked` holds; a new camera move made in code while following gets the same gate. The `qol` step turns the walk's map with two real fingers (`twoFingerTurn`: `__turn` has no `originalEvent`, so following never stops) and taps the compass with fixes still coming. Native's follow has no such gate yet (`docs/NATIVE_UNVERIFIED.md`, Compass).
- tend map 15's precedent is recorded in `docs/research/adjacent-apps.md`, "Bring the map back to north while following" (Apple Maps, read Nov 18).

## Swipes instead of pans (DN1-DN13, decision 0092)

- `onSwipe` turns one-finger panning off for that map only (web `dragPan: false`, `keyboard: false`; native `dragPan={false}`); every other screen passes none.
- Web: the canvas and its container get `touch-action: none` inline, or a phone's finger would scroll the page (maplibre's class leaves `pan-x pan-y` with drag-pan off). A mouse drag is followed on `window` past the map's edge, and dropped when the window blurs or the button is found up (a lost mouseup, audit 10). **Trap:** with drag-pan off, nothing in maplibre swallows the `click` a drag ends with, so a drag marks `draggedAt` as soon as it passes 8 px (even one cut off) and the click handler skips it; without that, every swipe also fired `onPress`. Shift-drag (box zoom) and a touch within 500 ms of a tap (tap-drag zoom) are never swipes (`zoomStart`, audit 2). A swipe starts from the middle of the frame's padding (`fitPadding`), never the canvas's middle (audit 5). Arrow keys on the canvas (still `tabindex=0`, labelled "Map. The arrow keys move between areas.", audit 11) are swipes; `+`/`-` zoom around that same point.
- **Trap: an ease's `padding` stays on the map.** maplibre keeps `easeTo({ padding })` as the map's padding and adds it to every later fit's own. On Explore's 200 px map the two left no room: `cameraForBounds` found no camera, and the fit silently did nothing (after a neighborhood swipe, a town swipe tinted Catasauqua but never moved, the owner's iPhone, Nov 4; discrete-navigation fix 2). `showPoint` therefore eases with an `offset`, and the web map keeps no padding: anything that needs the framed middle reads it from `fitPadding`.
- **Trap: a resize mid-flight loses the fit's padding.** maplibre (6.16) lands a `fitBounds` whose canvas is resized while it flies at the bounds' own middle and a wrong zoom. An area's card folds the tabs away as it opens, so Explore's map grows during the card's fit: the area sat at the map's middle, not under the title (AT9, red since the storefronts slice made the card heavier; tend explore 17). The web map records the fit flying (`flight`, cleared on `moveend`) and asks it again at the new size on `resize` (`refitOnResize`, `atlas/fitFlight.ts`), counted as `refit`, never `fit`.
  - The record, its clear and the refit are one core step, `fitStep` (`atlas/fitFlight.ts`, tend explore audit 19), held in `fit` in `WalkMap.web.tsx`. A refit restarts the fit's settle (`settleAfter`, so `useTabMap` still redoes a fit left mid-flight). **Trap:** the refit's `fitBounds` stops the flight under way, which fires a `moveend` mid-air: every listener that reads a `moveend` as the map at rest (DC9's `onMoveState`, `track`, the storefront names' `again`, `northAsked`) returns early while `fit.current.refitting`. A new such listener does the same.
- Native: `createSwiper()`, a `PanResponder` on the wrapping View that captures a one-finger move past 12 px and reports it on release (the drag; the screen reads only its direction, so the camera centre and metres a pixel it also carries are dead payload, DEFERRED), never after a long press (`swiper.held()`) or with a second finger seen (`releaseSwipe`, audit 3) (unverified on a device).

## Town borders (TB1-TB9, decision 0088)

- `WalkMap`'s `borders` prop (`BorderView` from `areas/borders.ts`): one `borders` source, three layers (`border-fill` for tinted, `border-firm` for tinted and firm, `border-lined`), from `BORDER.minZoom` (8). On web the fill goes under the first base road layer (`source-layer` transportation, else the first line, else the first label) and the lines under the first label, over the streets, since a border often runs along a road (TB10: at 7% and under the streets the owner saw nothing on a phone); on native they are the first overlay (no road id to go below; unverified on a device).
- Explore frames the tinted town's whole border (`townFrame`, TB11) through one rule, `nextFrame` (`atlas/atlas.ts`): each visit to a page (near you, a town's; opening one or going Back starts a visit) frames its areas until its town's border is known (150 m around them near you; a town's reach on its page, where its point may be all that is listed), then the whole town, and nothing undoes that within the visit (areas listed later, the borders null while the tab is blurred, Locate, a pan, coming back into a town it framed). Two separate frame-once effects raced and the areas' won, so a town's page never showed the whole town (fix explore-fit-area, Nov 4; the e2e reads the view from `data-bounds`). A town selected in the row is framed again each time (`townPicked`, fix town-fit, Nov 13: a town selected twice kept the last town's zoom); it writes the visit's record, adding the town and never dropping one, so Locate back into a town framed earlier keeps Locate's frame (audit 1). **Trap:** the outline set a pick reads holds only the z10 tiles under you and the last selection, so a town in another tile is picked before its border is known; the record waits for it by the area's key (`awaiting`, matched to `litKey`), never by outline id (audit 2). **Trap (smooth-switches late border):** a town's border that arrives after the reader picked or selected an area framed the whole town over their pick (the `dense` journey's DC17, a third of runs once the slice shifted the timing). A pick, a selection and an opened card mark the visit `held` (`readerTook`); `nextFrame` then frames no town's border, but for a town picked before its border was known (`awaiting`). `useOutlineSet` retries a failed read every 30 s while mounted, and a z10 tile has 45 s (TB12).
- Data is sent again only when `borders.key` changes (the towns and their roles), never per fix or zoom; the web writes `data-borders` (`role:name|...`) for the e2e.
- Screens: Explore (`index.tsx`, yours tinted by `outlineIdHere`, the open town's by `outlineOf`), Chronicle (walked towns, `lined: false`), the walk screen (`firm` by `outlineIdAt`, no fill), the replay and a day (`useWalkBorders`). `BORDER` colours are held by `colors.test.ts` (TB8).
- The world's veil sits under the borders (decision 0199, the owner's answer to T33): on the web the veil is added before the lines, and `borderFillBefore` moves the fill over the veil while it is on (the replay, a day) and back under the first street when it is off; on native the veil mounts before `BordersSource`. Under the veil the edge read 2.2:1 and the tint 1.09 whatever the colour. `BORDER.color` is cocoa `#6e4f3f`, never the accent (0153).
- The borders go over the veil only where the screen asks (`bordersOverVeil`: the replay and a day, decision 0199), through `borderMoves` on the web (the veil under the lines, the fill between, at `borderFillOpacity`'s 0.11, the owner's "Lighten the fill on veiled maps") and mount order on native. The walk screen has no veil since its unwalked-streets button went (decision 0219), so tend map audit 39's case is gone.
- The borders' precedent (OpenStreetMap Carto, Positron, Organic Maps; decision 0199) is recorded in `docs/research/adjacent-apps.md`, "Draw a town's border on the map".

## Explore's dots (WT12-WT14, decision 0132)

- `waitingDots` is one `waiting-dots` circle layer (`WAITING_DOT_PAINT`, `waitingDotsGeoJSON` in `map/types.ts`), under the `marks` layer, on both maps: a feature's only property is its colour, so a dot carries no name, number, icon or id. Its edge is `WAITING_DOT_EDGE` (dark, 3:1 or more on the base map, a ring and a town's tint; `whole-towns audit 18` holds it). The web writes `data-waiting-dots` (positions only) for the e2e. A tap on a dot is the map's own `onPress` (no layer tap handler): the screen finds the dot within the press's reach (`dotAt`). Native's layer is unverified on a device.

## Distances in words (`lib/format.ts`)

- `formatDistance` and `formatRange` bind the figure to its unit with a no-break space (U+00A0, tend map 21), so no line ends on "175" with "m" on the next; a line that builds a distance itself binds it too, or better calls `formatDistance`, which also follows the units setting (tend map audits 44-46). A no-break space is fine in a spoken string (`accessibilityLabel`, `announceForAccessibility`, `accessibilityValue.text`): a screen reader says it as a space, so a spoken line keeps the formatter's words, not a plain-space copy (tend map audit 47; VoiceOver and TalkBack unverified on a device).
