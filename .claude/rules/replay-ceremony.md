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
# Replay ceremony: the engine and the camera

The replay's rework (`specs/replay-ceremony`, RC1-RC48, decision 0206), split from `replay.md` (the five beats, the story,
the rhythm's timings, the card): what drives a telling frame by frame, and where its camera is. Built on the branch and
shown to the owner before any of it goes live.

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
- **Tests**: `camera.test.ts` (RC13 on a 20 km ride and a day's travel: the walker inside the frame in every frame);
  the `replay` journey reads `data-cam` (where a frame put the camera, written only when measuring) against the map's
  own centre and each card's box (`cameraOf`).

## The engine (replay ceremony RC1-RC10, RC48; decision 0206)

- **One frame loop owns the replay's time, outside the screens' rendering** (`components/ceremony/useCeremonyLoop.ts`:
  `useCeremonyLoop`, and `useReplay`, which both screens call). Each display frame it asks `stepLoop` (core: the time is
  an argument) and hands a time that moved to the ceremony's `frame(ms, jump)`; the frame goes straight to the map
  (`WalkMapHandle.replayFrame`) and to the stage's store (`lib/ceremony/live.ts`). The screens render only when the pins
  on the map change, Next comes or goes, or Hold is pressed. **Never read a frame in a screen's render**, and never set
  screen state from a frame: `render:replay` and `render:day` (perfCount) are held to two a second on a stretch by the
  `replay` journey (RC2).
- **The stage reads the frame from `ctx.live`, never from a prop** (RC7). `Stage` renders when the frame's shape changes
  (an overlay arrives or leaves, the pile holds something else, the telling is rebuilt) and takes the frame that shape
  came with from the store's own hand-over (`useSyncExternalStore` over `live.staged`). **Never call `live.frame()` in a
  render**: the React Compiler (decision 0207) keeps what a render read from the same inputs, and the stage stayed empty
  (no clock, no card) until this was found on the merge; a read inside a callback is fine. A leaf reads the one thing it shows with `useLive(live,
  select)` (a primitive: a flag, a key, a minute) and writes what moves every frame on its own element with
  `useLiveStyle(live, pose)` (`layout.ts` holds the poses, pure: `cardPose`, `bubblePose`, `bubbleRoom`,
  `whisperPose`). An overlay's `o` prop is the overlay **as it arrived**: read it only for what never moves (its
  capture, its pieces); `grow`, `tuck`, `enter`, `exit`, `progress`, `playing` and the camera are read from the live
  frame (`overlayOf`). A media wait's `planMs` is a function for the same reason.
- **Trap: react-native-web's `Animated` renders.** An `Animated.Value` changed from JavaScript re-renders its animated
  view on the web (`useAnimatedProps` calls `scheduleUpdate`; its views have no `setNativeProps`), a React commit per
  frame per view. So what moves every frame is written with `writeStyle` (`liveStyle.web.ts`: the element's own style;
  `liveStyle.ts`: `setNativeProps`, untried on a phone), and the clock's reels roll by a CSS transition on the web.
  The loading skeleton still pulses through `Animated` (about sixty small commits a second while one is up; deferred).
- **Those properties are left out of the element's `style`**, but for a resting default (a card where it rests, the
  dim at 0): `useLiveStyle` writes them before the first paint and again after every render, so a render never undoes
  a write and the two never disagree.
- **The one number for frames a second** is `REPLAY_ENGINE.frameMs` (`motionTokens.ts`; 0 is every display frame),
  honoured by `stepLoop`; a replay's link can ask for a ceiling with `fps=30` (`frameMsFor`), to try one on a phone
  without a build. A frame not taken moves no time: the next one takes all that passed (RC5, RC6).
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
