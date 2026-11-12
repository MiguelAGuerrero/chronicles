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
  (`motionTokens.ts`). A soft cap of 60 s shrinks everything but memos and videos.
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
  `useCeremonyClock`), so no effect has to reset it.
- The ceremony's clock ticks through `tickClock` (`lib/ceremony/clock.ts`): a tick
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
- **A rebuilt telling keeps its place** (audits 22, 31, 33): deleting a moment from the
  pile, Undo, or editing a note rebuilds the story; `useCeremonyClock` re-anchors with
  `reanchor` in the very render that first shows it: the same time of day, and where the
  clock stands still (a stop, a loose moment) as long before it moves on as there was.
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
- The trace is rebuilt from the frame at 66 ms buckets, not every frame, so on a zip
  the line trails the walker (deferred).
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

