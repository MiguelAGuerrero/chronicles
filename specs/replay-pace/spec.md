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
Criteria: RY1-RY20 below; RY18 is the gate's
Open: none (the owner's calls are in Decisions)
```

## Decisions

- Nov 18, the owner: the path stays brisk and **each moment adds its own time on top**. A walk with many moments is simply longer.
  Lifts 0085's soft cap of about 60 s (RR5), to be recorded as a decision amending 0085 when this slice ships.
- Nov 18, the owner: **a skip ahead**: "a chevron that goes to the next moment where the controls for the replay exist".
- Nov 18, the owner: **the grid is kept** for a moment of several pictures (0123, MS17): "a stack is supposed to represent a
  multifaceted capture of a singular moment", shown as a grid "to exemplify that"; it holds longer.
- Nov 18, the owner, for later slices (recorded here so they are not lost; each gets its own spec and decision record):
  - a break is a pull-back and a slide across a dotted hop, with no dim;
  - a photo or video stays behind both on its pin and in a stack at the edge, one entry for each moment, which grows, the oldest
    dropping off when it would leave the screen (amends RR11's "the last three");
  - the replay flows in from the whole walk and closes on it, with what was kept on it;
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

## Criteria

### A moment's time

1. **RY1** The owner's task, "savour a moment": a photo on its own is fully shown for 4.5 s. Its card grows from its pin in 0.55 s,
   stands 4.5 s, and shrinks to the pile in 0.45 s. (Amends RR11's 2.4 s in all.)
2. **RY2** The first photo of a replay, and a photo reached after a stretch of 550 m or more with nothing kept along it, is fully
   shown a fifth longer: 5.4 s.
3. **RY3** In a run of photos, each next one is fully shown 12% shorter than the one before, never under 55% of RY1's time. A run is
   photos on their own one after another; a stretch of 550 m or more, a break, a voice memo, a video or a moment of several pictures
   starts it again.
4. **RY4** A moment of several pictures keeps its grid (MS17). The grid stays 5 s after its last piece has swiped in; one holding a
   video longer than that stays until the video ends, as today. (Amends MS17's "one photo slot".)
5. **RY5** The walker waits at a note 1.2 s for a note of up to six words, plus a quarter of a second for each word more, at most
   5 s. (Amends RR9's pause.)
6. **RY6** After a voice memo ends the walker stands 1 s before moving on. After a video ends its card stands 1 s before it shrinks.
   (Today 0.4 s and none.)
7. **RY7** A note's or memo's bubble leaves when the next photo, grid or video card opens, or when a break begins, if that comes
   before RR9's 9 s or a fourth bubble. A memo's bubble never leaves before the memo has played (audit 1).

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

12. **RY12** The owner's task, "skip ahead to the next moment". Finding criterion: while the path plays, the replay's row of controls
    has a third button, beside Skip, in the same ink and shape as Skip and Hold, showing a chevron that points forward. It is at least
    44 pt wide and tall, and a screen reader calls it "Next moment". Someone who was not told where it is finds it there.
13. **RY13** Pressing it shows the replay as it would be just before the next moment begins (0.45 s before): the walker at that
    moment's place, the clock at the time you arrived there, the trace drawn up to there, and every moment passed over in its place
    on the map and in the pile. The moment then plays as it would have.
14. **RY14** It never lands inside a voice memo or a video, and whatever was playing when it was pressed stops, as with Skip.
15. **RY15** Pressed while held, it moves to the next moment and stays held; Play goes on from there.
16. **RY16** Pressed while the replay is waiting for a memo or video to start or to finish, it moves on all the same.
17. **RY17** When no moment lies ahead (after the last one, or on a walk with none), the button is not shown. Skip is the way to the
    card.
18. **RY18** Restraint (the gate's): nothing comes with the button that counts or measures: no number of moments, no "N of M", no
    progress bar or dots, during the path or after a press (RR19 stands).
19. **RY19** Every way into a replay plays by these rules and shows the button the same way: a walk's first replay (from the walk
    screen and from the recording bar), a re-watch (Chronicle's walks and Memories' "Relive"), a link reopened, and the day's replay,
    where a moment is each of the day's moments, on a walk or not.
20. **RY20** The screen reader's path (RR17) is as it was: it steps through the moments with Continue and has no such button.

## Every surface

`Stage`, the ceremony clock and the rhythm are hosted by two screens, read from the code (`grep -rn "useCeremonyClock\|<Stage" src`):
`src/app/replay/[id].tsx` (a walk's replay: first watch and re-watch) and `src/app/day/[key].tsx` (the day's replay). Routes into
them: `walk.tsx` and `RecordingBar.tsx` (Stop), `HomeSheet.tsx` and `MemoriesScreen.tsx` (walk rows, day rows, Relive), "Watch again"
on both cards, and a reopened link. All of them reach the two screens and nothing else, so RY19 covers them through one shared
control. `StepThrough` (a screen reader on, native only) draws no stage: RY20. There is no preview host.

## Later slices

In the order the audit proposed: breaks without the dim; the camera (a wider walking zoom, holding then re-framing, a steady speed
on screen), which first needs the owner's call on how the map is driven; opening from and closing on the whole walk; what stays
behind (the growing stack, then pictures on pins); captions in the replay, memos then videos; a moment's videos and memos in turn.
Left out of this slice on purpose: the map dimming under a photo and the slow drift of a held photo, which two reviewers disagreed
on and the owner has not called.

## Record

(Filled in as the slice is built.)
