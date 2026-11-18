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

## Criteria

### The engine: it moves together

1. **RC1** The owner's task, "smooth": through the path the walker's dot, the end of the walked line and the camera are drawn
   together in every frame. The line never ends short of the dot, and the dot never trails the camera.
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
25. **RC25** On that last view each place passed without stopping is named beside it, as firmly as the pins of what was kept.
26. **RC26** The last view shows the walk's date, and nothing on it is a figure larger than body text or in the accent.
27. **RC27** Skip goes to the card at once, as today.

### What stays behind

28. **RC28** A photo's, grid's or video's card shrinks onto its own pin on the map, not into a corner.
29. **RC29** The owner's task, "a stack that shoots up as moments come into view": at the right edge a stack gathers one entry
    for each moment that had a picture or a video, the newest on top, each arriving once its card has reached its pin. A
    moment of several pieces is one entry with a layered edge; a video's has a play mark.
30. **RC30** The stack grows upward. When one more would reach the controls at the top, the oldest drops off the bottom. It
    never shows a number.
31. **RC31** The stack is one control, at least 44 pt, named "Photos and videos so far": it opens them full screen at the latest,
    and the replay holds until it closes (RR13). It replaces the pile (RR11).
32. **RC32** A new entry settles with an overshoot of 1.5% and the ones under it give 3 px; with reduce motion it appears in
    place.
33. **RC33** The stack leaves as the card arrives; the card's map has the pins, as today.
34. **RC34** Pins group as they do everywhere (0154): a pin of several shows its kinds.

### A moment on screen

35. **RC35** While a card is up the map under it dims by a fifth, fading in and out in 0.3 s.
36. **RC36** A photo held in its card drifts 3% closer over its hold; not with reduce motion.
37. **RC37** A moment of several pieces plays its pictures as one grid, then each of its videos in turn in the same card, with
    sound as a video on its own has, then its voice memos one after another and its notes, as bubbles. (Amends MS17: a
    moment's videos no longer play muted in the grid's cells.)

### Captions (a phone build only)

38. **RC38** A voice memo's bubble shows what the phone read from it: the line "Read by your phone", then at most three lines of
    the words, which move on as the memo plays. The bubble's size does not change once it is shown.
39. **RC39** Nothing is shown for a memo not read yet, and a reading that arrives while its bubble is up waits for the next watch.
40. **RC40** A walk's memos begin to be read when the walk stops, without making the replay wait.
41. **RC41** A video's sound is read the same way and shown under its card in at most two lines, with the same label. A video's
    reading is shown there and in the viewer only: it joins no thread and no search.
42. **RC42** The permission to recognise speech is never asked while a replay plays.
43. **RC43** A screen reader is told a caption is the phone's reading, and never hears it over the recording itself.
44. **RC44** On the web there are no captions (0169).

### Restraint, and every surface

45. **RC45** Nothing added here counts or celebrates: no number on the stack, the last view or a caption; no progress bar; no
    accent light (RR19, 0153).
46. **RC46** Every way into a replay plays this way: a walk's first replay, a re-watch, a link reopened and the day's replay.
47. **RC47** The screen reader's steps are as they were (RR17), captions aside (RC43).
48. **RC48** The old way of playing is gone, not kept beside the new: one engine, one camera, one way across a break.

## Every surface

The stage and the ceremony clock are hosted by `src/app/replay/[id].tsx` and `src/app/day/[key].tsx`, reached from `walk.tsx`,
`RecordingBar.tsx`, `HomeSheet.tsx`, `MemoriesScreen.tsx` ("Relive") and both cards' "Watch again" (RC46). `StepThrough` draws no
stage (RC47). `WalkMap` is drawn by the walk screen, Chronicle's map, Explore and its pages too: RC4 reaches all of them by
intent; nothing else here changes them, and pins are left as they are (RC34) because `CapturePinView` is drawn on every one.
`MemoTranscript` is drawn by the viewer and the journal's memo line: RC41 adds a video's reading to the viewer only.

## For the owner

1. **How the map is driven** (architecture): a loop outside the screen's rendering, as the live walk already moves its dot, with
   the walked line revealed by a paint property (plan, "The engine"). Measured in a spike; the phone's own GPU is not measured.
2. **How it is shown before it goes live**: the owner watches on an iPhone in the browser, and the only place that serves the app
   is the live site.
3. **Captions**: they need a phone build, which does not exist yet; on the web the owner will see none.

## Record

(Filled in as the slices are built.)
