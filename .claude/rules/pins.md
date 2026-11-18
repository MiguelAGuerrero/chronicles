---
paths:
  - "src/components/{icons,CapturePinView,MarkPinView,StarView}.tsx"
  - "src/lib/{pins,useReminded}.ts"
  - "src/components/map/WalkMap*.tsx"
  - "src/components/map/types.ts"
  - "src/lib/__tests__/map/{pins,pinCull,pinKinds,pinReactions,stalkLift,starSelected,tapHandlers,palette}.test.ts"
---
# Map: pins and icons (a pin's head, bell and words, the map's palette, the pins near the view, taps, the selected star)

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

- **The map's palette is Earth and ink** (decision 0188, `specs/map-palette`): every map colour of a role is in
  `COLORS` (`map/types.ts`), the pin of several's head too (`COLORS.several`; `MIXED` in `CapturePinView` reads it,
  where it was a hex of its own), and the replay's stage takes the kinds from it. `map/palette.test.ts` holds them by
  role (MP2) with the contrasts (MP4, MP5), the colour-blind floor (MP6: 9.5 apart, CIEDE2000, with deuteranopia and
  protanopia; 15 in normal vision) and the accent's distance (MP7, 20); a new colour for a map role goes through those
  tests, and through `colors.test.ts`'s magenta rule (MP8: 15 from `HOTSPOT`, which stays the one hue of any line, fill
  or label). The `qol` and `palette` journeys read the colours from the source, never a copied hex. **Trap:** the
  stone note (`#7b7469`) is the set's quietest; a change that fades or greys pins further makes a note read as
  disabled.
- **Pins are drawn only near the view** (tend map 16, audits 35-37; web only). `usePinMarkers` keeps a box in a ref, never as React state: the view grown by a pin's reach on screen (`PIN_REACH_PX`: 24 px either side, its 48 px height and the most `stalkLift` gives below, through `unproject`, so a turned map grows the same way), widened by `PIN_CULL_MARGIN` (half the view) on each side. It is drawn again on `move` and `moveend` only when `boxHolds` says the grown view left it or zoomed in more than a level. The focused pin and the last pressed one (its viewer gives the focus back there) are never dropped (`drawsPin`). A pin past the box has no DOM marker, so an e2e reading pins reads those near the view. A margin of 0.25 drew 10 markers to 0.5's 28 for 8 in view with none missing, but no fall in drag cost showed through the noise (Nov 17), so the margin stays at half.
- **A screen reader reaches only the pins near the view** (the owner, Nov 17, on tend map 16's review F4: "Accept, record it"). Moving the map brings others in reach, and Chronicle's journal and Memories list every moment.
- **Taps read their handlers from refs filled before paint** (`tend map 17`): the web's pins, stars and "?" marks read
  `latest`, `starLatest` and `markLatest`, filled in `useLayoutEffect`s as the map's own handlers are (audit 8), so a tap
  after a render never reaches the previous handler. The markers themselves sync in passive effects (DOM markers before
  paint on every regroup would break the render budget), so a tap in the frame between commit and marker sync is
  dropped, never stale (`tend map audit 41`, accepted).
- **The selected star is told to a screen reader** (`tend map 20`; the owner, Nov 18: "Allow it"): on the web its button
  carries `aria-current="true"` (spoken "current": a button takes no `aria-selected`), on native
  `accessibilityState={{ selected }}`; both only on the selected star.
