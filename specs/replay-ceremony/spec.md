<!-- Replay ceremony. Written in the repo first (2026-11-18) from the owner's asks in session: the rework they described ("It
     feels a little choppy, too fast ... a gallery overlaid on top of the map, or something like a queue or a stack that shoots up
     ... the map is a bit too zoomed in ... That fade in, fade out is a little bit jarring"), the prototype they called "a vast
     improvement" (https://claude.ai/artifact/7oLxtuZMhpvXd18H4BLR5P), and, after the first slice went live: "The sequence looks
     nothing like the mock-up we provided and is really non-performant." To be copied into the concept doc as a tab. The doc wins
     once it exists. -->

# Replay ceremony: smooth, and as the mock-up shows it (RC)

Nov 18, 2026 · @Miguel Guerrero

The first slice of the rework (replay pace, RY1-RY22) changed the timing and went live. The owner opened it on an iPhone and saw
the old replay, running longer, stuttering. Both are true, and this spec is the rest of the rework in one piece: the engine that
makes it smooth, then everything the mock-up shows. It is built whole on the branch and shown to the owner running before any of
it goes live (the owner, Nov 18).

Why it stutters is measured (`docs/research/replay-frame-pipeline.md`): the replay re-renders the whole screen and the whole map
component thirty times a second, moves the walker and the line by re-sending map data through the map's worker, and steps the
camera. On a processor slowed four times it manages about 15 full updates a second, the line's end 20 px behind the camera.

The five beats keep their order (0001); the card and naming are untouched; replay pace's timings and its Next button stand.

## Vision

```
Idea: the replay plays smoothly and looks like the prototype: a wider camera that holds and re-frames, breaks crossed by a slide
  with no dim, the walk seen whole at the start and the end, photos that shrink onto their pins and gather in a stack that grows,
  a moment's videos and memos in turn, and captions of what the phone read
Verb: return (moments given back at a pace and in a frame you can take in, where they happened)
Touches: Always "Restraint in motion, colour and copy: the content is the novelty, not the chrome"; Always "A moment carries its
  context ... never appears as a bare thumbnail, filename or count" (0139 allows bare tiles when a header says where); Always
  "The lows stay in"; Never "Celebration ... big numbers, accent-coloured wins"; Never "Scores ... tallies"; 0001 (five beats);
  0085, RR11 ("the pile shows the last three ... and no count"), RR19 (nothing during the path counts); 0123, MS17 (a stacked
  moment is one grid, its videos muted in their cells, its memos beside it); 0154 (a pin of several shows kinds, never a still);
  0169 (a memo's words are read on the phone only, labelled "Read by your phone"; the replay's bubble deferred; memos only);
  0153, 0188 (nothing in the replay is lit in the accent); 0086 (a ceremony is a view of the story)
Verdict: aligned if reshaped
Shape:
  - the engine is engineering with one visible promise: the dot, the line's end and the camera move together;
  - the camera is flat and north-up, never a flyover;
  - a break is a straight dotted hop, the same dots a gap's link already uses, so one mark means one thing;
  - the last view names what was passed as firmly as what was kept, with no figure and no accent;
  - the stack is one entry for each moment, bounded by the screen, the oldest leaving first, never a number. Three reviewers read
    a growing stack as a count; the owner heard that and chose it ("let the side stack just grow ... first-in, first-out"),
    so it amends RR11 by the owner's call, to be recorded;
  - pins keep 0154: a pin of several still shows kinds, not a picture. The card shrinks onto the pin the map already draws;
  - a video's reading is the phone's guess at sound that is often not the owner's voice: it is shown as a caption, labelled, and
    goes nowhere else (not into threads or search) until its own decision;
  - captions exist only where 0169 reads them: a phone build. The web shows none, so the owner's iPhone browser shows none.
Precedent: Relive plays a route with photos popping up and pausing the camera (from memory, unverified); Pikmin Bloom's recap draws
  the day's path with what was planted along it, then counts (the path is the model, the counts a counter-example; unverified);
  Google Photos memories advance on a tap and pause on a hold (verified). No recorded app shows a growing stack beside a map.
Criteria: RC1-RC48 below
Open: the three questions under "For the owner" (how the map is driven; how it is shown before it goes live; captions now or with
  the first phone build)
```

## Decisions

- Nov 18, the owner, on the direction (recorded in `specs/replay-pace/spec.md` as leanings, now this spec's): a break is a
  pull-back and a slide; a photo stays on its pin and in a stack at the edge; the stack grows and the oldest drops off when it
  would leave the screen; the replay flows in from the whole walk and closes on it; the grid is kept, and a moment's videos and
  voice memos play one after another ("a slideshow is necessary for things that are not pictures"); captions in the replay.
- Nov 18, the owner, after the first slice went live: build the rest whole on the branch and deploy nothing until they have seen
  it running and say it matches the mock-up.
- Nov 18, the owner, on this plan (decision 0206): the replay is driven by **a loop outside the screen's rendering**; it is
  shown first at **a preview address** on the live site; **captions wait for the first phone build** (RC38-RC44 are not built
  here); and **the replay draws the pictures on the map itself**, the map's pins left as 0154 has them.
- From the audit of the direction (`docs/research/replay-ceremony-direction-audit.md`), taken here: the opening is the fog beat,
  not a second overview; a break too small to see is a stand; the stack entry arrives after the card has reached its pin; the
  last view holds 2 s, not 4; the close names the passed places.

## How adjacent apps do it

- **Relive** (iOS, Android): a route replayed as a video, its photos popping up along the line while the camera waits; a 3D
  flyover camera and a scrub bar. The pause at a photo is the model; the flyover and the bar are counter-examples (screen
  direction; RR19). Source: from memory, unverified. **Unverified**.
- **Pikmin Bloom** (iOS, Android): the day's recap draws the path walked with what was planted along it, then steps and counts.
  The path with its marks is the model; the counts are a counter-example (Never: scores, tallies). Source: from memory,
  unverified. **Unverified**.
- **Google Photos** (Android): memories advance on a tap and pause on touch-and-hold. Source:
  https://support.google.com/photos/answer/9454489?hl=en&co=GENIE.Platform%3DAndroid . **Verified**.
- **Apple Photos** (iOS): a memory plays as a movie with music and slow pans. Counter-examples (restraint; no music). Source: from
  memory, unverified. **Unverified**.
- **Polarsteps**: a trip drawn as a route with photo steps; users report photos covering the path and straight lines between
  stops (a warning for pictures on the map and for the hop). Source: from memory, unverified. **Unverified**.
- **Apple Voice Memos**: a recording's transcript can be read and searched. Source:
  https://support.apple.com/guide/iphone/search-for-or-rename-a-recording-iph0e546e6ec/27/ios/27 . **Verified**. No recorded app
  shows a transcript as a caption over a map.
- Only two lines here are verified (Google Photos, Voice Memos); the shape rests mostly on the owner's own prototype.

## Criteria

### The engine: it moves together

1. **RC1** The owner's task, "smooth": on the web, through the path the walker's dot, the end of the walked line and the camera
   are drawn together in every frame. The line never ends short of the dot, and the dot never trails the camera. (A phone build
   may trail the line by up to a tenth of a second if its map cannot reveal a line; untried, the steward's S8.)
2. **RC2** As time passes on a stretch with nothing arriving or leaving, the replay screen and the map component are not
   rendered again: at most two renders a second of each.
3. **RC3** As time passes on a stretch, nothing is sent to the map's data sources: at most one send a second. A run beginning or
   ending and a pin arriving are the sends there are.
4. **RC4** No map data is ever sent again unchanged, or empty after empty, on any screen that draws the map.
5. **RC5** The replay advances by the time that really passed, whatever the frame rate; a frame longer than a quarter second
   counts as a quarter second, so a locked screen waits (audit 6).
6. **RC6** The engine has one number for the most frames it draws a second (60 by default). Set to 30, it draws 30.
7. **RC7** Cards, grids, bubbles, whispers and the clock move without the screen rendering again.
8. **RC8** Hold, a tap on the map, Skip, Next, an open viewer, a memo or video the stage waits for, and a telling rebuilt
   mid-path all behave as they do today (RR7, RR13, audits 20 to 34, RY13 to RY17, RY21).
9. **RC9** The day's replay runs on the same engine.
10. **RC10** With reduce motion on, the timing is the same and the map stays still, as today (RR18).

### The camera

11. **RC11** The owner's task, "the map is a bit too zoomed in": the walking zoom is 15 (it was 16), showing twice the ground.
12. **RC12** The camera holds still while the walker is in the middle of the screen, and re-frames in 1.2 s, with room ahead of
    the walker, when the walker would leave it. Between re-frames it does not move.
13. **RC13** On a long stretch the camera rises just enough that the walker crosses no more than 0.35 of the screen's width a
    second, and comes back down before the next moment. On every stretch, a ride and a day's travel included, the walker stays
    inside the frame.
14. **RC14** Arriving at a photo, a grid or a video, the camera settles so that its pin shows just under where the card rests:
    the place stays in view while the card is up.
15. **RC15** The camera is flat and north-up throughout.
16. **RC16** Where the camera is at any time is the ceremony's to say, from the story, the time and the screen's size alone: held,
    after Next, and in a rebuilt telling it is where it would have been.

### Breaks

17. **RC17** The owner's task, "that fade in, fade out is a little bit jarring": a break never dims the map.
18. **RC18** At a break the camera pulls back until both ends fit, a dotted straight line draws from where the trace stops to
    where it picks up, the walker slides along it, and the camera closes in at the far end. A far break (250 m or more) takes
    4.2 s; a nearer one less, never under 58% of that.
19. **RC19** "N min later" shows under the clock from when both ends are in view until a little after the walker lands. The clock
    changes from one time to the other in a dissolve; it does not roll through the break.
20. **RC20** A break whose ends are too close to tell apart at the walking zoom (under 26 px) is a stand: 1.3 s, the line under
    the clock and the clock's change, no hop and no camera move.
21. **RC21** The hop is drawn with the dots a gap's link already uses, and stays on the map through the card. A gap whose way
    was kept or filled draws that way, as today, and no hop.
22. **RC22** With reduce motion on, a break is one still view with both ends and the hop drawn; it lasts as long.

### Opening and closing

23. **RC23** A walk's path begins from the fog beat's own view: the camera dives from the whole walk to the walker's start in
    2.2 s, with no cut and no second overview. The day's replay, which has no fog beat, shows the whole day for 2 s and dives.
24. **RC24** After the last moment the walker stands 1.6 s, then the camera pulls back in 3 s to the view the card uses, and
    holds it 2 s. The card then arrives without the map moving under it.
25. **RC25** On a walk's last view each place passed without stopping is named beside it, in body ink at full strength; more
    than two are said as the one line the card uses (RP19). The day's last view names none, as the day's card carries none (0153).
26. **RC26** The last view shows the date (the walk's, or the day's), and nothing on it is a figure larger than body text or in
    the accent.
27. **RC27** Skip goes to the card at once, as today.

### What stays behind

28. **RC28** A photo's, grid's or video's card shrinks onto its own place on the map, where its picture then stands, not into a
    corner.
29. **RC29** The owner's task, "a stack that shoots up as moments come into view": at the right edge a stack gathers one entry
    for each moment that had a picture or a video, the newest on top, each arriving once its card has reached its pin. A
    moment of several pieces is one entry with a layered edge; a video's has a play mark.
30. **RC30** The stack grows upward. When one more would reach the controls at the top, the oldest drops off the bottom. It
    never shows a number, and at 320 px it never overlaps a card, a bubble or the line under the clock. An entry that dropped
    off is still among the photos the stack opens.
31. **RC31** The stack is one control, at least 44 pt, named "Photos and videos so far": it opens them full screen at the latest,
    and the replay holds until it closes (RR13). It replaces the pile (RR11).
32. **RC32** A new entry settles with an overshoot of 1.5% and the ones under it give 3 px; with reduce motion it appears in
    place.
33. **RC33** The stack leaves as the card arrives; the card's map has the pins, as today.
34. **RC34** The owner's task, "a photo stays on its pin": through the path and on the last view, each moment that had a picture
    or a video stands as that picture at its place on the map, drawn by the replay over the map. Where two would overlap, the
    later one shows, with a layered edge. The map's own pins for those moments wait until the card, and every other map in the
    app keeps its pins as they are (0154).

### A moment on screen

35. **RC35** While a card is up the map under it dims by a fifth. Cards one after another at one stop share one dim, down once
    and up once; with reduce motion it does not fade.
36. **RC36** A photo held in its card drifts 3% closer over its hold; not with reduce motion.
37. **RC37** A moment of several pieces arrives whole. With no video its memos and notes play beside its grid, as MS17 has
    them. With videos, its pictures show as the grid, then each video plays in turn in the same card, with sound as a video
    on its own has, and the card stays up while its memos play. Nothing counts its pieces: no dots, no position. (Amends MS17:
    a moment's videos no longer play muted in the grid's cells. The steward's S2.)

### Captions (not built here: the owner, Nov 18, with the first phone build)

Kept as written for that slice; RC38-RC44 are retired from this one in `scripts/features.js`.

38. **RC38** A voice memo's bubble shows what the phone read from it: the line "Read by your phone", then at most three lines of
    the words, which move on by the share of the memo played. No word is marked as being spoken (the phone keeps no timings).
    The bubble's size does not change once it is shown.
39. **RC39** Nothing is shown for a memo not read yet, and a reading that arrives while its bubble is up waits for the next watch.
40. **RC40** A walk's memos begin to be read when the walk stops, without making the replay wait.
41. **RC41** A video's sound is read the same way and shown below its card, never in the strip that holds the owner's own
    caption, in at most two lines of muted ink under the same label. A word in a video's cut part is never read. A video's
    reading is shown in the replay only: it joins no thread, no search and no other screen. (The steward's S3.)
42. **RC42** The permission to recognise speech is never asked while a replay plays.
43. **RC43** A screen reader is told a caption is the phone's reading, and never hears it over the recording itself.
44. **RC44** On the web there are no captions (0169).

### Restraint, and every surface

45. **RC45** Nothing added here counts or celebrates: no numeral on the stack, the last view or a caption; no progress bar; no
    accent light (RR19, 0153). The stack's height is the one exception, the owner's call, recorded in its decision (the
    steward's S1).
46. **RC46** Every way into a replay plays this way: a walk's first replay, a re-watch, a link reopened and the day's replay.
47. **RC47** The screen reader's steps are as they were (RR17).
48. **RC48** The old way of playing is gone, not kept beside the new: one engine, one camera, one way across a break.

## Every surface

The stage and the ceremony clock are hosted by `src/app/replay/[id].tsx` and `src/app/day/[key].tsx`, reached from `walk.tsx`,
`RecordingBar.tsx`, `HomeSheet.tsx`, `MemoriesScreen.tsx` ("Relive") and both cards' "Watch again" (RC46). `StepThrough` draws no
stage (RC47). `WalkMap` is drawn by the walk screen, Chronicle's map, Explore and its pages too: RC4 reaches all of them by
intent; nothing else here changes them, and pins are left as they are (RC34) because `CapturePinView` is drawn on every one.
`MemoTranscript` is drawn by the viewer and the journal's memo line: RC41 adds a video's reading to the viewer only.

## For the owner: answered Nov 18 (decision 0206)

1. How the map is driven: a loop outside the screen's rendering.
2. How it is shown before it goes live: a preview address on the live site, the engine alone first.
3. Captions: with the first phone build.
4. Pictures on the map: the replay draws them.

## The UI review and the cold find (2026-11-19)

One round, from the journeys' pictures at 390 and 320 px (the web build; fake tiles and flat test photos), by the
`ux-reviewer`, the cold find first and apart.

**The cold find** (nine tasks in the owner's words, pictures only): every task was placed, none wrongly. The photos so far
and "all the photos and videos" both land on the stack; Next, Hold and Skip as replay pace left them (Skip's and Hold's
wording stays the owner's open call, `docs/DEFERRED.md`, Replay pace); the date, the passed place, "N min later" and a
photo's place are read without a tap. First misreadings: the stack's single entry as a second pin, the video's tile in the
corner as a record button, the last view's date as today's.

**The UI review**: no high finding. Triage:

| Finding | Severity | Verdict |
|---|---|---|
| U1 A picture standing on the map looks like the thing to tap; a tap only holds | medium | accepted (the owner's "Proceed", Nov 19), fixed: a tap on a standing picture opens its moment, the replay held (`replay-ceremony ui 1`) |
| U2 At 320 by 568 the gap question and the card leave no map; "Tap a pin to open it" points at nothing | medium, one size | deferred to the owner: the question's card is older than this slice |
| U3 The stack's target is 44 wide and 8 px under Next | low | accepted, fixed: 12 px under Next, 48 dp to a finger on Android (`replay-ceremony ui 2`) |
| U4 A tall stack against a whisper or the last view's name at 320 (not pictured) | low | accepted, fixed: both end short of the stack (`replay-ceremony ui 3`) |
| U5 A grid of three leaves an empty cell; its strip says "Photo" | low, opinion | accepted, fixed: the last row's picture spans the row, the strip says "Photos" (`replay-ceremony ui 4`) |
| U6 A whisper has a halo, not a ground | low | accepted, fixed: a solid ground, under the line and clear of its pin (`replay-ceremony ui 5`) |

Three more were accepted from the record, each with its test first: a hop's dots stand on white discs so they read over a
walked street (`replay-ceremony ui 6`); the first beat's faint trace fades out and the walker fades in through the dive
(`replay-ceremony ui 7`); the first beat's view is north-up whatever the map's bearing was (`replay-ceremony ui 8`). The
temporary frame readout and the link's frame ceiling, built for the owner's first looks, are removed. What the fixes left
is in `docs/DEFERRED.md`, "Replay ceremony"; U2 stays the owner's.

## Record

2026-11-18 and 19, branch `claude/funny-bohr-ztvwgv`. RC1-RC37 and RC45-RC48 built and passing; RC38-RC44 (captions) are
retired until the first phone build, by the owner's answer. Built in five slices, each with its failing tests committed
before its code: the engine (RC1-RC10, RC48's engine part), the camera (RC11-RC16), the breaks (RC17-RC22), the opening and
closing (RC23-RC27), what stays behind and a moment on screen (RC28-RC37, RC45-RC48). `npm run check:test-first
replay-ceremony`: 41 of 41.

**Tests.** Unit, in `src/lib/__tests__/replay/`: `engine.test.ts`, `camera.test.ts`, `breaks.test.ts`,
`close.test.ts`, `stack.test.ts`, `pictures.test.ts`, `moment.test.ts`, `restraint.test.ts`, `ui.test.ts`, with `stage.test.ts`. The
`replay` journey (147 checks) holds RC1-RC4, RC7, RC9, RC10, RC12, RC14, RC17-RC20, RC22, RC24-RC31, RC35, RC36 and RC45;
`stacks` holds RC37; `days` the day's replay. Older tests that pinned what changed were rewritten with their code (RR3, RR4,
RR8, RR11, RR13, RR14, RR19, replay-rhythm audits 4, 7, 10 and 15, RY4, RY10, RY13, MS17, `fix trimmed-length 3`, MP10,
`gaps` GW2 and GW5, `qol`'s loop-walk hold). On the final build merged with `main`: typecheck, lint, 3,533 unit tests, and
eleven journeys (`replay`, `days`, `stacks`, `walk`, `gaps`, `qol`, `videothumbs`, `palette`, `edit`, `voicetrim` green;
`tabs` green on its one rerun, a known flake recorded on `main`).

**The owner's looks** (the preview address, an iPhone in the browser). The first, of the engine alone: "It's smoother but the
reticle has after images and doesn't glide across the screens it's very discrete in jumps". Found and fixed: the dot was
rounded to a whole pixel at a half-pixel centre (393 px wide; 46 flips in one replay, none after). Not found: why it moved
in steps; a simulation of noisy walks through `readTrace` ruled out the trace, a gate that could have dropped the camera's
frames was removed, and the preview carried a readout of the frames the phone draws. The second, of everything built:
"Looks good so far. Continue the rest of the work and /deploy" (Nov 19). The third, of the deployed build: "I wasn't able to
replicate the after image on your current build ... it's smoother than what we had before, so no issues there"; the readout
and the link's frame ceiling were removed after it.

**Found on the way.** The React Compiler came on with a merge of `main` and the stage stayed empty: it read the frame from
its store in a render. Fixed (`live.staged`, three tests under RC7); the rule is in `.claude/rules/replay-ceremony.md`.

**Measured** (`scripts/perf-replay.js`, headless Chromium with software GL, never an iPhone): before the rework about 15
walker updates a second at 4x CPU with the line 20 px behind; after, the line's end and the camera 0 px from where the
frame put them, the screen rendering 0 times on a stretch, 22 frames a second at 4x and 33 unthrottled (the machine's own
ceiling is about 30).

**Deferred and for the owner**: `docs/DEFERRED.md`, "Replay ceremony". **Native has never run on a device**:
`docs/NATIVE_UNVERIFIED.md`, "Replay ceremony". The spec was written in the repo and is not yet a tab of the concept doc.
The steward on the plan: ten findings, triaged in `plan.md`.

**The UI review's fixes** (2026-11-19, after the deploy of RC1-RC48; `replay-ceremony ui 1` to `ui 8`, their failing tests
committed first, in `ui.test.ts`). A standing picture opens its moment; the stack stands 12 px under Next; a whisper and
the last view's names end short of the stack; a grid's last row fills and its strip says "Photos"; a whisper has a solid
ground under the line; a hop's dots stand on white discs; the trace fades out and the walker in through the dive; the
first beat is north-up. The `replay` journey holds them (164 checks).
