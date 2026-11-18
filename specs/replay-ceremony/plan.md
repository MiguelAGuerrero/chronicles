# Replay ceremony: plan (RC)

For the owner's review before any code. Branch `claude/funny-bohr-ztvwgv`. Nothing here is deployed until the owner has seen it
running and says it matches the mock-up (Nov 18).

## What went wrong, and what this plan does about it

The first slice changed timing only, on the engine as it was. The owner opened it expecting the mock-up and got the old replay,
longer, stuttering. So this plan is the whole of what is left, and it starts with the engine, because nothing in the mock-up can
look right at 15 updates a second.

Measured the same day (`docs/research/replay-frame-pipeline.md`; a desktop browser slowed to stand in for a phone, not an iPhone):

| | full updates a second, slowed 4x | the line's end behind the camera | map data sent a second |
|---|---|---|---|
| Today | 15 | 20 px | 73 |
| Spike A: stop the waste | 19 | 17 px | 27 |
| Spike B: a loop outside the screen's rendering | 32 | 0 px | 0.2 |

## The engine (the owner's call: architecture)

Recommended: **B**. One loop owns the replay's time and applies each frame itself, outside React, the way the live walk screen
already moves its dot:

- the walker is the DOM marker the walk screen uses, not a map data layer;
- the camera is told where to be every frame (`jumpTo`), so it never steps;
- the walked line is sent once per run and revealed by a paint property (`line-gradient` over `line-progress`): no data goes to
  the map's worker as time passes. Checked in the spike: it works in the app's MapLibre and costs about 1.6 ms a frame slowed 4x;
- the screen renders only when something discrete changes (a card or bubble arrives or leaves, a pin appears, Hold, the beat);
- overlays read their per-frame values from the loop in the stage's own leaf, through `Animated` values or direct style writes,
  never through a screen render (the spike left them in React: 21% of its script time);
- the ceremony stays what 0086 made it: a pure `frame(ms)`. The loop is the screens' new clock, in place of the 33 ms interval.

What B does not settle, said plainly:
- **The phone's GPU is unmeasured.** B makes the map draw every frame. On the test machine (software graphics) that cost B its
  lead at the phone's full canvas size. So the loop has a ceiling on frames a second (RC6), one number, and the first thing to
  check on the owner's iPhone is which ceiling looks best.
- B uncovers work a 2 px skip was hiding: the pins' move listener reads layout on every move, and MapLibre covers about 30
  sources' tiles a frame. Both are fixed in the engine slice, measured before and after.
- Native (MapLibre RN) takes the same frames through its own code; `lineGradient` there is untried. If it cannot reveal a line,
  native keeps the line as data, re-sent at most ten times a second. Native has never run on a device.

The alternative, **A alone**, is three files and most of the frame-rate gain, but it keeps the lag, the stepping camera and a
screen render every tick. It is inside B either way, as B's first commit.

## Build order, on the branch

Each part is spec-first and test-first as the repo does it, ends green, and is committed; none is deployed.

1. **Engine** (RC1-RC10, RC48): spike A's changes, then the loop, the marker, the revealed line, the overlays off React, the
   day's replay on it; `scripts/perf-replay.js` (the spike's harness, kept) run before and after.
2. **Camera** (RC11-RC16): the screen's size becomes an input to the ceremony; the camera is keyframes in the plan (pure), read
   by `frame(ms)`; zoom 15, hold and re-frame, the speed rule for long stretches, rides and a day's travel, the pin under its card.
3. **Breaks** (RC17-RC22): the slide in place of the cut; the stand; the hop through the `gap-links` layer.
4. **Opening and closing** (RC23-RC27): the dive from the fog beat's own framing (one pure fit function shared by fog, close and
   card, so nothing jumps between them); the pull-back, the named passed places, the date, the 2 s hold.
5. **What stays behind, and a moment on screen** (RC28-RC37): the card onto its pin, the stack with its first-in first-out
   bound, the scrim and the drift, a moment's videos and memos in turn.
6. **Captions** (RC38-RC44): the memo's caption window in the bubble; a video's reading (new native code); only if the owner
   wants them before a phone build exists (question 3).

Then the cold find, the UI review with pictures, `/docs-gc`, and the owner's look. `/deploy` only on the owner's word.

## Files

- Engine: `src/components/ceremony/useCeremonyClock.ts` becomes `useCeremonyLoop.ts` (a `requestAnimationFrame` loop with a
  pure stepper in `src/lib/ceremony/clock.ts`: `stepLoop(state, now, { paused, total, frameMs })`); a small store the stage's
  leaves read (`src/lib/ceremony/live.ts`, `// @layer view`); `src/components/ceremony/{Stage,Cards,Bubbles,Grid,Whispers,
  RollingClock}.tsx` take per-frame values from it; `src/components/map/WalkMap.web.tsx` (an imperative handle for the replay:
  the marker, the camera, the line's progress; unchanged collections never re-sent; the pins' move listener) and
  `WalkMap.native.tsx` (the same handle); `src/app/replay/[id].tsx`, `src/app/day/[key].tsx`; `scripts/perf-replay.js`.
- Camera, breaks, opening and closing: `src/lib/ceremony/{rhythm,types,camera}.ts` (core: `camera.ts` new, the keyframes and the
  fit), `src/lib/motionTokens.ts`, `src/components/ceremony/layout.ts`.
- What stays behind: `src/components/ceremony/{Stack,Cards,Grid}.tsx` (`Stack.tsx` replaces `Pile.tsx`), `rhythm.ts`
  (`stopSlots`: a moment's videos and memos in turn), `src/lib/ceremony/stack.ts` (core: which entries show, first in first out).
- Captions: `src/components/ceremony/Bubbles.tsx`, `Cards.tsx`, `src/lib/transcript/*` (videos), the local native module's audio
  cut for a video.

## Data

No new truth. A video's reading is a cache row beside the memos' (the transcripts' table is keyed by piece; no migration is
expected, to be confirmed before the captions' tests). Nothing leaves the device.

## The seam (0086)

`CeremonyOptions` gains the screen's size (the camera needs it); `Frame.camera` stays where a camera is said. A break stops
being `dim` and becomes camera keyframes plus a `hop` overlay; the stack is a new overlay kind in place of `pile`. The screens
still import no ceremony. One engine and one camera: the rhythm ceremony is changed, not kept beside a second one (RC48), unless
the owner chooses to see it behind a switch first (question 2), in which case the old path stays until their word and is then
removed in the same slice.

## Tests

Core, one test a criterion, named by id, in `src/lib/__tests__/replay/` (`engine.test.ts`, `camera.test.ts`, `breaks.test.ts`,
`close.test.ts`, `stack.test.ts`, `captions.test.ts`): the loop's stepper (RC5, RC6, RC8's hold and seek), the camera's keyframes
(RC11-RC16; RC13 on a 20 km ride and a day's travel), a break's frames (RC17-RC22), the close (RC23-RC27), the stack's entries
and its bound (RC29, RC30, RC32-RC34), a moment's pieces in turn (RC37), the caption's window (RC38, RC39, RC41), RC48 as a
source scan (no interval clock, no `dim`, no `Pile`).

The `replay` journey, with `window.__perf` counts: RC1 (the marker's place against the line's revealed end and the map's centre in
the same frame), RC2 and RC3 (renders and sends a second on a stretch), RC4 (no send repeats), RC7, RC9 and RC46 (the day), RC12
(the centre still between re-frames), RC14, RC17, RC18, RC20, RC24-RC26, RC28-RC31, RC35, RC45, and a picture of each state at
390 and 320 px. The `stacks` journey: RC37. RC10, RC22, RC36: the journey with reduce motion emulated.

Device checks (`UNTESTED` as `device:`, each with an item in `docs/NATIVE_UNVERIFIED.md`): RC38-RC43 (speech recognition and the
caption on a phone), RC47.

Older tests that pin what changes are rewritten with their code: RR3 and RR4 (the pull-back and the cut), RR11 and RR13 (the
pile), MS17 (videos in cells), the `replay` journey's pile and "20 min later" checks, `replay-rhythm audit 10` and `19` (their
scans gain the new files).

## Cost

- Per frame: one `frame(ms)` (0.5% of today's script time), one marker move, one `jumpTo`, two paint-property writes, and the
  overlays' style writes. No React render, no worker message. Measured in the spike at 3.2 ms of script an update, against 7.1.
- Per discrete change (a card arrives, a run ends): one screen render and at most one data send.
- The plan: the camera's keyframes are a few per stretch, built once per telling, linear in the walk's events; rebuilt when a
  telling is rebuilt, as the plan is today.
- Harness: `scripts/perf-replay.js`, the spike's, kept in the repo: slowed 1x, 4x and 6x, before the engine's first commit and
  after each slice; the numbers go in the spec's record. A phone's frame rate is device only: an item in
  `docs/NATIVE_UNVERIFIED.md` for native, and the owner's own look for the web on their iPhone.

## Screen actions

- **Open the photos so far.** Goal: look again at something that went by. Now and then, mid-replay. Control: the stack at the
  right edge, one control. Where the owner looks first: where the photo went, the right edge. Default taken: no label on it, as
  the pile has none today; it is named for a screen reader. Adjacent apps: none shows a stack beside a map (a departure by the
  owner's call; reason: the owner asked for it by name).
- Next, Hold and Skip are as replay pace left them. The cold finds said Skip does not say what it skips: filed for the owner
  (`docs/DEFERRED.md`), not changed here unless the owner says so.
- Against precedent: Relive flies a 3D camera and shows a scrub bar; ours is flat, north-up and has neither (screen direction;
  RR19).

## Defaults I took that the owner can overrule

- Pins stay as 0154 has them: where several moments share a pin on the whole-walk view it shows their kinds, not a picture. So
  the last view is "studded with pictures" only where moments stand apart. Changing 0154 would change every map in the app.
- The stack goes when the card arrives (RC33); the mock-up's second pass lifted it above the card.
- A video's reading goes nowhere but its caption (RC41).
- The scrim is a fifth and the drift 3%, the mock-up's second-pass defaults; two reviewers disagreed on them.

## Deferred

Sound that leads or trails its picture; going back a moment; taking a replay up again after a reload; pictures on grouped pins
(0154); editing a wrong word in a caption (0169 keeps it out); the wording of Skip and Hold.

## Native paths that will not run on a device

The loop's frames through MapLibre RN (`jumpTo` with a zoom every frame, `lineGradient`, the marker); the stack and the overlays
through `Animated` on the native driver; speech recognition on a video's sound and the audio cut for it; the keep-awake for
minutes. Each becomes a `**Do:** … **Expect:** …` item. Native has never run on a device.

## The steward's findings

(Triage follows the steward's pass.)
