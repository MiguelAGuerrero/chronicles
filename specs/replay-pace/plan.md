# Replay pace: plan (RY)

For the owner's review before any code. Branch `claude/funny-bohr-ztvwgv`. `/deploy` follows when the slice is green (the owner's
"/slice then /deploy", Nov 18).

## What the owner should know first

- **The numbers are the prototype's "Proposed" settings.** No tuned settings came back, so RY1-RY9 use them as they stand. They live
  in one object (`REPLAY_RHYTHM`); sending tuned ones later changes only that.
- **What this slice is not.** It keeps today's camera (locked to the walker, zoom 16), today's dim across a break, today's opening
  and card, and today's pile of the last three. Those are the later slices. After this one the replay is slower at moments and
  steadier between them, and it has the next-moment button; it does not yet look like the prototype.
- **A typical walk gets longer**: by the audit's arithmetic about 80 s becomes about 2 min 30 s for twelve photos, three notes, a
  memo and two breaks. The button is the answer to that, with shorter holds in a run of photos (RY3).

## Files

- `src/lib/motionTokens.ts`: `REPLAY_RHYTHM` gains the new numbers (glide 2000, zip 2000, photo hold 4500, first and after-long
  factor 1.2, long 550 m, run decay 0.12, run floor 0.55, grid hold 5000, note 1200 for six words and 250 a word, at most 5000, grow
  550, tuck 450, memo and video tail 1000, the pace's ramps, the next-moment lead 450) and loses `cap` and `floors`.
- `src/lib/ceremony/ease.ts` (core): `steady(u, rampIn, rampOut)`, the walker's pace (RY8).
- `src/lib/ceremony/rhythm.ts` (core): a photo's hold from where it stands in the walk (RY1-RY3); a video's tail (RY6); the pace in
  the legs, the clock and the whispers' timing (RY8); `legShape` with the new numbers (RY9); `fitCap` removed (RY10); a bubble's
  leaving (RY7); the plan's `stops` (when each moment begins).
- `src/lib/ceremony/grid.ts` (core): `gridDuration` holds 5 s after the last swipe-in (RY4).
- `src/lib/ceremony/types.ts`: `Showing` gains `stops: number[]`, the times into the telling at which each moment begins. A
  ceremony says them; the screens never import the rhythm (0086 stands, and its source scan).
- `src/lib/ceremony/clock.ts` (core): `nextStop(stops, ms, lead)` and `seekClock(clock, ms)` (RY13-RY17).
- `src/components/ceremony/useCeremonyClock.ts`: `seek(ms)`, which moves the time whether or not the clock is held or waiting.
- `src/components/ceremony/NextMoment.tsx` (new): the button, used by both screens (RY12, RY19).
- `src/app/replay/[id].tsx`, `src/app/day/[key].tsx`: the button beside Skip; on a press, any wait a medium was holding is let go.
- `src/components/icons.tsx`: a forward chevron, if the set has none.

## Data

None. No new truth or cache, no migration, no stored setting. Nothing leaves the device.

## The seam (0086), said plainly

`Showing` grows by one field, `stops`. It is the smallest thing that lets a screen ask for "the next moment" without knowing the
rhythm: a ceremony with no moments returns an empty list. I count this inside 0086 (a ceremony says what happens when), not a new
architecture; say if you see it otherwise.

## Tests per criterion

New file `src/lib/__tests__/replay/pace.test.ts` (core, no fakes), one test each, named by id:
RY1 (a lone photo's card: 550, 4500, 450), RY2 (first, and after 550 m), RY3 (a run of five: each 12% shorter, the floor, the
resets), RY4 (a grid's time; a grid with a longer video), RY5 (6, 7, 14 and 40 words), RY6 (a memo's stand, a video card's stand),
RY7 (a bubble leaves at the next card and at a cut; a memo not before it has played), RY8 (speed is flat mid-stretch, the ramps, a
long stretch no steeper, the clock in step), RY9 (100 m, 449 m, 450 m, 3 km), RY10 (forty photos: nothing shrinks; a short walk not
stretched), RY11 (the plan's times equal with and without reduce motion), RY13 (the frame at `nextStop`: walker, clock, drawn trace,
pins, pile), RY14 (`nextStop` is never inside a memo's or video's slot, for a walk and a day), RY15 and RY16 (`seekClock` keeps
held; a seek is not stopped by paused), RY17 (`nextStop` is null after the last moment and on a walk with none).

Journeys:
- `scripts/e2e/journeys/replay.js`: RY12 (the button beside Skip: its box at least 44 by 44, its name, the same border and ink as
  Skip, at 390 and at 320 px), RY13 (a press: the walker is at the next pin and its card or bubble comes), RY14 (a memo playing is
  stopped by a press), RY17 (gone after the last moment), RY18 (no digit in the controls' row, no progress bar or dots on the stage,
  before and after a press), and a picture of each state for the UI review.
- `scripts/e2e/journeys/days.js`: RY19 (the day's replay shows the button and a press reaches the day's next moment).
- RY19's other half, a source scan in `pace.test.ts`: both screens draw `NextMoment` and no other next control.
- RY20: a device check (`UNTESTED` as `device:`, with an item in `docs/NATIVE_UNVERIFIED.md`): react-native-web always reports a
  screen reader off this path, so only a phone can show the steps unchanged.

Existing tests that pin what this slice changes, rewritten in the same commits as their code:
- `ceremony.test.ts`: RR1 (numbers), RR2 (the long stretch's steeper ease goes; "slows into a moment" stays), RR9 (the pause and
  the leaving), RR11 (2.4 s), RR5 and `replay-rhythm audit 11` (removed; `RETIRED['replay-rhythm'] = ['RR5']` with the reason).
- `stacks.test.ts`: MS17's `total <= cap + 5000`, and the grid's duration.
- `trimmedLength.test.ts`: the expected slot lengths gain the 1 s tail.
- Journeys `replay`, `stacks`, `days`: their waits for a photo's card and a grid lengthen. They are the slice's own journeys and run
  once at the end.

## Cost

- The plan is built once per telling, as today, in time linear in the walk's events; `stops` is one number per moment. `fitCap`'s
  pass goes.
- Nothing new per frame: the frame is the same pure function of the time. A press is one state update.
- The replay now plays longer, so the screen is kept awake longer (RR24): a few minutes for a busy walk. Device only; an item in
  `docs/NATIVE_UNVERIFIED.md`.
- No harness: `scripts/perf-walk.js` measures the walk screen, not the replay. The replay's frame cost (`docs/DEFERRED.md`, the
  screen renders at 30 fps; the trace at 66 ms) is unchanged by this slice and reopened by the camera slice, not here.

## Screen actions

One new action, on both replay screens.

- **Go to the next moment.** Goal: get past a stretch or a moment to the next thing kept. How often: now and then, on a long
  replay, sitting or standing still (a replay is watched, not walked with). Control: a symbol button in the replay's top row, to the
  left of Skip, with Hold at the far left, as today. Matrix: no row covers stepping through a playback; the nearest guidance is
  1.6 (media viewing: keep essential controls reachable) and X0 (44 pt).
- **Where the owner will look first:** the top right, beside Skip. They will see `[ › ] [ Skip ]`, the chevron in a pill of Skip's
  outline and ink.
- **Defaults I took that make it quieter, each yours to overrule:**
  - a chevron with no word, as you asked for a chevron; the cold find at the end tests whether a stranger reads it as "next". If it
    fails, the fallback is the word "Next" in the same pill;
  - when no moment lies ahead it is not shown, rather than greyed out (RY17): a greyed control with nothing to do is one more thing
    to read;
  - it does not animate the jump: the replay is simply at the next moment.
- **Against precedent:** Google Photos advances on a tap anywhere and pauses on a hold, with no visible control. Ours is a visible
  button because a tap on the replay already means hold (0085, RR7) and a gesture cannot be found from the screen
  (`.claude/rules/ui-patterns.md`, "Found before quiet"). Apple Photos and Relive give a timeline to scrub; ours gives none, because a
  bar that fills is a progress bar (RR19) and the next moment is what the owner asked for.

## Deferred, and why

- Everything under the spec's "Later slices".
- The map dimming under a photo and a held photo's slow drift: the reviewers disagreed and it is yours to see in the prototype first.
- Going back a moment, and taking a replay up again after a reload: not asked for; the audit's F4 notes the second.
- A ceiling on length: you chose the button instead.
- Sound that leads or trails its picture (the audit's F17): it needs a player made before its slot.

## Native paths that will not run on a device

The button's press and the seek in `useCeremonyClock` on iOS and Android; the longer holds with expo-video and expo-audio players
(a memo's 1 s stand, a video card's 1 s stand); the screen kept awake for minutes; the screen reader's steps unchanged (RY20). Each
becomes a `**Do:** … **Expect:** …` item. Native has never run on a device.

## The steward's findings (Nov 18), triaged

Report-only, on the spec and this plan: eight drifts, two of tone, no breach.

- **S1 a note taken away before it can be read: accepted.** RY7 now keeps a note's bubble at least 1.5 s plus 0.3 s a word after
  it is fully shown, over a card if one has opened (cards already rest above the bubbles' room). The walker's wait (RY5) stays brisk.
- **S2 a press jumps silently over the lows and the breaks: accepted.** RY21. The frame takes where a press came from, so a passed
  place whispers on landing and a break between shows "N min later"; still a pure function of the time and the jump.
- **S3 a whisper lives and dies under a longer card: accepted.** RY22.
- **S4 a run of photos ranks photos by their order: the owner's call.** As written (RY3), every photo from the sixth on in a town
  walk stands at 55%. The steward's shape: tighten only photos at one stop (12% each, the last at full time), and a photo reached
  after any stretch gets its full 4.5 s. Recommended: the steward's. Asked below.
- **S5 a wordless chevron beside a near-synonym: accepted into RY12** as a second cold-find task, with the word "Next" as the
  fallback. The glyph itself is the owner's call, asked below.
- **S6 on a walk with one moment or none the button never appears: accepted.** The deploy's live task and the owner's pictures use
  a walk with three or more moments, and "Where to find it" says it shows only while a moment lies ahead.
- **S7 "Later slices" recorded calls the gate has not seen: accepted.** They are now headed as leanings, each gated before its spec.
- **S8 the cap's record put off: accepted.** Decision 0200 is written with this plan.
- **S9 precedent: accepted.** Story players' segments are recorded as a counter-example; the hold lengths are said to have no
  verified precedent.
- **Silent, kept as they are and said here:** no ceiling on length (the owner's call; memos and videos were never capped); no "back
  a moment" (a press mid-memo cuts it, as Skip does; deferred); the jump is not animated even when the clock leaps hours (RY21 says
  how much later it is). **Accepted:** RY18 covers what a screen reader is told.

Tests added for them, in `pace.test.ts`: RY7 (a six-word note before a card stays its reading time), RY21 (a press over a passed
place and over a break: the frame on landing has the whisper and the line), RY22 (a whisper due under a card starts when the card
has gone). `Showing.frame(ms, from?)` takes where a press came from; the clock hook keeps it until its lines have run.
