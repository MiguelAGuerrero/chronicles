<!-- Replay pace. Written in the repo first (2026-11-18) from the owner's ask in session: "I've been enjoying the replay ceremony,
     but it's a little bit jarring ... It feels a little choppy, too fast. There's no rhythm or pacing. The display of media is a bit
     too fast. There's not enough time to savor a moment because it flashes on for like 1-2 seconds", then their calls below on a
     prototype (https://claude.ai/artifact/7oLxtuZMhpvXd18H4BLR5P). To be copied into the concept doc as a tab. The doc wins once it
     exists. -->

# Replay pace: moments take their time, and you can step to the next (RY)

Nov 18, 2026 · @Miguel Guerrero

The replay hurries. A photo is fully on screen for about a second and a half, a note's pause is under a second, the walker speeds up
and slows down along every stretch, and everything shrinks further to fit a 60-second cap. This slice is the first of the replay's
rework: it gives each moment its time, moves the walker at a steady pace, lifts the cap, and adds one control, beside Skip, that
goes to the next moment, so a long replay is never all or nothing.

It changes timing and adds that control. The camera, the breaks, how the replay opens and closes, what stays behind after a photo
and the captions are later slices (see "Later slices"); the five beats keep their order (0001), and the card and naming are untouched.

The numbers are the prototype's "Proposed" settings until the owner sends tuned ones; they live in `REPLAY_RHYTHM`.

## Vision

```
Idea: photos and notes stay long enough to take in, the walker moves at a steady pace, nothing shrinks to fit a time cap, and a
  chevron beside Skip goes to the next moment
Verb: return (a moment given back at a pace you can take in, and at the time you choose)
Touches: Always "Restraint in motion, colour and copy: the content is the novelty, not the chrome"; Never "Celebration: confetti,
  fanfare, big numbers, accent-coloured wins"; Always "The lows stay in" (passed places keep their whisper and the card its low);
  0001 (five beats in order); 0085 ("a soft cap of about 60 s", lifted here by the owner; "nothing waits for a tap", which stands);
  RR19 (nothing during the path counts anything: no progress bar and no "N of M" may come with the new control); 0123, MS17 (a
  stacked moment is one grid, kept)
Verdict: aligned if reshaped
Shape: longer holds and a steady walker, with no new motion; the new control is one quiet button in the replay's own row of controls,
  saying nothing of how many moments are left; a long replay is answered by that control and by shorter holds in a run of photos,
  never by a count or a bar
Precedent: Google Photos memories advance on a tap and pause on touch-and-hold (verified); Apple Photos memories and Relive show a
  timeline to scrub (from memory, unverified), which here would be a progress bar (RR19)
Criteria: RY1-RY22 below; RY18 is the gate's, RY21 and RY22 the steward's
Open: the owner's leanings for later slices (Decisions) have not been through the gate: each is gated before its own spec
```

## Decisions

- Nov 18, the owner: the path stays brisk and **each moment adds its own time on top**. A walk with many moments is simply longer.
  Lifts 0085's soft cap of about 60 s (RR5), to be recorded as a decision amending 0085 when this slice ships.
- Nov 18, the owner: **a skip ahead**: "a chevron that goes to the next moment where the controls for the replay exist".
- Nov 18, the owner, on the plan: **photos tighten only at one stop** (RY3), and the button is **a chevron, tested**: if the cold
  find misreads it or Skip, it becomes the word "Next" (RY12). Go-ahead to build, then deploy.
- Nov 18, the owner: **the grid is kept** for a moment of several pictures (0123, MS17): "a stack is supposed to represent a
  multifaceted capture of a singular moment", shown as a grid "to exemplify that"; it holds longer.
- Nov 18, the owner's leanings for later slices, recorded here so they are not lost. None is settled by this spec: each goes
  through `/vision` before its own spec, and none amends RR11, RR19, MS17 or 0169 until its own decision record (the steward's S7):
  - a break is a pull-back and a slide across a dotted hop, with no dim;
  - a photo or video stays behind both on its pin and in a stack at the edge, one entry for each moment, which grows, the oldest
    dropping off when it would leave the screen (amends RR11's "the last three");
  - the replay flows in from the whole walk and closes on it, with what was kept on it and what was passed;
  - a moment's videos and voice memos play one after another, not in the grid, and tapping into a stack is a slideshow;
  - captions of what the phone read, in the replay, under memos and under videos (extends 0169, which covers memos only).
- Audit of the direction, Nov 18 (`docs/research/replay-ceremony-direction-audit.md`), accepted into this slice: notes were still
  rushed (ux U8); bubbles outlived their beat (ux U7); a long replay had only Skip (ux U3, steward S6, auditor F4).

## How adjacent apps do it

- **Google Photos** (Android): memories advance on a tap; "To pause on a photo: Touch and hold it". No visible control for either.
  Source: https://support.google.com/photos/answer/9454489?hl=en&co=GENIE.Platform%3DAndroid . **Verified**.
- **Apple Photos** (iOS): a memory plays as a movie; a tap shows a pause control and a strip of its photos to scrub. Its music and
  its Ken Burns movie are counter-examples (restraint; `docs/research/replay-cinematography.md`). Source: from memory, unverified.
  **Unverified**.
- **Relive** (iOS, Android): a route replayed as a video with photos popping up along it, and a scrub bar under it. The scrub bar
  is a counter-example here (RR19: no progress bar). Source: from memory, unverified. **Unverified**.
- **Story players** (Instagram and others): a tap on the right goes to the next story, under a bar of segments that fill. The
  segments are a counter-example (RY18: they count). Source: from memory, unverified. **Unverified**.
- How long a photo should stay has no verified precedent: people complain that Apple's memories give each photo "only a few seconds"
  with no way to lengthen it (seen through search only, `docs/research/replay-cinematography.md`).

## Criteria

### A moment's time

1. **RY1** The owner's task, "savour a moment": a photo on its own is fully shown for 4.5 s. Its card grows from its pin in 0.55 s,
   stands 4.5 s, and shrinks to the pile in 0.45 s. (Amends RR11's 2.4 s in all.)
2. **RY2** The first photo of a replay, and a photo reached after a stretch of 550 m or more with nothing kept along it, is fully
   shown a fifth longer: 5.4 s.
3. **RY3** Photos taken at one stop (RR14: one after another at one place, each on its own) tighten: each next one is fully shown
   12% shorter than the one before, never under 55% of RY1's time, and the last one at RY1's full time again. A note or memo between
   them does not start the tightening again. A photo you walked to is never shortened: it gets RY1's time (or RY2's). (The owner,
   Nov 18, on the steward's S4: later moments are not worth less; a long replay is answered by the next-moment button.)
4. **RY4** A moment of several pictures keeps its grid (MS17). The grid stays 5 s after its last piece has swiped in; one holding a
   video longer than that stays until the video ends, as today. (Amends MS17's "one photo slot".)
5. **RY5** The walker waits at a note 1.2 s for a note of up to six words, plus a quarter of a second for each word more, at most
   5 s. (Amends RR9's pause.)
6. **RY6** After a voice memo ends the walker stands 1 s before moving on. After a video ends its card stands 1 s before it shrinks.
   (Today 0.4 s and none.)
7. **RY7** A note's or memo's bubble leaves when the next photo, grid or video card opens, or when a break begins, if that comes
   before RR9's 9 s or a fourth bubble; but a note's bubble is never taken away before it could be read: it stays at least 1.5 s
   plus 0.3 s a word (of the lines it shows) after it is fully shown, over the card if one has opened. A memo's bubble never leaves
   before the memo has played (audit 1). (The steward's S1.)

### The walker's pace

8. **RY8** Along a stretch the walker moves at a steady pace: it reaches that pace within 0.35 s of setting off (or the first 35% of
   a short stretch), keeps it, and slows over the last 0.55 s (or the last 40%). A long stretch is no steeper than a short one. The
   clock still rolls with the walker (audit 24). (Replaces RR2's easing.)
9. **RY9** A stretch shorter than 450 m takes up to 2 s (never under 0.45 of that); a longer one takes 2 s plus up to 2 s more.
   (RR1's rule with new numbers.)
10. **RY10** Nothing shrinks to fit a total: the replay's length is the sum of its stretches, breaks and moments, with no cap and no
    floors. A short walk is not stretched. (Retires RR5 and its audit 11.)
11. **RY11** With reduce motion on, every hold, pause and wait above is the same length as with it off.

### The next moment

12. **RY12** The owner's task, "skip ahead to the next moment". Finding criterion: while the path plays, the replay's controls have
    a third button, with Skip: right under it at the same edge (the clock sits between Hold and Skip; Hold reads Pause and Skip "Skip to end" since Nov 20, decision 0242; the three do not fit one
    row on a 375 px phone), in the same ink and outline as Skip and Hold, showing a chevron that points forward. It is at least
    44 pt wide and tall, and a screen reader calls it "Next moment". Someone who was not told where it is finds it there, and does
    not take it for Skip: in the cold find, "go to the next moment" lands on the chevron and "leave for the card" on Skip. If either
    fails, the button says the word "Next" in the same outline. (The steward's S5.)
13. **RY13** Pressing it shows the replay as it would be just before the next moment begins (0.45 s before): the walker arriving at
    that moment's place, the clock at the time you arrived there, the trace drawn up to there, and every moment passed over in its place
    on the map and in the pile. The moment then plays as it would have.
14. **RY14** It never lands inside a voice memo or a video, and whatever was playing when it was pressed stops, as with Skip.
15. **RY15** Pressed while held, it moves to the next moment and stays held; Play goes on from there.
16. **RY16** Pressed while the replay is waiting for a memo or video to start or to finish, it moves on all the same.
17. **RY17** When no moment lies ahead (after the last one, or on a walk with none), the button is not shown. Skip is the way to the
    card.
18. **RY18** Restraint (the gate's): nothing comes with the button that counts or measures: no number of moments, no "N of M", no
    progress bar or dots, during the path or after a press, and nothing a screen reader is told after a press counts either (RR19
    stands).
19. **RY19** Every way into a replay plays by these rules and shows the button the same way: a walk's first replay (from the walk
    screen and from the recording bar), a re-watch (Chronicle's walks and Memories' "Relive"), a link reopened, and the day's replay,
    where a moment is each of the day's moments, on a walk or not.
20. **RY20** The screen reader's path (RR17) is as it was: it steps through the moments with Continue and has no such button.

### The lows stay in (the steward's S2, S3)

21. **RY21** A press never edits out what lay between. When a break lies between where you were and where you land, "N min later"
    shows under the clock on landing, N the time from one to the other. A place passed without stopping that the press jumped over
    is then said in the same line under the clock, where it is always in view, for its usual time (more than two on one walk as
    the one line, RP19).
22. **RY22** A whisper never starts while a photo, grid or video card is up: it waits until the card has shrunk and then shows for
    its full time. (A card now stands longer than a whisper lasts.)

## Every surface

`Stage`, the ceremony clock and the rhythm are hosted by two screens, read from the code (`grep -rn "useCeremonyClock\|<Stage" src`):
`src/app/replay/[id].tsx` (a walk's replay: first watch and re-watch) and `src/app/day/[key].tsx` (the day's replay). Routes into
them: `walk.tsx` and `RecordingBar.tsx` (Stop), `HomeSheet.tsx` and `MemoriesScreen.tsx` (walk rows, day rows, Relive), "Watch again"
on both cards, and a reopened link. All of them reach the two screens and nothing else, so RY19 covers them through one shared
control. `StepThrough` (a screen reader on, native only) draws no stage: RY20. There is no preview host.

## Later slices

The owner's leanings, in the order the audit proposed, each to be gated first: breaks without the dim; the camera (a wider walking zoom, holding then re-framing, a steady speed
on screen), which first needs the owner's call on how the map is driven; opening from and closing on the whole walk; what stays
behind (the growing stack, then pictures on pins); captions in the replay, memos then videos; a moment's videos and memos in turn.
Left out of this slice on purpose: the map dimming under a photo and the slow drift of a held photo, which two reviewers disagreed
on and the owner has not called.

## The UI review and the cold finds (2026-11-18)

- **Cold find 1** (pictures only, the bare chevron): "go to the next thing I kept" was tapped on Skip first, the chevron second
  ("next", "forward" or "open a panel"); the costly mistake was the likelier one. A `high` finding by RY12's own terms: the
  button says **Next**. `replay-pace ui 1` (the `replay` journey).
- **Cold find 2** (the word): Next was the first tap for the next moment; Skip was found for leaving, late, by elimination; Hold
  for stopping. Both still warn that Skip does not say what it skips, with a wrong tap ending the replay: filed for the owner
  (`docs/DEFERRED.md`, Replay pace), since Skip and Hold are older than this slice. Settled on Nov 20 by the owner's
  defaults (decision 0242, `replay-ceremony ui 10`): Pause, and "Skip to end" where the row has the room.
- **UI review** (`ux-reviewer`, 19 pictures): 6 findings.
  1. U1 a wordless chevron with two worded buttons (T5): accept, the word. `replay-pace ui 1`.
  2. U2 a wrapped line with "Held" under it reaches a card at 320 px: accept. "Held" is not drawn under a long line
     (`heldShown`). `replay-pace ui 2`.
  3. U3 the long line nearly touches Hold and Skip at 320 px: accept, and needed once Next took Skip's width: 90 px a side
     (`STAGE_SIDE`). `replay-pace ui 3`.
  4. U4 8 px between Next and Skip (the HIG asks about 12): defer, low; more gap means raising `STACK_TOP`.
  5. U5 Next's foot is 2 px above a card's highest top: defer, low, with U4.
  6. U6 the memo's bubble cut at the bottom in `rr-memo-320`: reject, the picture is taken mid-entrance (`tend replay 8`'s
     checks pass on the resting bubble).

## Record

2026-11-18, branch `claude/funny-bohr-ztvwgv`. RY1-RY19, RY21 and RY22 built and passing: `pace.test.ts` (18 tests), the
`replay` journey's RY12, RY13, RY17, RY18, RY19 checks and `replay-pace ui 1`, `stage.test.ts`'s `ui 2` and `ui 3`; RY20 is a
device check. Older tests that pinned what changed were rewritten with their code (RR2, RR9, RR11, RR12, MS17, `fix
trimmed-length 2`); RR5 and `replay-rhythm audit 11` are retired with the cap. The steward on the plan: 9 findings, all
taken or put to the owner (plan.md). Deferred: `docs/DEFERRED.md`, "Replay pace". Native has not run on a device:
`docs/NATIVE_UNVERIFIED.md`, "Replay pace".

**On `check:test-first`.** The failing tests were committed alone before any code ("tests first"), and each ran as
`not ok ... # TODO`. As first committed, the unit tests marked themselves with a shared `todo` constant and the journey's RY12
check kept its id two lines under its call, forms the check does not read from the history, so it reported them as never todos.
With the owner's go-ahead (Nov 18, "Rewrite the branch"), that one commit was restated with the literal `{ todo: 'test first' }`
and the id beside its call: the same tests, the same order, every later commit's tree byte for byte as it was, and this session's
branch force-pushed once. `npm run check:test-first replay-pace` then passes, 21 of 21.
