---
paths:
  - "src/lib/__tests__/replay/**"
  - "src/app/replay/**"
  - "src/app/day/**"
  - "src/lib/ceremony/**"
  - "src/components/ceremony/**"
  - "scripts/perf-replay.js"
  - "scripts/e2e/replayWalk.js"
  - "scripts/e2e/journeys/replay.js"
---
# Replay ceremony: the engine, the camera, the breaks, the opening and the close

The replay's rework (`specs/replay-ceremony`, RC1-RC48, decision 0206), split from `replay.md` (the five beats, the story,
the rhythm's timings, the card): what drives a telling frame by frame, where its camera is, how a break is crossed, and
how a telling opens and closes on the whole of what it tells; what stays behind and a moment on screen are in
`replay-stage.md`. Built on the branch and shown to the owner before any of it goes live.

## The camera (replay ceremony RC11-RC16; decision 0206)

- **The camera is plan data, worked out once per telling** (`lib/ceremony/camera.ts`, core). `rhythmPlan` hands
  `cameraTrack` a scene (its segments as `CameraPart`s, and where the walker is at a time) and the screen; it walks the
  telling's time once in `camStep` steps and writes down the camera's moves. `rhythmFrame` only reads it (`cameraAt`:
  two binary searches). **Never work the camera out in a frame, and never keep camera state outside the plan**: held,
  after Next and in a rebuilt telling it must be where it would have been (RC16). `Frame.camera` is still a centre and
  a zoom; both maps add `FLAT_NORTH_UP` to every replay `jumpTo` (RC15).
- **The screen's size is an input to a ceremony** (`CeremonyOptions.screen`, a `StageRoom`: width, height, insets). The
  screens pass it by its numbers (a new safe-area object must not rebuild a telling); a real change of size rebuilds
  the telling, which takes up at the same time of day (`loopAgainst`). The timing never depends on the screen.
- **What it does.** Walking zoom `baseZoom` 15. A move keeps a place at the *focus* (`focusY` of the height down, the
  middle across), and the zoom turns about that place, so what the camera follows stays put on the screen while it
  rises. Three ways of moving:
  - *hold and re-frame* (RC12), at the walking zoom: still while the walker is in the middle (`holdX`, `holdUp`,
    `holdDown` around the focus); when it would leave, one eased move of `reframe` ms to a little ahead of where the
    walker will be. A stop never re-frames; a re-frame begun goes on to its end.
  - *risen* (RC13): a stretch whose steady pace crosses more than `maxCross` of the width a second rises by exactly
    that much at its steady pace (`riseFor`; rounded at each end), and the camera goes after the walker on a spring
    (`followLead`, `followEase`), kept inside the screen. It is back at the walking zoom when the stretch ends, by
    construction (the rise follows the walker's speed, which ends at 0).
  - *settling on a card* (RC14): a moment with a photo, grid or video puts its pin `pinUnder` px under the card's
    lower edge (`pinRest`), from `settleLead` before the walker stops, and holds while the card is up.
- **Trap: at zoom 15 nearly every stretch rises.** A 390 px screen shows about 700 m; the walker may cross 243 m of
  ground a second, and a stretch of 140 m already goes faster (0.9 s at its shortest). Hold-and-re-frame is what short
  stretches and wide screens get; do not read "risen" as "long".
- **Where a card rests is core** (`lib/ceremony/room.ts`: `cardSize`, `restCenter`, `cardFoot`), re-exported by
  `components/ceremony/layout.ts`: the camera settles the pin with the same arithmetic the card is drawn with. Change a
  card's frame or caption strip there, never in `Cards.tsx`. The stage's `project` is the camera's (Web Mercator, as
  the map lays places out), so a card's origin is on its pin at any zoom.
- **Tests**: `camera.test.ts` (RC13 on a 20 km ride and a day's travel: the walker inside the frame in every frame)
  and `breaks.test.ts`; the `replay` journey reads `data-cam` (where a frame put the camera) and `data-hops` (written
  only when measuring) against the map's own centre, each card's box (`cameraOf`) and each break (`breaksOf`), and
  fails a frame with anything laid over the map (RC17). Its seeded walk has a far break and one too small to see.

## Breaks (replay ceremony RC17-RC22; decision 0206)

- **A break is a hop or a stand, never a dim** (`rhythm.ts`, the `break` segment: `hop`, `tSwitch`). `Frame.dim` is
  gone; RC17's test scans for the word (the scrim under a card is `Frame.scrim`, `replay-stage.md`). A hop takes `breakFar` (4.2 s) from `breakFarM`
  (250 m) up, less when nearer, never under `breakNear` of it. Ends under `standPx` (26 px, about 46 m) apart at the
  walking zoom are a stand of `stand` ms: the line and the clock's change, nothing else.
- **A hop's parts are shares of its time** (`hopPull`, `hopDraw`, `hopDrawn`, `hopLand`, `hopClose`, `hopSwitch`): the
  camera pulls back until both ends fit (`camera.ts` `hopZoom`: inside `hopFitW` by `hopFitH` of the screen, their
  middle at the focus; never closer than the walking zoom, so a break the screen already shows only re-centres),
  the dots draw, the walker slides along the straight way (`between`, as the map draws a line), the camera closes in
  at the far end. The trace picks up when the walker lands (`here`), never before.
- **The hop is the map's, in the `gap-links` layer** (RC21: a gap's own dots, one mark for one thing). `Frame.hops`
  lists every hop made so far and the one being drawn (`p`); `reveal.ts` `hopLines` and `hopsKey` turn them into that
  source's data. **Trap: a dotted line cannot be revealed by a paint property** (the same as a ride's dashes): a hop is
  data while it draws, sent at most every `REPLAY_ENGINE.resendMs` (about eight sends over a far hop), and never again
  once whole. That is a break, not a stretch: RC3's count is unaffected.
- **Through the card**: `Showing.hops` says a telling's hops whole, with the walk's times each crosses. On the walk's
  card a gap keeps the card's own way of drawing it (`linksWithHops`, matched by time, since a gap's ends are the
  recorded fixes' and a hop's the story's, a few metres apart): its dotted link if empty (GW2: the same dots, drawn
  once), its offered way, faint, if one is offered (G6: the hop gives way to the offer). A hop across anything else (a
  pause, a break too long to be a gap) is added to the card's links. The day's card shows its walks' hops. While the
  path is told the screens give no links and the frames own the source. A gap whose way was kept or filled is trace,
  so the story has no break there and no hop.
- **"N min later" and the clock** (RC19): the line shows from `hopPull` of the break (both ends in view; a stand:
  `standLineIn`) until `breakLineAfter` after it. The clock is one time, then the other, at `tSwitch`
  (`Frame.clockFade` dips to 0 there over `clockDissolve` each way; the stage writes it on the clock's wrapper and
  stills the reels while it is under 1, so nothing rolls through the break). `msAtClock` and `reanchor` need a clock
  that never runs back: a step is fine, a dip would not be.
- **Reduce motion** (RC22): the same times; the hop whole from the break's first frame, the walker at one end and then
  the other, no dissolve. The map is not moved (RC10), so the still view is the first beat's own: the walk whole.

## Opening and closing (replay ceremony RC23-RC27; decision 0206)

- **One fit, three users** (`camera.ts` `fitCamera`): MapLibre's own arithmetic for fitting bounds flat and north-up
  inside a room (as close as fits both ways, capped, the bounds' middle at the room's middle). The first beat's view
  and the card's view are the map's own `fitBounds`; the telling's first and last frames are `fitCamera` of the same
  bounds in the same room, so the three are one view each and nothing jumps. **The screens say the whole and its room,
  never a view** (`CeremonyOptions.whole`: bounds, `open` and `close` edges, `maxZoom`): `open` is `FIT_PADDING`, the
  room the map's fit uses when given none; `close` is the card's own `sheetPad`, its top under the top row by a
  standing picture's height (`layout.ts` `WHOLE_TOP`), so no control sits on the walk and the card's map is that same view. Change a fit's padding in one place
  and the other jumps: the `replay` journey reads the cut (`bookendsOf`: `cutPx`, `movedPx`).
- **The opening** is the `intro` segment: the dive, `dive` ms from the whole to the walker's start (a `Move` with zooms,
  as a hop's: the start goes straight to the focus on the screen), the walker shown from `diveMark`, the clock in from
  `diveClockIn`. A telling with no beat before it (the day's, `holdOpen`) shows the whole `openHold` first. **A walk
  shorter than the walking zoom shows is fitted closer than zoom 15** (the fit's cap is 17): its dive pulls back. Left.
- **The close** is `rest` (the walker stands, `rest` ms) and `close` (the pull-back over `close` ms to the card's view,
  held `closeHold`). The clock through both is where the walker stopped (never the walk's end time, which can be long
  after the last fix), fades over `closeClock` and is not drawn while its fade is 0 (`Stage` keeps its room): the last
  view shows no figure larger than body text (RC26). It keeps its time under the fade: `msAtClock` and `reanchor`
  need a clock in every frame. The date (`Frame.date`, worded by the stage's `dateOf` for the room between Hold and
  Skip, where the clock stood: one line, a shorter form on a narrow phone) and the passed places
  (`passed` overlays: each beside its place, or the card's one line for more than two, beside none) come in from
  `closeSay`. A day's last view names none (`namePassed` is the walk's screen's alone).
- **The card's sheet is laid out unseen before the path ends** (`cardBody(true)`, `cardLines(true)`: no test id, its
  controls as room of their size, `visibility: hidden` on the web so it is no page text): its height is `sheetPad`'s
  bottom, so the close frames the walk above where the card will sit and the card's own fit then moves nothing (RC24).
  A card that grows a line while the path is told (a moment deleted) rebuilds the telling, which keeps its place.
- **Timing never depends on the whole** (as on the screen): with no bounds (a day of placeless moments), or with reduce
  motion, the segments last as long and the camera stays on the walker, or is not moved at all.
- **The first beat lights its streets in the map, not the screen** (`WalkMapProps.lightUp`, `lib/replay` `litStreets`):
  the screen gives the walked streets whole and a key; the web map lights them from a frame loop, sending its two
  street sources at most every `REPLAY_ENGINE.resendMs`; the phone's keeps the count in a store two source leaves read
  (untried). The walk's replay keeps no interval and no clock of its own: a timeout ends the beat.

## The engine (replay ceremony RC1-RC10, RC48; decision 0206)

- **One frame loop owns the replay's time, outside the screens' rendering** (`components/ceremony/useCeremonyLoop.ts`:
  `useCeremonyLoop`, and `useReplay`, which both screens call). Each display frame it asks `stepLoop` (core: the time is
  an argument) and hands a time that moved to the ceremony's `frame(ms, jump)`; the frame goes straight to the map
  (`WalkMapHandle.replayFrame`) and to the stage's store (`lib/ceremony/live.ts`). The screens render only when the pins
  on the map change, Next comes or goes, or Hold is pressed. **Never read a frame in a screen's render**, and never set
  screen state from a frame: `render:replay` and `render:day` (perfCount) are held to two a second on a stretch by the
  `replay` journey (RC2).
- **The stage reads the frame from `ctx.live`, never from a prop** (RC7). `Stage` renders when the frame's shape changes
  (an overlay arrives or leaves, the stack holds or shows something else, the telling is rebuilt) and takes the frame that shape
  came with from the store's own hand-over (`useSyncExternalStore` over `live.staged`). **Never call `live.frame()` in a
  render**: the React Compiler (decision 0207) keeps what a render read from the same inputs, and the stage stayed empty
  (no clock, no card) until this was found on the merge; a read inside a callback is fine. A leaf reads the one thing it shows with `useLive(live,
  select)` (a primitive: a flag, a key, a minute) and writes what moves every frame on its own element with
  `useLiveStyle(live, pose)` (`layout.ts` holds the poses, pure: `cardPose`, `bubblePose`, `bubbleRoom`,
  `whisperPose`, `picturePose`, `stackPose`). An overlay's `o` prop is the overlay **as it arrived**: read it only for what never moves (its
  capture, its pieces); `grow`, `tuck`, `enter`, `exit`, `progress`, `playing` and the camera are read from the live
  frame (`overlayOf`). A media wait's `planMs` is a function for the same reason.
- **Trap: react-native-web's `Animated` renders.** An `Animated.Value` changed from JavaScript re-renders its animated
  view on the web (`useAnimatedProps` calls `scheduleUpdate`; its views have no `setNativeProps`), a React commit per
  frame per view. So what moves every frame is written with `writeStyle` (`liveStyle.web.ts`: the element's own style;
  `liveStyle.ts`: `setNativeProps`, untried on a phone), and the clock's reels roll by a CSS transition on the web.
  The loading skeleton still pulses through `Animated` (about sixty small commits a second while one is up; deferred).
- **Those properties are left out of the element's `style`**, but for a resting default (a card where it rests):
  `useLiveStyle` writes them before the first paint and again after every render, so a render never undoes
  a write and the two never disagree.
- **The one number for frames a second** is `REPLAY_ENGINE.frameMs` (`motionTokens.ts`; 0 is every display frame),
  honoured by `stepLoop`, and there is no other way to set it: the link's `fps` and the frame readout at the preview
  address were aids for the owner's first looks and went once the iPhone was smooth (Nov 19). A frame not taken moves
  no time: the next one takes all that passed (RC5, RC6).
- **The walker's dot is placed to the sub-pixel** (`subpixelPositioning` on its marker): MapLibre rounds a marker to a
  whole pixel otherwise, and a dot held at the middle of a 393 px screen sat on a half pixel, rounded one way or the
  other from frame to frame (the owner's iPhone, Nov 18: "after images"; 46 flips measured in one replay).
- **The walked line is sent once per run and revealed** (`lib/ceremony/reveal.ts`, core: `revealOf`): the runs behind
  the walker whole in one source, the run being walked whole in another with `lineMetrics`, shown up to the walker by
  `line-gradient` over `line-progress` (`revealGradient`). A run that ended stays whole in its source until the next
  begins (`revealStop`), so nothing blinks while the whole runs' send is in the worker. When the path ends the line
  stays until the map is next idle, by when the trace given as a prop has drawn.
- **Trap: a dashed line cannot be revealed that way.** maplibre-gl 6.16 does draw `line-dasharray` with
  `line-gradient`, but over line metrics the dash's scale follows the line's length, not the screen: a ride's dashes
  came out as fine dots. Rides are one plain source, sent as data by the telling's time (`resendKey`,
  `REPLAY_ENGINE.resendMs`). The phone's map takes both lines that way (`lineGradient` on MapLibre RN is untried).
- **The harness**: `scripts/perf-replay.js` (docs/TESTING.md). Run it before and after a change to the engine, the
  stage or the map's replay path.
