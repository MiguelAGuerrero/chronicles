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

0. **The decision record**, before the first test commit: the owner's calls and answers, amending RR3 and RR4 (the pull-back
   and the cut), RR11 and RR19 (the stack grows; its height the one exception to "nothing counts"), MS17 (a moment's videos in
   turn) and 0169 (captions in the replay), with the objection the owner heard on the stack (the steward's S1).
1. **Engine** (RC1-RC10, RC48): spike A's changes, then the loop, the marker, the revealed line, the overlays off React, the
   day's replay on it; `scripts/perf-replay.js` (the spike's harness, kept) run before and after.
2. **Camera** (RC11-RC16): the screen's size becomes an input to the ceremony; the camera is keyframes in the plan (pure), read
   by `frame(ms)`; zoom 15, hold and re-frame, the speed rule for long stretches, rides and a day's travel, the pin under its card.
3. **Breaks** (RC17-RC22): the slide in place of the cut; the stand; the hop through the `gap-links` layer.
4. **Opening and closing** (RC23-RC27): the dive from the fog beat's own framing (one pure fit function shared by fog, close and
   card, so nothing jumps between them); the pull-back, the named passed places, the date, the 2 s hold.
5. **What stays behind, and a moment on screen** (RC28-RC37): the card onto its pin, the stack with its first-in first-out
   bound, the scrim and the drift, a moment's videos and memos in turn.
6. Captions (RC38-RC44) are not built here: the owner, Nov 18, with the first phone build.

**The owner looks twice**: once after the engine alone (is it smooth on the iPhone; which ceiling on frames a second looks
best), before the look is built on it, and once at the end (the steward's S8). Then the cold find, the UI review with pictures
and `/docs-gc`. `/deploy` only on the owner's word.

## How the owner sees it

**Answered Nov 18: a preview address.** `.github/workflows/pages.yml` also builds the branch named in `.github/preview-branch`
and publishes it under `/chronicles/preview/`; a preview that fails to build never blocks the app's own deploy. The engine goes
there alone first.

The owner watches on an iPhone in the browser. Only the live site serves the app, and it serves only `main`. The choices:

- **A preview address** (recommended): the deploy also publishes this branch's build at a second address under the same site,
  reached only by its link; the app at its usual address is untouched. It needs a small change to the deploy workflow, which
  itself goes to `main`. Because it is the same site, the preview reads the owner's own walks from the phone (the same storage),
  which is what makes it worth looking at; nothing in this spec changes stored data.
- **Recordings**: videos of the replay from the test browser. They show the look, not how it runs on an iPhone.
- A switch inside the live app is not offered: it is a deploy of the whole thing, and the engine cannot sit behind a switch.

## What will still differ from the mock-up on the owner's iPhone

Said now, so nothing surprises again:
- Real photos and real map tiles, not drawings, and whatever the phone's GPU makes of a map drawn every frame.
- In iPhone Safari a voice memo shows its play button until tapped and a video plays muted with "Tap for sound" (RR10, RR12): the
  browser refuses sound without a tap. "In turn, with sound" needs those taps.
- No captions at all on the web (0169): they need a phone build.
- The opening is the replay's own first beat (the walk whole, its streets lighting up), not a separate overview; the last view
  holds 2 s, not 4.
- The stack has one entry for each moment, not each picture, and goes when the card arrives.
- Pictures on the map depend on question 4.

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
  right edge, one control. Where the owner looks first: where the photo went. As planned that was the right edge; since RC28 the card shrinks onto its place on the map, so the first look is the picture standing there, which is not a control (the UI review's U1, Nov 19, filed for the owner: `docs/DEFERRED.md`). Default taken: no label on it, as
  the pile has none today; it is named for a screen reader. Adjacent apps: none shows a stack beside a map (a departure by the
  owner's call; reason: the owner asked for it by name).
- Next, Hold and Skip are as replay pace left them. The cold finds said Skip does not say what it skips: filed for the owner
  (`docs/DEFERRED.md`), not changed here unless the owner says so.
- Against precedent: Relive flies a 3D camera and shows a scrub bar; ours is flat, north-up and has neither (screen direction;
  RR19).

## Pictures on the map (question 4)

**Answered Nov 18: the stage draws the pictures** (RC28, RC34): a `picture` overlay kind, placed by the frame's camera each
frame like a card's origin, with the overlap rule in core (`src/lib/ceremony/pictures.ts`); the screens pass the map only the
pins of moments with no picture until the card.

The map's pins merge within 44 px, and a pin of several shows its kinds, never a picture (0154). At the wider walking zoom
merges roughly double, and on the whole-walk view most of a town walk merges. So as specified (RC28, RC34) a card often shrinks
into a pin of icons, and the last view is studded with pictures only where moments stand apart. The choices:

- **The stage draws the pictures** (recommended): in the replay only, each moment's picture stands at its place on the map,
  drawn by the stage over the map (not by the map's pins, which every screen shares); where several would overlap, the latest
  shows with a layered edge. The map's own pins for those moments wait until the card. 0154 holds everywhere else.
- **Keep 0154 as it is**: where a pin is a pin of several, the picture stays in the stack only (RC34 as written).

## Defaults I took that the owner can overrule

- The stack goes when the card arrives (RC33); the mock-up's second pass lifted it above the card.
- A video's reading goes nowhere but its caption in the replay (RC41).
- The map dims a fifth under a card and a held photo drifts 3% closer, the mock-up's second-pass values. The steward objects to
  both: the dim is a fade (the owner called the break's fade jarring), and the drift is the slow pan this spec lists as Apple
  Photos' counter-example. They are one number each in `REPLAY_RHYTHM`; 0 turns either off.
- Next leaves a whole moment, however many pieces it has.

## Deferred

Sound that leads or trails its picture; going back a moment; taking a replay up again after a reload; pictures on grouped pins
(0154); editing a wrong word in a caption (0169 keeps it out); the wording of Skip and Hold.

## Native paths that will not run on a device

The loop's frames through MapLibre RN (`jumpTo` with a zoom every frame, `lineGradient`, the marker); the stack and the overlays
through `Animated` on the native driver; speech recognition on a video's sound and the audio cut for it; the keep-awake for
minutes. Each becomes a `**Do:** … **Expect:** …` item. Native has never run on a device.

## The steward's findings (Nov 18), triaged

Ten drifts, no breach.

- **S1 the stack's height is a count: accepted as the owner's call to record** (step 0), with RC45's exception and RC30's
  two additions (no overlap at 320 px; a dropped entry still opens).
- **S2 a moment ordered by kind, its voice parted from its pictures: accepted.** RC37 keeps memos beside the grid, or the card
  up while they play.
- **S3 the phone's guess beside the owner's caption: accepted.** RC41: below the card, muted, never in the caption strip; the
  replay only, not the viewer.
- **S4 a caption cannot be put away: the owner's**, with question 3. RC38 now says the window moves by the share played and
  marks no word.
- **S5 the drift copies a counter-example and the dim brings a fade back: the owner's**, named under defaults; RC35 shares one
  dim across a stop.
- **S6 the pins shortfall is larger than the plan said: the owner's**, question 4.
- **S7 the last view: accepted.** RC25 and RC26 say the ink, the one line for more than two, and the day's.
- **S8 promises the engine cannot keep on native, and criteria that can pass while the iPhone stutters: accepted.** RC1 is the
  web's; the owner looks at the engine alone on the iPhone before the look is built.
- **S9 how the owner sees it: accepted.** "How the owner sees it" and "What will still differ from the mock-up".
- **S10 precedent: accepted.** Polarsteps' complaint and Voice Memos are cited; the spec says how little is verified.
