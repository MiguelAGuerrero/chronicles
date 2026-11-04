# Replay rhythm: plan

The owner gave the go-ahead on Nov 4, adding one call: the ceremony must be a view of the data, swappable, never baked into it (RR20-RR22, decision 0086). No new data, no migration, no new dependency, no new route. One new map prop (`followZoom`) on both platforms.

## The shape: a story, ceremonies, one stage

```
ReplayData / a Day ──► story (core) ──► ceremony.plan (core) ──► ceremony.frame(plan, ms) (core) ──► Stage (view)
                         what happened     how to tell it            what is on screen at ms             draws overlays by kind
```

- **The story** (`src/lib/ceremony/story.ts`, core) says what happened, in time order, with no timing or look:
  - **paths:** each walk's timed runs, with the distance along them;
  - **moves:** along a path between two times, with metres;
  - **moments:** grouped captures, with where, and when you arrived and left (the still time around them, read from the trace);
  - **breaks:** a gap or pause in a trace;
  - **travel:** between a day's entries, from a point to a point, with how long it took;
  - **passes:** places passed without stopping, with where and when.

  `walkStory(ReplayData)` and `dayStory(day, walks)` give the same kind of story (RR20).
- **A ceremony** (`src/lib/ceremony/types.ts`) is `{ id, plan(story, opts), frame(plan, ms) }`, all core. A frame holds:
  - where the walker is, how far each path is drawn, and which pins have appeared;
  - the camera's pull-back and the dim of a cut;
  - the clock and the line under it;
  - a list of overlays, each `{ kind, ... }`.
- **The rhythm** (`src/lib/ceremony/rhythm.ts`) is the first ceremony. `CEREMONIES` (`src/lib/ceremony/registry.ts`) maps an id to a ceremony. `DEFAULT_CEREMONY` is `'rhythm'`.
- **The stage** (`src/components/ceremony/Stage.tsx`) draws a frame's overlays through `OVERLAYS`, a map from overlay kind to view. The screens hand it frames and never look inside a ceremony.

  A greenery ceremony would be a new `plan` and `frame` (it might read the story's paths against parks), an entry in `CEREMONIES`, and a view in `OVERLAYS` for any new overlay kind. The story, the screens and the rhythm stay as they are (RR21).
- **The screen reader's path** (`src/components/ceremony/StepThrough.tsx`) shows the same story's moments one at a time with Continue, as both screens do today (RR17, RR22).

The screens keep their 33 ms tick and the beat clock (`phase = { beat, t0 }`) for the beats. Inside the path, the time into the ceremony is the only state: holding stops it, Skip jumps it to the end.

## Files

**Core (pure, tests first)**

- `src/lib/ceremony/story.ts`:
  - `walkStory(r)` and `dayStory(day, walks)`.
  - `pathIndex`: cumulative metres per run point, with `metresAt(t)` and `timeAtMetres(m)`.
  - `stillAround(path, t0, t1)`: the still time around a moment.
- `src/lib/ceremony/types.ts`: `Story`, `Ceremony`, `Frame`, `Overlay`.
- `src/lib/ceremony/rhythm.ts`: `rhythm.plan` (legs, stops and slots, cuts, travel, the soft cap) and `rhythm.frame`. Also `laterLine`, `notePause`.
- `src/lib/ceremony/registry.ts`: `CEREMONIES`, `DEFAULT_CEREMONY`, `ceremonyFor(id)`.
- `src/lib/motionTokens.ts`: `REPLAY_RHYTHM` (the prototype's numbers, plus `baseZoom` 16, the walking zoom).
- `src/lib/explore/explore.ts`: `passedAlong(o)`, the places `passedPlaces` names, with where each is and when the walk first came within reach.
- `src/lib/replay.ts`: keeps `FOG_MS`, `groupCaptures`, `timedRuns`, `traceUntil` and `walkerAt`. `schedule`, `activeClock`, `walkTimeAt`, `nextStop` and `PATH_MS` go. Their tests in `core.test.ts` and the two R10 tests in `rides.test.ts` are rewritten against the rhythm: a ride is a stretch like any other, so it takes at most glide plus zip, under R10's 4 s.
- `src/lib/days.ts`: `dayPlan`, `stepFrames`, `walkPlay`, `walkDrawnAt` and `FLY_MS` go, replaced by `dayStory`. Their M10, M11, M14 and audit tests become RR16 tests on the story and the rhythm.

**Shell / data read**

- `src/lib/summary.ts`: `ReplayData.passed` gains `at` and `t` (read-time cache, nothing stored).

**Views**

- `src/components/ceremony/`:
  - `Stage.tsx`: the clock, the line under it, the hold pill and the overlays.
  - `overlays.tsx`: the `OVERLAYS` registry.
  - `RollingClock.tsx`, `Bubbles.tsx` (notes and memos, with a memo player that pauses on hold), `MomentCard.tsx` (photo or video, with a video player that pauses on hold), `Pile.tsx`, `Whisper.tsx`.
  - `StepThrough.tsx`: the screen reader's path.
  - `useCeremonyClock.ts`: the time into the ceremony, with hold and skip.
- `src/components/map/types.ts`, `WalkMap.web.tsx`, `WalkMap.native.tsx`: `followZoom?: number`.
- `src/app/replay/[id].tsx` and `src/app/day/[key].tsx`: the path beat is the stage over the map, with Hold beside Skip and the pile and bubbles opening `CaptureViewer`. The card, naming and gaps are unchanged.

**Docs**

- Decision records `0085-the-replay-flows.md` and `0086-ceremonies-are-views.md`.
- `.claude/rules/replay.md` and `.claude/rules/moments-and-days.md` rewritten where they describe stops.
- `docs/PRODUCT.md`, `docs/ARCHITECTURE.md` (the codemap rows), `specs/moments-and-days/spec.md` (M10-M12 amended), `docs/STATUS.md`, `docs/NATIVE_UNVERIFIED.md`, `docs/DEFERRED.md`.

## Data

None new. No SQLite migration, no IndexedDB version. `ReplayData.passed` gains two derived fields at read time. `day_watched:<key>` is no longer read (nothing auto-advances any more). It is still written, and its removal is deferred.

## Tests, per criterion

Unit tests: `src/lib/__tests__/ceremony.test.ts`, unless named otherwise.

| Id | Test |
|---|---|
| RR1 | `RR1: a stretch's time follows its length, not the minutes walked; standing takes none` |
| RR2 | `RR2: the walker slows into a moment and away from it; a long stretch covers most ground mid-way` |
| RR3 | `RR3: the camera pulls back mid-way through a long stretch and not between nearby moments` |
| RR4 | `RR4: a break in the trace is a cut with "N min later"; the walker never crosses it`; `RR4: laterLine says minutes and hours` |
| RR5 | `RR5: a plan over 60 s shrinks to fit, above its floors; memos and videos keep their length` |
| RR6 | e2e `replay`: both replays reach their cards with no tap, and no Continue shows |
| RR7 | `RR7: a frame is a function of the time alone, so holding the time holds everything`; e2e: a tap holds (the clock text stays for 1.2 s), a tap goes on, Hold reads Play while held |
| RR8 | `RR8: the clock runs from arrival to leaving at a moment, with the walker between, and through a cut` |
| RR9 | `RR9: notes enter as the walker arrives, at most three, each out after 9 s or when pushed`; `RR9: a note's pause grows with its words, at most 3 s`; e2e: the note shows in a bubble over the map |
| RR10 | `RR10: a memo holds the walker for its length, in a bubble` |
| RR11 | `RR11: a photo grows, holds 2.4 s, tucks, and stays in the pile`; e2e: the caption's card shows, then the pile, with no digits |
| RR12 | `RR12: a video holds for its length plus the grow and the tuck` |
| RR13 | e2e: pressing the pile opens the viewer and the clock stays put until it closes |
| RR14 | `RR14: moments taken together play in time order at one stop; a pin appears as the walker arrives` |
| RR15 | `explore.test.ts`: `RR15: passedAlong gives where and when each passed place came within reach`; `ceremony.test.ts`: `RR15: a passed place whispers as the walker reaches it, without slowing it` |
| RR16 | `RR16: a day glides between its entries, says how much later, and plays each walk's rhythm`; e2e: Replay this day reaches its card with no tap |
| RR17 | the steps keep today's behaviour; native only, listed in `docs/NATIVE_UNVERIFIED.md` |
| RR18 | `RR18: with reduce motion there is no pull-back and cards fade instead of moving` |
| RR19 | e2e: during the path nothing shows a digit outside the clock; the card's existing scans still pass |
| RR20 | `RR20: a walk's story holds its paths, moments with arrival and leaving, breaks and passes, and no timing`; `RR20: a day's story has the same shape, with travel between entries` |
| RR21 | `RR21: the registry gives the rhythm by default, and any ceremony honouring the interface plays through the same frame contract` (a stub ceremony test); `RR21: every overlay kind the rhythm emits has a view` (`overlays` keys checked against the rhythm's kinds, without importing React Native) |
| RR22 | `RR22: the screen reader's steps are the story's moments in order` |

**The e2e:** a new journey `replay` (`E2E_ONLY=replay`), with a row in `scripts/e2e-scenarios.js`.
- It seeds a walk into IndexedDB, as `gaps` does: a note, a captioned photo and a memo, a 20-minute gap, and a long stretch. Then it watches its replay and that day's.
- The full flow's replay and day blocks that click Continue are rewritten in the same commit. The full flow runs only when you ask.

## Audits

At least two adversarial passes (the owner, Nov 4), each by the `auditor` subagent without my conclusions. Every finding is triaged (accept, defer or reject, with reasons). Each accepted one gets a regression test named `replay-rhythm audit N` before its fix. The second pass runs after the first pass's fixes.

## Deferred

- **Tuned numbers.** Only `REPLAY_RHYTHM` changes when you send them.
- **Removing `day_watched`.**
- **A setting or rule that picks a ceremony per walk or day.** The registry is ready; nothing chooses yet.
- **Highlights.**

## Not run on a device

- `followZoom` on MapLibre RN's Camera, every frame.
- The overlays' motion on native.
- Pausing and resuming a memo (expo-audio) and a video (expo-video) on hold.
- The screen reader's path (RR17).

## Risk

The replay renders every 33 ms, and the overlays add to each frame. Each overlay view takes plain numbers, and the camera zoom is rounded before it reaches the map. If the iPhone web build drops frames, the fallback is `Animated` timings started at each overlay's entry.
