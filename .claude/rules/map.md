---
paths:
  - "src/components/map/**"
  - "src/components/{icons,CapturePinView,MarkPinView,CompassButton}.tsx"
  - "src/lib/{pins,mapReads,useTabMap}.ts"
  - "src/lib/compass.ts"
  - "scripts/copy-maplibre-worker.js"
  - "src/lib/__tests__/map/**"
---
# Map

The map component (maplibre-gl on web, MapLibre RN on native), pins and icons, the reactivity budget and web memory. The codemap is in `docs/ARCHITECTURE.md`; the decisions and their history are in `docs/decisions/`.

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

## Swipes instead of pans (DN1-DN13, decision 0092)

- `onSwipe` turns one-finger panning off for that map only (web `dragPan: false`, `keyboard: false`; native `dragPan={false}`); every other screen passes none.
- Web: the canvas and its container get `touch-action: none` inline, or a phone's finger would scroll the page (maplibre's class leaves `pan-x pan-y` with drag-pan off). A mouse drag is followed on `window` past the map's edge, and dropped when the window blurs or the button is found up (a lost mouseup, audit 10). **Trap:** with drag-pan off, nothing in maplibre swallows the `click` a drag ends with, so a drag marks `draggedAt` as soon as it passes 8 px (even one cut off) and the click handler skips it; without that, every swipe also fired `onPress`. Shift-drag (box zoom) and a touch within 500 ms of a tap (tap-drag zoom) are never swipes (`zoomStart`, audit 2). A swipe starts from the middle of the frame's padding (`fitPadding`), never the canvas's middle (audit 5). Arrow keys on the canvas (still `tabindex=0`, labelled "Map. The arrow keys move between areas.", audit 11) are swipes; `+`/`-` zoom around that same point.
- **Trap: an ease's `padding` stays on the map.** maplibre keeps `easeTo({ padding })` as the map's padding and adds it to every later fit's own. On Explore's 200 px map the two left no room: `cameraForBounds` found no camera, and the fit silently did nothing (after a neighborhood swipe, a town swipe tinted Catasauqua but never moved, the owner's iPhone, Nov 4; discrete-navigation fix 2). `showPoint` therefore eases with an `offset`, and the web map keeps no padding: anything that needs the framed middle reads it from `fitPadding`.
- Native: `createSwiper()`, a `PanResponder` on the wrapping View that captures a one-finger move past 12 px and reports it on release (the drag; the screen reads only its direction, so the camera centre and metres a pixel it also carries are dead payload, DEFERRED), never after a long press (`swiper.held()`) or with a second finger seen (`releaseSwipe`, audit 3) (unverified on a device).

## Town borders (TB1-TB9, decision 0088)

- `WalkMap`'s `borders` prop (`BorderView` from `areas/borders.ts`): one `borders` source, three layers (`border-fill` for tinted, `border-firm` for tinted and firm, `border-lined`), from `BORDER.minZoom` (8). On web the fill goes under the first base road layer (`source-layer` transportation, else the first line, else the first label) and the lines under the first label, over the streets, since a border often runs along a road (TB10: at 7% and under the streets the owner saw nothing on a phone); on native they are the first overlay (no road id to go below; unverified on a device).
- Explore frames the tinted town's whole border (`townFrame`, TB11) through one rule, `nextFrame` (`atlas/atlas.ts`): each visit to a page (near you, a town's; opening one or going Back starts a visit) frames its areas until its town's border is known (150 m around them near you; a town's reach on its page, where its point may be all that is listed), then the whole town, and nothing undoes that within the visit (areas listed later, the borders null while the tab is blurred, Locate, a pan, coming back into a town it framed). Two separate frame-once effects raced and the areas' won, so a town's page never showed the whole town (fix explore-fit-area, Nov 4; the e2e reads the view from `data-bounds`). A town selected in the row is framed again each time (`townPicked`, fix town-fit, Nov 13: a town selected twice kept the last town's zoom); it writes the visit's record, adding the town and never dropping one, so Locate back into a town framed earlier keeps Locate's frame (audit 1). **Trap:** the outline set a pick reads holds only the z10 tiles under you and the last selection, so a town in another tile is picked before its border is known; the record waits for it by the area's key (`awaiting`, matched to `litKey`), never by outline id (audit 2). **Trap (smooth-switches late border):** a town's border that arrives after the reader picked or selected an area framed the whole town over their pick (the `dense` journey's DC17, a third of runs once the slice shifted the timing). A pick, a selection and an opened card mark the visit `held` (`readerTook`); `nextFrame` then frames no town's border, but for a town picked before its border was known (`awaiting`). `useOutlineSet` retries a failed read every 30 s while mounted, and a z10 tile has 45 s (TB12).
- Data is sent again only when `borders.key` changes (the towns and their roles), never per fix or zoom; the web writes `data-borders` (`role:name|...`) for the e2e.
- Screens: Explore (`index.tsx`, yours tinted by `outlineIdHere`, the open town's by `outlineOf`), Chronicle (walked towns, `lined: false`), the walk screen (`firm` by `outlineIdAt`, no fill), the replay and a day (`useWalkBorders`). `BORDER` colours are held by `colors.test.ts` (TB8).

## Icons and pins

- Icons come from `@expo/vector-icons` (Ionicons), via `src/components/icons.tsx`.
  Every icon-only button needs an `accessibilityLabel`.
- On web, pins are maplibre-gl DOM `Marker`s whose content is rendered with
  `react-dom/client` `createRoot`, using the same `CapturePinView` as native.
  Unmount the roots in a `queueMicrotask`, because unmounting inside React's commit
  warns. Clicks look the pin up by id in a ref, so they never open stale captures.
- On native, pins are MapLibre RN `<Marker>` children. Use the Marker's own `onPress`:
  on iOS the annotation's tap recognizer swallows touches meant for a Pressable inside
  it.
- **The reminder bell** (RB1-RB7, decision 0078): a pin with a live reminder on any of
  its captures (`pinReminded`, `lib/pins.ts`) wears an ink disc with a white bell, the
  clock's size (`pin-reminder`), top right, top left on a faint memory pin (the clock
  keeps top right). Each map reads the reminders once with `useReminded`, which re-reads
  on `onRecallsChanged` and at the next reminder's end (`nextExpiry`); every reminder
  write goes through `recallCheck` (`saveRecall`, `stopRecall`, `forgetRecalls`), so a
  write that skips it leaves a stale bell. Anything showing "reminder set" reads
  `liveRecalls`, so one past its end is none everywhere.
  - `useReminded` reads `readRecalls()` (storage), never `recallCheck`'s cache: filling that
    cache when a map mounts hid a flag written later from the next check (the e2e's
    NV8 seeded one and it never fired).
  - On web the bell is **not** in the marker key: a change re-renders the same root in
    place, so focus returns to the pin when the viewer closes and a photo keeps its
    picture. On native it is in the Marker key (unverified whether children update
    without it).
- **A pin of several moments** (`tend map T14`, decision 0154): its head shows its kinds, the first two taken,
  fanned (`pin-kind` discs; one kind shows twice), never a numeral (`pinHeadKinds`, `lib/pins.ts`), and never a
  still or a video's play mark, which are a pin of one moment's (VS3, VS4); its name says
  them in words with the minutes in (`pinSpoken`, `pinInto`): "A photo and a note, twelve minutes in. Open". The
  time needs the walk's clock, which the walk screen, the replay and a day pass as `clocks` (each walk's id, start
  and pauses, memoized); without it (Chronicle's map, memory pins, moments of two walks) the name says the kinds
  alone. On web the name is set in place when a clock arrives after the pin. The e2e finds a pin of several by
  `button[data-ids*=","]:not([data-testid=memory-pin])`, never by its words.
  - A third kind is said and opened, never drawn: the head holds two (decision 0154). Pins group by place, never
    time, so a pin whose moments lie more than `JUST_AFTER_MS` apart in walked time (a loop's start and end) says its
    kinds alone (`tend map audit 19`).
  - Every pin of several has the neutral head (`MIXED`), one kind's two discs too (`tend map audit 22`). The fan is
    its own layer over the head (`fanLayer`), shrunk with a memory pin but never faded, as the clock is (MR10; `tend
    map audit 23`); its icons turn, never its discs, so a disc's box is its circle. On a pin of several the bell sits
    out from its corner (`bellRightFan`, `bellLeftFan`), clear of the discs (`tend map audit 24`). The `qol` journey's
    `pinsOfSeveral` walks its own pins of every shape and reads the heads, discs, opacities and bell boxes.
- **When a pin says it** (`tend map T28`, decision 0164), every pin, one moment or several (`pinWhen`, `lib/pins.ts`):
  with its walk's clock, its first moment's minutes in ("Photo, twelve minutes in. Open"), or, when its moments lie
  more than `JUST_AFTER_MS` apart in walked time, the span ("A photo and a note, from the start to fifty-eight minutes
  in. Open"); with none (no `clocks`, as on Chronicle's map and the ready screen; moments of two walks on a day; a
  moment outside a walk; a memory pin, always), the part of the day of its first moment by `dayPartLine`, the moment's
  own line's words ("Memories: a photo and a note, Tuesday evening"). `now` is the map's `openedAt`. This supersedes
  the "kinds alone" cases in the two bullets above. The e2e finds a pin of one moment by its kind and ". Open"
  (`[aria-label^="Photo, "][aria-label$=". Open"]`), never by its whole name, which holds the time.
  - A pin no clock holds whose moments fall on different days (as `dayPartLine` reckons a day: the small hours are
    the evening before's) says the span of their days, "from three weeks ago to Tuesday evening", an end whose line
    has its own comma giving the part before it, and two ends that read alike said once (`dayWhen`, `tend map audit 27`).
  - A map whose `clocks` hold more than one walk (a day's replay of several walks) says every pin's part of the day:
    "ten minutes in" would not say which walk. A day of one walk keeps the minutes or the span (`tend map audit 28`).
  - A map's `now` prop is what a pin's part of the day is said from; without it, `openedAt`, which stays the drop's
    clock. The walk screen's one map lives from the ready screen through the walk, so `walk.tsx` passes `pinNow`,
    renewed on each return to the front and at `nextDayPartBoundary` (`resurface/context.ts`); the web relabels in
    place (`usePinMarkers`' deps), native re-renders its labels (unverified). Chronicle remounts its map on focus and
    the replays mount on open, so they need none (`tend map audit 29`).
  - The span is said in the minutes it names: only when the rounded minutes lie more than ten apart, both under an
    hour sharing their unit ("from twelve to fifty minutes in"), else "from the start to ..." or the mixed units
    (`tend map audit 30`). `pinInto` is gone: `pinWhen` is the one place a pin's time is worded.

## Explore's dots (WT12-WT14, decision 0132)

- `waitingDots` is one `waiting-dots` circle layer (`WAITING_DOT_PAINT`, `waitingDotsGeoJSON` in `map/types.ts`), under the `marks` layer, on both maps: a feature's only property is its colour, so a dot carries no name, number, icon or id. Its edge is `WAITING_DOT_EDGE` (dark, 3:1 or more on the base map, a ring and a town's tint; `whole-towns audit 18` holds it). The web writes `data-waiting-dots` (positions only) for the e2e. A tap on a dot is the map's own `onPress` (no layer tap handler): the screen finds the dot within the press's reach (`dotAt`). Native's layer is unverified on a device.
