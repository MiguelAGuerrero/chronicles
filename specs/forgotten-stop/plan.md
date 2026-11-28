# Plan: a walk left running, Stop offers to end it where it went quiet (QE1-QE10)

From G16 (decision 0272), under `/tend inbox G16 yes`; the brief is `docs/research/forgotten-stop.md`. Read by the
steward, not held for the owner (slice `--from`).

## The base it lands on

`node scripts/tend.js base walk-screen tabs replay recording`, Nov 28:

- lands on a rough base: walk-screen (a change since its sweep added a screen or a control (85af994, 264773e, 5212633, 1b4d486, 0cee290))
- lands on a rough base: tabs (a change since its sweep added a screen or a control (0e9a2e0, 1b4d486))
- lands on a rough base: replay (a change since its sweep added a screen or a control (d7d2a86, 678bfda, 3d7c93d))
- recording is unseen: nothing above low open (never swept)

A warning: the slice builds only QE1-QE10 and takes none of those items on.

## Files (source: 15, in three commits of at most 8)

| File | Change |
|---|---|
| `src/lib/quietEnd/core.ts` (new, core) | `QUIET_MS` (30 min, 0272). `quietPoint({ tr, captures, pauses, startedAt })`: the latest of the last walking on, the last ride's end, the last capture (a piece's own time) and the last Resume (a closed pause's end); null when the walk holds none. Walking on: per run of walked fixes between breaks (a pause, a ride, a gap over a minute, `isBreak`), the arrival at the run's final spot, the first fix after the last three in a row beyond its reach (`STILL_REACH_M` 50 m, or three times the spot's accuracy, as `holdStill` reads a leave); a run that never leaves its own spot (the standing fixes after the web's long break, a phone's day at one spot) is no walking on. `quietEndAt(input, now)`: the point when `now` is 30 min or more after it, else null. `untilEnd(points, endedAt)`: the fixes up to a walk's end. The words: `quietLine(at, now)` "This walk went quiet at 8:35 pm[ yesterday \| on Thu, Nov 26].", `endItLabel(at)` "End it at 8:35 pm", `KEEP_IT_ALL`, `QUIET_ROW` "End it where it went quiet", `quietRowHint(at, now)` "At 8:35 pm on Thu, Nov 26; the hours after it leave the walk". The clock and the day are `clockOf` (`lib/moment.ts`) and `dayLabel` (`lib/days.ts`): no new reading of the device's clock in core. |
| `src/lib/quietEnd/shell.ts` (new) | `createQuietEnd(p: Pick<Ports, 'db' \| 'clock'>, deps)`: `at(walkId)` reads the walk, its points (up to its end when it has one), pauses, stills and moments, `readTrace` with all of them, and returns `quietEndAt(…, end)`, `end` the walk's own end when it has one (a kept walk: quiet 30 min or more before its end), else `clock.now()` (a Stop); `endAt(walkId, at)` moves a kept walk's end (`db.updateWalk({ ended_at: at })`, only back, only to the walk's own quiet point read again), then snaps it again (`deps.snap`, as Keep or Not this way does), builds its Where I've been line again (`deps.rebuildLine`) and says the walk changed (`deps.changed`). |
| `src/lib/quietEnd/index.ts` (new, instance) | The app's instance: `ports`, `snapWalk` with `tileCollector()`, `pastLines.build`, `notifyWalkChanged`. |
| `src/lib/session.ts` | `stopWalk(walkId, endAt?)` and `endWalk(walkId, { leaves, endAt })`: the end written is `endAt` when given (End it), else the hold's time; an open pause still ends at the hold's time (`pausedMs` clips it at the end). |
| `src/lib/unsaved/stopEnd/shell.ts` | `stopEnd(walkId, { …, quiet })`: after the unsaved warning (UN5 first, as today) and before anything ends, a Stop with no `quiet` answer asks `deps.quietAt(walkId)`; a point returns `{ quiet: at }` and ends nothing; `quiet: 'keep'` is today's Stop exactly; `quiet: <at>` ends the walk at `at`. A failed read of the point is no point: the Stop goes on as today (never trapped). |
| `src/lib/unsaved/stopEnd/index.ts` | Wires `quietEnd.at`. |
| `src/lib/summary.ts` | `loadReplay` reads the points `untilEnd(points, walk.ended_at)`: the replay, its card's map, its end mark and the day read the walk up to its end. |
| `src/lib/finish.ts` | `snapWalk` the same: the summary's distance and time, the streets (`snap`), the areas (`assignAreas`) and the moments' places. |
| `src/lib/pastLines/shell.ts` | `buildWalk` the same: Where I've been. |
| `src/lib/tiles.ts` | `SNAP_RULES` 9 to 10: "a walk is read up to its end; readings after it stay stored (forgotten stop, QE8)". |
| `src/components/QuietEndAsk.tsx` (new, view) | The card as drawn: white, rounded, the line, then "End it at <time>" (the accent, filled, the one) and the second button (outlined: "Keep it all", or "Cancel" in the More); side by side, stacked below the width where both do not fit (`confirmActions`, as `ConfirmCard`); a header the screen reader lands on (`focusOn`); Escape and Back are the host's. |
| `src/app/walk.tsx` | `stop()` passes the answer; `{ quiet }` shows the card above the strip, the strip unchanged beneath it; End it and Keep it all each run the Stop again with their answer (the hold is not asked twice); a tap outside or Back closes the card and ends nothing. QE10: the paused strip's numbers wrap to two lines before Resume's or Stop's word is cut (`numberOfLines={2}`, the buttons a minimum width that holds "Resume" at 14 px). |
| `src/components/RecordingBar.tsx` | `endWalk` the same: the card above the bar, where the discarded-memo pill sits (the pill hidden while it shows), the bar unchanged; each answer runs the bar's end again (`barStops`). |
| `src/components/WalkActions.tsx` | Reads `quietEnd.at` with the plan; with a point, the row "End it where it went quiet" with its hint, between Rename and Share GPS log, as drawn; a tap shows `QuietEndAsk` in the same sheet ("End it at <time>", Cancel); End it moves the end (`quietEnd.endAt`) and closes the sheet; `onEnded` tells the host. |
| `src/app/replay/[id].tsx` | `onEnded`: `loadReplay` again (the snap already ran), so the card, the map and the end mark follow. |
| `src/app/(tabs)/index.tsx` | `onEnded`: the walk rows read again (if `notifyWalkChanged` does not already reach them; read at the code). |
| `scripts/features.js` | `IN_PROGRESS` entry; `src/lib/quietEnd/**` under `recording`; the spec under `walk-screen`; the journey `quietend` under `walk-screen`. |

Docs: this spec and plan; AGENTS.md's "Truth vs cache" line, "(deletes and a moved end aside)" (0272's consequences;
a process file: a lease first, `ship.md`, "Open the worktree", step 6, taken just before that edit);
`.claude/rules/recording-and-traces.md` (lines added: the quiet point, the read's end); `docs/ARCHITECTURE.md` (the
module, the read's end); `docs/TESTING.md` (the journey's row); `docs/PRODUCT.md`; `docs/NATIVE_UNVERIFIED.md` (`native
item add`); `docs/research/forgotten-stop.md`'s `Status:`.

## Data

No new truth, no cache, no migration (0272): End it writes the walk's own `ended_at`, earlier than the hold; the
readings after it stay in `trace_point`. A derivation rule changes (a walk is read up to its end): `SNAP_RULES` 10, so
every kept walk is snapped again at its next replay. A kept walk whose readings all fall before its `ended_at` (every
walk stopped by a hold, the late batch rule aside) reads the same: the differential (`*.test.ts` in the scratchpad, for
the auditor) reads each of the repo's walk fixtures old and new and compares the summaries.

## Tests per criterion

| Id | Test | Name |
|---|---|---|
| QE1 | unit, core: a web-shaped tail (a minute's walking on the grid, a 20 h break, eight standing fixes 400 m away) and a phone-shaped one (the same walking, then 2 h of 1 Hz fixes within 20 m of its last corner, with jitter and one lone far fix) give the same point, within a minute of the last corner's time | `QE1: …` |
| QE2 | unit, core: a 40 min sit then walking on; a capture after the sit; a ride after it; a Resume after it: each the later time, never the sit; `outAndBack.json` and `eastonSlow.json` read at their own end are never quiet 30 min before it | `QE2: …` |
| QE3 | unit, shell (`stopEnd`): a point 30 min or more back returns `{ quiet }` and ends nothing; 29 min ends as today; a warning (UN5) still comes first | `QE3: …` |
| QE3 | journey `quietend`: the walk left running, shifted 20 h, opened, paused, Stop held: the card shows the line and both buttons, the walk still open; pictured at 390 and 320 | `QE3: …` |
| QE4 | journey: minimized, Chronicle in front, the bar's Stop held: the same card above the bar, the same words | `QE4: …` |
| QE5 | unit, core: `untilEnd` keeps the fixes up to the end, the end's own included | `QE5: …` |
| QE5 | unit, shell: `pastLines` builds the line up to the walk's end (fakePorts), and `loadReplay` and `snapWalk` read `untilEnd` (their wiring, by source, as `arrivals.test.ts` holds the replay's) | `QE5: …` |
| QE5 | journey: End it: the replay's card says "1 min", not "20 h"; no dotted hop; the end mark at the last corner; Chronicle's row and the day say the walk's own time | `QE5: …` |
| QE6 | unit, shell: `quiet: 'keep'` ends at the hold's time, the same calls as a Stop on a walk with no point | `QE6: …` |
| QE6 | journey: Keep it all opens the replay with the day-long time, as today | `QE6: …` |
| QE7 | unit, shell (`quietEnd`): `endAt` moves `ended_at` back to the point, snaps, rebuilds the line, says the walk changed; a point read again after it is none | `QE7: …` |
| QE7 | journey: the kept walk's ⋯ on the card shows the row; its ask, End it; the card's time follows; ⋯ again, no row; the same row on Chronicle's walk row | `QE7: …` |
| QE8 | unit, shell: after an end moved, Share GPS log's text (`walkLogText`) still holds the tail's readings; `SNAP_RULES` is "10" | `QE8: …` |
| QE9 | unit, core: the words say a clock time and "yesterday" or a day, no digits but the clock's, no "hours" with a number, no count (`check:vision` runs in CI); unit, shell: nothing calls the notifier, and nothing ends a walk but a Stop's answer | `QE9: …` |
| QE10 | journey: paused, a day-long time, at 320: Resume's and Stop's words are whole (each label's `scrollWidth` within its box) | `QE10: …` |

## The testing's size

Build (docs/TESTING.md, "Size the testing to the change"): the recorder's end, the trace's read, the replay and two
screens. Journeys: `quietend` (new, about 4 min), `walk` (holds the strip's numbers at 320 and the Stop; a changed
strip), `tabs` (the bar's Stop), `replay` (the read), and `launch`. Grep for `testID="stop"`, `bar-stop`, `walk-actions`:
no control is removed or renamed.

## Deferred

- An Undo for a moved end: none drawn; the readings stay, so a later slice could add one (DEFERRED, `walk-screen`).
- The phone's day of 1 Hz fixes read at Stop (about 72,000 readings): the cost of one `readTrace`, as the replay already
  pays; measured only on a device (NATIVE_UNVERIFIED).

## Native paths that will not run on a device

The walk screen's and the bar's ask on iOS and Android (the card over the strip, the hold then the card); the phone's
shape of a quiet end (a day of 1 Hz background fixes at one spot, its jitter, the read's time over it). Each a `native
item add` with **Do** and **Expect**.

## Cost

At Stop, one more read of the walk (its points, pauses, stills, moments, `readTrace`), the same read the replay makes
right after: a 4-hour walk on foot about 14,000 fixes at 1 Hz on a phone, a forgotten one up to 72,000. In the More, the
same read once as the sheet opens, as `planWalk` and the GPS log already read it. Nothing per frame or per fix. Harness:
none on the web (a hidden page records nothing); device only.

## The screens, one line per action

| Action | Goal, how often, situation | Control | Matrix | Adjacent apps |
|---|---|---|---|---|
| Answer the ask at Stop | End a forgotten walk truthfully; rare (a forgotten walk), at home the next day, two hands | A card above the strip: the line, "End it at <time>" filled, "Keep it all" outlined; stacked at 320 | 6 (clarify an action the person started: two choices, a basic dialog) | Apple Watch asks before it ends; none offers the point |
| Answer the ask at the bar's Stop | The same, from Chronicle or Explore | The same card above the bar | 6 | as above |
| End a kept walk where it went quiet | Correct a walk kept whole; rare, at home | A row in the walk's More (⋯), then the same card with Cancel | 3 (a rare secondary action in More), 8 (a change not undone in the app: the specific verb, Cancel) | Strava's Crop and Garmin's Trim from the activity's menu |
| Resume or Stop on a paused walk at 320 | Every paused walk; one-handed | Resume and Stop, whole beside a day-long time | 22 | AllTrails' Resume and Finish |

**Where the owner will look first:** at the Stop they hold the next morning (the card comes to them); for a walk already
kept, the card's ⋯, where Rename and Delete are. **Defaults that make a control quieter, named so the owner can
overrule:** Keep it all is outlined, not filled, as drawn; the More row is a plain row, no accent, as drawn; the ask has
no ✕ (a tap outside or Back closes it and ends nothing, as a choice not made).

**Against precedent:** none of the four apps offers the cut point at the stop (the owner's own words asked for it);
Strava's Crop deletes the readings, this keeps them (Always, truth).

## Judgment calls for the steward

1. **The clock's case:** the drawing says "8:35 PM"; the app says every clock time as `clockOf` does, "8:35 pm" (the
   journal's dateline, a piece's "Added later"). Recommended: "8:35 pm", one clock across the app; the drawing's words
   otherwise kept.
2. **A day further back than yesterday:** the drawing shows "yesterday" only; recommended "on Thu, Nov 26"
   (`dayLabel`'s words), and the More row's hint the same way ("At 8:35 pm yesterday; …" or "… on Thu, Nov 26; …"),
   where the drawing wrote "on Nov 26".
3. **No activity at all** (a walk started and left before a step): no point, no ask, Stop as today; the empty-walk drop
   (EW1) still takes a walk that holds nothing.
4. **The ask's dismissal:** a tap outside the card or Back closes it and ends nothing (the walk stays open, paused);
   the next hold asks again. Not drawn; the matrix's row 6.
5. **"End it" filled while it changes the walk:** the matrix's row 8 avoids a destructive primary button; the owner
   approved it filled as drawn, and nothing is deleted (the readings stay), so it is kept.
6. **Lens 0** (walk-screen's lines are all proposed, awaiting the owner: tested provisionally, none drafted or amended):
   E-walk-screen-4 ("ending a walk to take a deliberate hold … and to bring the walk straight back as its replay") meets
   a question between the hold and the replay on a quiet walk only; judged still met (either answer opens the replay).
