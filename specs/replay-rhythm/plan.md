# Replay rhythm: plan

For the owner to read before any code. No new data, no migration, no new dependency, no new route. One new map prop (`followZoom`) on both platforms. The criteria are in `spec.md` (RR1-RR19).

## The shape

The prototype computed everything on screen from one number, the time into the replay. The app does the same:

- **Core** builds the replay once, as a plan of segments: a glide or a zip between moments, a stop with a slot per moment, a cut at a gap. Then a pure `rhythmAt(plan, ms)` says what is on screen at that moment: where the walker is (as walk time), the camera's pull-back, the dim of a cut, the clock's time, which bubbles show and how far in or out each is, which card is up and in which phase (growing, holding, tucking), what is in the pile, and which whisper shows.
- **The screens** keep their one clock tick (`FRAME_MS`, 33 ms) and render that frame. Holding stops the clock; Skip jumps it to the end. Nothing else keeps state about the path.

Today's beat clock (`phase = { beat, t0 }`, the trap in `.claude/rules/replay.md`) stays for the beats. Inside the path beat, the stop machinery (`stop`, `shown`, `atMs`, the 600 ms tap guard, the 4 s advance, `nextStop`) goes, except on the screen reader's path (RR17), which keeps it as it is.

## Files

**Core (pure, tested first)**

- `src/lib/replayRhythm.ts` (new, `@layer core`):
  - `rhythmPlan({ runs, captures, gaps, passed, reduceMotion })`: the plan. Distances come from the timed runs (`timedRuns`). Stops come from `groupCaptures` (RR14). Breaks come from the trace's own breaks (`isBreak`, pauses included; RR4). Each leg's length gives its duration (RR1) and its easing steepness (RR2). Then the soft cap is applied (RR5).
  - `rhythmAt(plan, ms)`: the frame (RR2-RR4, RR8-RR12, RR15, RR18).
  - `laterLine(ms)`: "43 min later", "2 h later", "1 h 20 min later" (RR4, RR16).
  - `notePause(text)`: 0.8 s for up to 12 words, then 0.2 s per 5 more, at most 3 s (RR9).
- `src/lib/motionTokens.ts`: `REPLAY_RHYTHM`, the prototype's numbers in one place:
  - glide 1800, zip 900, zipAt 450 m, zoomOut 1.7, cut 1400;
  - note 800, photo 2400, bubble life 9000, at most 3 bubbles;
  - card grow 380, card tuck 480, bubble in 280, bubble out 420, whisper 2600;
  - cap 60 000; floors 600 (glide), 1200 (photo), 300 (note).

  The owner's tuned settings, when sent, change only this object (AGENTS.md: timings come from `motionTokens`).
- `src/lib/explore/explore.ts`: `passedAlong(items, fixes)`, where and when each passed place was first within reach. It is the same rule as `passedPlaces`, plus the first fix's time (RR15).
- `src/lib/days.ts`: `dayPlan` becomes the input to `rhythmPlan`. Loose moments become legs between their pins. Each walk inside contributes its own runs. The time between entries becomes a cut (RR16). The `fly`, `stop` and `path` steps, `FLY_MS` and `stepFrames` go once the day screen no longer uses them.
- `src/lib/replay.ts`: keeps `groupCaptures`, `timedRuns`, `traceUntil`, `walkerAt` and `activeClock` (the screen reader path still uses the schedule). `PATH_MS`, `nextStop` and `walkTimeAt` stay only while the screen reader path needs them.

**Shell / data read**

- `src/lib/summary.ts`: `ReplayData.passed` gains `at` and `t`, from `passedAlong`. This is read-time cache: nothing is stored, and the card's `passedLine` reads the names as before.

**Views**

- `src/components/replay/` (new folder):
  - `ReplayClock.tsx`: the rolling digits, with `Animated` translateY per digit. No rolling with reduce motion.
  - `MomentBubbles.tsx`: notes and memos. The memo bubble wraps `CaptureContent`'s player, so playback, the refused-sound fallback and stopping on unmount stay as they are.
  - `MomentCard.tsx`: the photo or video card, positioned from the frame's phase. It grows from the map's centre, which is the pin, because the camera is on the walker at a stop.
  - `MomentPile.tsx`: the last three, angled, no count. Pressing it opens the viewer.
  - `Whisper.tsx`: the low's line beside the place. The place's screen position is its offset from the walker in metres divided by `metersPerPixel` at the zoom the replay sets, so no map projection call is needed.
  - `HoldPill.tsx`: "Held · tap to go on".
- `src/components/CaptureView.tsx`: `CaptureContent` gets a `paused` prop, so holding pauses a memo or video and resumes it (RR7). The video card reuses its player inside the card frame.
- `src/app/replay/[id].tsx`: the path beat renders `rhythmAt`. Changes:
  - Remove the stop overlay and Continue outside the screen reader path.
  - Add Hold next to Skip, and a tap on the map to hold.
  - The pile opens `CaptureViewer` and holds while it is open.
  - The fog, card and naming beats are unchanged. The first replay's "Not now" stays (0053).
- `src/app/day/[key].tsx`: the same, over the day's plan.
- `src/components/map/types.ts`, `WalkMap.web.tsx`, `WalkMap.native.tsx`: a new `followZoom?: number` prop, the zoom to hold while following (RR3).
  - Web passes `zoom` with the existing per-frame `jumpTo`.
  - Native sets the Camera's `zoomLevel` with no animation.
  - Sent rounded to 0.01, so a still camera sends nothing (the reactivity budget).

**Docs**

- `docs/decisions/0081-the-replay-flows.md`: the owner's calls of Nov 4. It supersedes 0002 and 0004, and amends 0003 (replay only), M10-M12 and the concept doc's "fixed ~40 s" (now a soft 60 s).
- `.claude/rules/replay.md`: rewrite the Rules and the stop-related gotchas.
- `docs/PRODUCT.md` (the replay and day replay bullets), `docs/ARCHITECTURE.md` (codemap rows for `replayRhythm.ts` and `components/replay/`), `specs/moments-and-days/spec.md` (mark M10-M12 amended), `docs/STATUS.md`.

## Data

None new. No SQLite migration, no IndexedDB version. `ReplayData.passed` gains two derived fields at read time. The meta key `day_watched:<key>` is no longer read to choose auto-advance; it is still written, and its removal is left for `/docs-gc`.

## Tests, per criterion

Unit tests are in `src/lib/__tests__/replayRhythm.test.ts` unless named otherwise.

| Id | Test |
|---|---|
| RR1 | `RR1: a stretch's time follows its length, not the minutes walked; standing takes none` |
| RR2 | `RR2: the walker slows into a moment and away from it; a long stretch covers most ground mid-way` |
| RR3 | `RR3: the camera pulls back mid-way through a long stretch and not between nearby moments` |
| RR4 | `RR4: a break in the trace is a cut with "N min later"; the walker never crosses it`; `RR4: laterLine says minutes and hours in words` |
| RR5 | `RR5: a plan over 60 s shrinks to fit, above its floors; memos and videos keep their length` |
| RR6 | e2e `replay`: the walk's replay and the day's reach their cards with no tap; no Continue is ever shown |
| RR7 | `RR7: holding stops the frame where it is` (the screen stops its clock; the core is checked to be a function of time alone); e2e `replay`: a tap on the map holds (the clock and the trace stop for 1 s), a second tap goes on; Hold reads Play while held |
| RR8 | `RR8: the clock runs from arrival to leaving at a moment, and with the walker between`; e2e `replay`: the clock's text changes during the path and is gone on the card |
| RR9 | `RR9: notes enter as the walker arrives, at most three, each out after 9 s or when pushed`; `RR9: a note's pause grows with its words, at most 3 s`; e2e `replay`: the seeded note's text shows in a bubble, and the map is still drawing behind it |
| RR10 | `RR10: a memo holds the walker for its length`; e2e `replay`: the memo bubble shows its name |
| RR11 | `RR11: a photo grows, holds 2.4 s and tucks; the pile keeps it after`; e2e `replay`: a card with the seeded caption shows, then the pile has an image and no digits |
| RR12 | `RR12: a video holds for its length plus the card's grow and tuck`; the video's play and muted fallback stay covered by the full flow's existing checks |
| RR13 | e2e `replay`: pressing the pile opens the viewer full screen and the clock stops until it closes |
| RR14 | `RR14: moments taken together play in time order at one stop` |
| RR15 | `explore.test.ts`: `RR15: passedAlong gives where and when each passed place came within reach`; `RR15: a passed place whispers as the walker reaches it and never slows it` |
| RR16 | `days.test.ts`: `RR16: a day's plan glides between loose moments, plays each walk's rhythm, and cuts between entries`; e2e `replay`: Replay this day reaches the day card with no tap |
| RR17 | the screen reader path's code is untouched; native only, so listed in `docs/NATIVE_UNVERIFIED.md` (react-native-web always reports a screen reader) |
| RR18 | `RR18: with reduce motion there is no pull-back and cards fade instead of moving` |
| RR19 | e2e `replay`: no digit or "of" shows outside the clock while the path runs, and the existing scan for the card's accent and large numbers still passes |

**The e2e:** a new journey `replay` (`E2E_ONLY=replay`, a row in `scripts/e2e-scenarios.js` covering `src/app/replay/**`, `src/app/day/**`, `src/components/replay/**` and `src/lib/replayRhythm.ts`).
- It seeds one walk straight into IndexedDB, as `gaps` does: a note, a photo with a caption, a memo, a 20-minute gap, and a long stretch. Then it opens its replay and that day's replay.
- The full flow's replay and day-replay blocks click Continue today (`scripts/e2e-web.js` around lines 3095-3150 and 4032-4061). They are rewritten to the new rhythm in the same commit. The full flow runs only when you ask; I'll ask once the slice's checks are green.

## Deferred

- **Tuned numbers.** The prototype's defaults go in until you send settings from the prototype; then only `REPLAY_RHYTHM` changes.
- **Removing `day_watched`.** Harmless while it stays written.
- **Highlights** (starring a moment during the replay) stay a later idea (concept doc).
- **A whisper for a passed place off-screen.** At the walking zoom a place within 60 m is always on screen, so none is planned.

## Not run on a device

- `followZoom` on MapLibre RN's Camera, set every frame during a stretch: whether it keeps up on an iPhone, and whether it fights the follow.
- The rolling digits, the card's flight and the bubbles' motion with `Animated` on native.
- Pausing and resuming a memo (expo-audio) and a video (expo-video) on hold.
- The screen reader path (RR17), unchanged but never run.

All of these go in `docs/NATIVE_UNVERIFIED.md`.

## Risk

The replay re-renders every 33 ms today, and the overlays add work to each frame. The overlays read one frame object, and each component re-renders only when its part of the frame changes. The camera zoom is rounded before it reaches the map. If the iPhone web build drops frames, the fallback is to move the bubbles and cards with `Animated` timings started at their entry times, instead of setting them each frame.
