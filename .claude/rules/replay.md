---
paths:
  - "src/lib/__tests__/replay/**"
  - "src/app/replay/**"
  - "src/app/day/**"
  - "src/lib/ceremony/**"
  - "src/components/ceremony/**"
  - "src/lib/{replay,quietLines,summary}.ts"
  - "src/components/CaptureView.tsx"
---
# Replay

A walk's replay and the day replay: the five beats, the story and its ceremonies, the rhythm, the card's wording. The codemap is in `docs/ARCHITECTURE.md`; the decisions and their history are in `docs/decisions/`.

## Rules

- **A replay is a story told by a ceremony** (decision 0086). `lib/ceremony/story.ts`
  reads what happened once (`walkStory`, `dayStory`: paths, moves, moments with
  arriving and leaving, breaks, travel between a day's entries, passes), with no
  timing or look. A ceremony (`lib/ceremony/types.ts`: `show(story) -> { total,
  frame(ms) }`) says what is on screen at each time; the screens draw frames
  through `components/ceremony/Stage` and its `OVERLAYS` by kind. The screens
  and the stage never import a ceremony or `REPLAY_RHYTHM` (a test scans them,
  `replay-rhythm audit 10`): the camera, the pins and a card's origin come in the
  frame. A new ceremony is an entry in `CEREMONIES` and a view per new overlay kind.
- **The rhythm** (decision 0085, RR1-RR19, `lib/ceremony/rhythm.ts`): a stretch's
  time follows its length, not the minutes walked (a glide, or a zip with the camera
  pulled back past `zipAtM`); a break is a cut with "N min later"; notes and memos
  are bubbles, photos and videos cards that tuck into the pile; passed places
  whisper by (one or two by name, more than two as one "Passed a few places without stopping", RP19); a clock rolls with the walker. Every number is in `REPLAY_RHYTHM`
  (`motionTokens.ts`). Nothing shrinks to fit a total: the 60 s cap went with replay pace (RY10, decision 0203).
- **Replay pace** (`specs/replay-pace`, RY1-RY22, decision 0203; the first slice of the replay's rework):
  - **Each moment's time is its own** (`rhythm.ts` `holdPhotos`, `slotDur`, `grid.ts`): a photo on its own is fully
    shown `photoHold` between `grow` and `tuck`; the first of the replay and one after `longM` with nothing kept, a
    fifth longer; photos at one stop tighten, the last whole again. A photo walked to is never shortened (the owner,
    Nov 18: where it stands in the walk says nothing of its worth). A grid stays `gridHold` after its last swipe-in;
    `mediaTail` stands after a memo and inside a video's card.
  - **The walker keeps a steady pace** (`ease.ts` `steady`, the leg's `ra`, `rb`): the same curve gives the walker,
    the clock (audit 24) and a whisper's timing (`legWalkTime`); change one and the others drift.
  - **A bubble leaves at the next card or cut, never before a note could be read** (`noteRead`), and a memo never
    before it has played. **A whisper never starts under a card** (RY22): its `tw` moves to the card's end.
  - **Next** (`clock.ts` `nextStop`, `nextLoop`; `useCeremonyLoop` `next`, `canNext`): a ceremony says when
    its moments begin and where a press lands (`Showing.stops`: 0.45 s before, never inside the stop before, so never
    inside a memo or video); the screens never import the rhythm. `aimed` makes two quick presses two moments; a
    moment about to begin is never skipped. The frame is given the press (`frame(ms, jump)`): it drops a memo's bubble
    that began before it (the bubble unmounts, so its sound stops and its wait is let go) and says under the clock
    how much later it is and each place passed (RY21), which is why the line under the clock can wrap
    (`layout.ts` `STAGE_SIDE`, `heldShown`). A rebuilt telling forgets the press.
  - **The button says "Next"** (`NextMoment.tsx`, under Skip on both replays): the cold find took a bare chevron for
    something else and tapped Skip first, which ends the replay. It is not drawn when no moment lies ahead.
- **A stacked moment is one beat** (moment stacks MS17, decision 0123): `rhythm.ts` `stopSlots` makes a moment
  with two or more photos and videos one `grid` slot (`ceremony/grid.ts`: the closest square up to 3×3, scrolling past
  nine; `gridDuration`: swipe-ins, then one photo slot or the longest muted video), its memos and notes `beside` slots
  on their own clock from the grid's start; fewer than two play piece by piece. One card, one pile entry per moment.
  The rhythm hands the stage each cell's swipe-in (`shown`) and the `scroll`; `Grid.tsx` only draws them (the stage
  never reads `REPLAY_RHYTHM`). A stack's stop runs to its last piece (`lastPieceT`). The screen reader steps through
  a stack's pieces; `stepPosition` counts moments, never pieces (MS9).
- **Nothing waits for a tap.** A tap on the stage or Hold holds it; an open viewer
  pauses it (the clock and any sound); Skip goes to the card. First watch and
  re-watches play the same. Only the screen reader's steps (`StepThrough`) wait for
  Continue, and move on by themselves on a re-watch, as before (RR17).
- **Photos and videos are full screen in the viewer** (0003), opened from the pile
  (newest first); in the path they are cards.
- **Video** comes from the camera button (the system camera's own video mode),
  capped at 30 s on phones and 15 s on web. The mic stays the separate pocket
  recorder.

## The card

- **Counts are words** (U13, `lib/quietLines`): the card's new streets are a
  clause in its line ("your first time down Elm Street", "3 streets new to
  you"), from `ReplayData.newStreets` (visited named keys not walked
  before); the fog beat says the same, or "Familiar ground". The low names
  one or two places, else "a few places" (`passedPlaces`, `passedLine`).
  The walks list row is date, distance, time and captures (`walkRowMeta`).
  No accent colour or large number on the card; the e2e scans for both.

## Gotchas

- Change the beat and its start time together (`phase = { beat, t0 }`) and do beat
  transitions in a tick or a handler. A separate clock state once skipped the fog beat
  on "Watch again". The ceremony's time restarts at each new `phase.t0` (its epoch,
  `loopAgainst`), so no effect has to reset it.
- The ceremony's time moves through `stepLoop` (`lib/ceremony/clock.ts`, over `tickClock`): a frame
  longer than 250 ms counts as 250 ms (a locked screen waits, never skips to the card),
  and a time at or past the total ends it, even a total of 0 or one that shrank when
  the story was rebuilt (a moment deleted from the viewer).
- A trace's standstill is kept as its two end fixes (`smoothDwells`), minutes apart:
  `ReplayData.stays` says which holes are stands, so the story joins them rather than
  playing a cut (`joinStills`). A pause is a break however short, and a stop's arriving
  and leaving never cross a run's edge (audit 21). Through a stretch the clock rolls
  with the stretch's time, eased, so a stand inside it never leaps (audit 24).
- **Media lead, the clock waits** (audits 20, 23): a memo or video asks the stage to
  wait (`useMediaWait`, deciding with `mediaWait`) while it is behind its slot, or not
  done when the slot ends; the clock stands still while the medium plays on. One that
  never starts is waited for 2 s; one stuck where it is (a file that won't play) for
  2 s more; one that plays, up to its length (30 s at least). Hold and the viewer
  pause the medium itself (`ctx.held`, `ctx.paused`); a wait never does, or it would
  never catch up. A memo started by hand plays to its end and resumes after Hold.
- **A medium's length is its kept part** (`fix trimmed-length 1-4`): the plan's slot (`mediaLen`), a grid's longest
  video, the card's wait and the steps' re-watch all ask `memoLengthMs` (`lib/voiceTrim`; a video's `edit.trim` is the
  same data as a memo's), never `Number(body)`: the players stop at the trim's end, so the stored length left the
  walker standing through the cut part. A grid's video plays only its kept part too (`Grid.tsx` `CellVideo`; the
  `stacks` journey watches both). A test scans the ceremony and its stage for a stored length read directly.
- **A video's player is made with its file, never empty and filled later** (`CellVideo`, as `CardVideo`): given a new
  source, expo-video's web hook calls `replace()`, which plays the tag whatever the stage says, and React then sets
  the tag's `src` again on its next draw, a second load that fails that start with a logged AbortError.
- **A rebuilt telling keeps its place** (audits 22, 31, 33): deleting a moment from the
  pile, Undo, or editing a note rebuilds the story; the loop re-anchors (`loopAgainst`, `reanchor`)
  and draws it in a layout effect, before the render that brought it is painted: the same time of
  day, and where the clock stands still (a stop, a loose moment) as long before it moves on as there was.
- **A moment the trace doesn't cover** (in a gap or a pause, `onTrace: false`) is where
  it was taken: the cut lands there; a break of under a minute next to it is a step,
  not a second cut (audit 30). A memo paused with its own button lets the stage go on;
  the stall count resets once a player moves (`trackWait`, audit 32).
- **Loading and waking** (RR23, RR24, decision 0087): while the stage waits for a medium
  that hasn't started, a `Skeleton` stands where it will be (a photo's card too, until
  its picture loads); still with reduce motion. The screen stays awake from reading the
  streets to the card (`useAwakeWhile`, expo-keep-awake), taken again on AppState
  `active`: the web's wake lock is let go whenever the page is hidden.
- **Picking a ceremony**: the route parameter `style` (`ceremonyFor(style)`); the walk
  replay's `ceremony=0` means a re-watch, not a ceremony (audit 25).
- The walked line is revealed, never rebuilt (replay ceremony RC1): see "The engine" below. A ride's dashed line is
  still data, sent again at most ten times a second, so on a ride it can trail the dot by a tenth of a second.
- `CaptureContent` plays a voice memo or video itself and is keyed by capture id, so
  moving on or skipping unmounts the player and stops the sound (the steps).
- A capture after the last fix stops the path at its end. The path span is the trace.
- With a screen reader on (native only, since react-native-web always says yes), the
  replay skips the fog and path and steps through the story's moments, then the card.
- The replay sets `playsInSilentMode` when it mounts, or memos are silent with the
  iPhone's ringer switch off.
- **Back and Escape** (`tend replay 4`, `5`): `backFrom(beat)` (`lib/replay.ts`) decides: the name step returns to
  the card with the words kept, any other beat leaves. Escape is heard on `window` in the capture phase, since
  react-native-web's TextInput stops a key's propagation; a held key's repeats are ignored (`tend replay audit 4`); and
  not at all while a viewer, the walk's menu, a gap's card or a gap's way being drawn is open (the web's viewer takes no
  Escape itself).
- **A card's room** (`components/ceremony/layout.ts`): under `STACK_TOP` (the clock, "N min later" and "Held",
  `tend replay 11`), and above a six-line note's bubble wherever a card of `MIN_CARD` (80 px) still fits: the card
  shrinks before the bubbles lose their room, a status bar included (`cardFloor`, `tend replay 7`, `audit 3`);
  `restCenter(ctx, h)` raises a card only as far as it must. Fog's headline: 8 px under Skip's foot (`audit 6`).
- **The end ring reads the whole trace** (`ended={data.runs}`, the day's whole paths; `tend replay 2`), never the
  drawn one, or it rides the walker and the map re-sends it every trace bucket.
- **Words for a screen reader, once per beat** (`beatWords`, keyed on `phase.t0`, `tend replay 9`): the walk is read
  again while its streets snap and when a note is edited, and an effect keyed on the data said each beat again.

- **Words typed in Name it are never dropped without asking** (`tend replay 15`, the owner's "Ask there too", Nov 16;
  decision 0172, O17): `backFrom(beat, { typed, asking })` asks before Back or Escape leaves the first replay with
  words `wordsTyped` reads as Keep it would store them (Rename's `renameChanged`, with the suggestion offered); the ask
  is Rename's, in Keep it's place under the fields; while it shows, Back, Escape and Done are Keep editing. Not now
  leaves at once (a choice already made, as Rename's Cancel). The name sheet's quiet Back (`tend replay T21`) goes
  through the same `stepBack` as Back and Escape.
- **The owner's answers of Nov 17** (the review of `tend replay 15`): Q1 "Ask there too": with words typed, Not now
  asks "Discard these edits?"; with nothing typed it leaves at once (`leaveCard`, `tend replay audit 15`; this
  supersedes the line above that has Not now leave at once). Q2 "Show the typed name": after Back, the card's title
  shows the typed name (unsaved) until Keep it or leaving (`cardTitle`, `tend replay audit 16`). S3 "Add the chevron":
  a muted back chevron before "Back" (no new colour, no new words) and the spoken hint "Returns to the card, your
  words kept". Q4 "File it as architecture": the browser's own back on web (docs/DEFERRED.md, Replay). A Rename from
  the card's More replaces only the Name it field it changed (`fieldsAfterRename`).
- **Beat one lights the walked streets in the walked ink, never the accent** (decision 0188, T22; 0153): the trace is
  faint at `QUIET_TRACE_OPACITY` over them (`map/types.ts`), so a lit street reads `#658694`, 3:1 on the land. The
  stage's memo (its play disc and waveform), a note's bubble edge and the pile's video tile take the kinds' colours from
  `COLORS` (the owner's "Follow the palette"); `replay-rhythm audit 19` keeps every hex out of the stage.

## The engine (replay ceremony RC1-RC10, RC48; decision 0206)

- **One frame loop owns the replay's time, outside the screens' rendering** (`components/ceremony/useCeremonyLoop.ts`:
  `useCeremonyLoop`, and `useReplay`, which both screens call). Each display frame it asks `stepLoop` (core: the time is
  an argument) and hands a time that moved to the ceremony's `frame(ms, jump)`; the frame goes straight to the map
  (`WalkMapHandle.replayFrame`) and to the stage's store (`lib/ceremony/live.ts`). The screens render only when the pins
  on the map change, Next comes or goes, or Hold is pressed. **Never read a frame in a screen's render**, and never set
  screen state from a frame: `render:replay` and `render:day` (perfCount) are held to two a second on a stretch by the
  `replay` journey (RC2).
- **The stage reads the frame from `ctx.live`, never from a prop** (RC7). `Stage` renders when the frame's shape changes
  (an overlay arrives or leaves, the telling is rebuilt). A leaf reads the one thing it shows with `useLive(live,
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
