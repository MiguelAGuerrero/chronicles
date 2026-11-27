# A walk left running: investigation (2026-11-27)

From: the owner's /investigate, 2026-11-27: "I noticed sometimes I forget to stop a walk and there go hours and hours
of the last activity so that needs to be a smart way to infer like do you wanna trim this walk down so that it's not
20 hours of nothing till the last known point". Queued as G16. Status: queued.

## What exists already

Nothing about a forgotten Stop: no inbox entry, `docs/DEFERRED.md` item, decision, spec criterion or ledger `declined`
line mentions a forgotten Stop, an auto-stop, an idle walk, a long still at the end or trimming a walk's end (searched
`docs/`, `specs/`, `.claude/rules/`, the ledger, the run and walk logs, Nov 27). What the app has, and why none of it
reaches this case:

- **Pauses** (`.claude/rules/recording-and-traces.md`): a pause is a break, its time is not walking time, and after
  10 min paused a sticky line and, on a phone, a notification remind ("Your walk is still paused",
  `src/lib/notify/core.ts`, `PAUSE_REMIND_MS`). Only a walk the walker paused is reminded of; a walk left running
  never is.
- **Still spells and standstills** (`holdStill`, `dwellsOf`): they hold a standing walker at one spot and stop the
  jitter counting as distance. They never end a walk or shorten its time.
- **Gaps and fills** (`.claude/rules/gaps.md`, G1, decision 0071): a break of more than 60 s and at most 30 min is a
  gap and is filled; a longer one is left as a break, drawn as a dotted hop in the replay (RC18).
- **`readTrace`** (`src/lib/rides.ts:201`) gates raw fixes by accuracy, staleness before the start, rides and speed.
  It has no notion of the walk's end: every fix stored is read.
- **The empty-walk drop** (EW1, `src/lib/session.ts`, `endWalk`): a walk holding nothing is dropped at Stop with an
  Undo. A forgotten walk holds its first stretch, so it stays, whole.

## What the owner saw

Pictured on the web build at 390 x 844 (device scale 1): a walk on the e2e's street grid, about a minute long, left
running, the page opened again 20 hours later about 400 m away (the `before-` pictures in `docs/mockups/forgotten-stop/`).

| Mark | What it shows | Drawn by |
|---|---|---|
| The walk strip, "20 h 01 min · 294 m" | the time since Start, less pauses | `src/app/walk.tsx:150` (`elapsed`), `:159` |
| The recording bar, "20:01" over Chronicle | the same time, shorter | `src/lib/recordingBar.ts:43` |
| Paused, Resume and Stop | the only way to Stop on the walk screen (0220); the bar has its own held Stop (0048) | `src/app/walk.tsx` `stop()`, `src/components/RecordingBar.tsx` |
| The replay card, "294 m · 20 h 01 min · one street walked" | `duration_ms`, Stop's time less the start and pauses | `src/lib/finish.ts:130,139`; `src/app/replay/[id].tsx:565` |
| The end mark, at the next day's spot | the last point of the last run | `src/lib/traceEnds.ts:10`; `WalkMap.web.tsx:1238` |
| The dotted line from the walk's last corner to that spot | a break over 30 min, crossed by a hop | `src/lib/ceremony/rhythm.ts` (RC18) |
| Chronicle's row, "Nov 26, 2026 · 294 m · 20 h 01 min" | the same summary | `src/lib/quietLines.ts:44` (`walkRowMeta`) |
| Days, "Yesterday · One walk" | the walk under the day it started (M6) | `src/lib/days.ts` |
| The walk's More (⋯): Rename, Share GPS log, Delete walk | no way to change a walk's end | `src/components/WalkActions.tsx` |

Found on the way: at 320 px the paused strip reads "Resu…" beside "20 h 01 min · 294 m"
(`before-paused-320.png`): Resume's word is cut beside a day-long time (the width where it starts to cut was not measured). The walk journey
measures "an hour-long walk's numbers at 320"; a day-long one does not fit. Recorded here for the slice to fix with
its strip; not filed apart.

## Why it reads wrong

1. **A walk ends only at a held Stop, at the moment of the hold.** `stopWalk` writes `ended_at: Date.now()`
   (`src/lib/session.ts:60-62`); a walk "stays open until the user taps stop" (`src/lib/types.ts:17`). Every number
   after it is that time less the start and the pauses (`finish.ts:139`), so the card, the row and the strip say
   20 hours.
2. **Nothing notices that a running walk went quiet.** The only reminder is for a pause (`notify/core.ts:12,137`);
   nothing reads the trace for a long quiet end, at Stop or before it.
3. **Opening the app again records where the phone is now, into the old walk.** `reconcileOpenWalk`
   (`session.ts:140-151`) re-attaches the recorder to the open walk; the next day's fixes join it after a break,
   so the end mark lands at home and a dotted hop crosses the hours (`traceEnds.ts:10`, RC18). The areas and streets
   near that spot can be credited to the walk.
4. **Reading has no end.** `readTrace` (`rides.ts:201-241`) reads every stored fix; there is no rule that stops a
   walk's trace at a time earlier than its last fix, so even a moved `ended_at` alone would leave the tail drawn.
5. **On a phone, the recorder takes a fix every second for as long as it runs** (`recorder/index.native.ts:110-114`:
   `distanceInterval: 0`, `timeInterval: 1000`, `pausesUpdatesAutomatically: false`): a forgotten walk is a day of
   background location, which is "All-day tracking" (VISION.md Never, 0036) in practice, and the battery's cost.
   Never seen on a phone; on the web a hidden page records nothing, so the tail is one long break.

On purpose, and the owner's: Stop is held, and only after Pause on the walk screen (0220); the bar's Stop is held with
no Pause (0048); a walk is never ended by the app.

## How adjacent apps do it

From `docs/research/adjacent-apps.md`, "End a recording left running; trim its end" (added by this run):

- **Apple Watch Workout**: an End Workout Reminder, on by default, "in case you get distracted when you're cooling
  down"; it asks, it does not end. **Verified** (support.apple.com, watchOS 8 guide, read Nov 27).
- **Strava**: Crop, from the activity's ellipsis menu, trims the start or end; not undoable. **Unverified**.
- **AllTrails**: crop a recording's length; the end point dragged back for a session left running. **Unverified**.
- **Garmin Connect**: Edit › Trim Activity by time or distance, stats recalculated. **Unverified**.
- **Gaia GPS**: crop the start or finish of a track. **Unverified**.

None ends a recording by itself, and none offers the cut point it infers: the asking at Stop, with the point already
found, departs from all of them, for the owner's own words ("do you wanna trim this walk down").

## Options

| # | The change | Answers | Vision risk | Rough cost |
|---|---|---|---|---|
| A | **Leave it.** | none | none; the card, the row and the year keep "20 h"; the end mark can sit at home | none |
| B | **Ask at Stop.** A held Stop on a walk whose last activity was 30 min or more ago asks "This walk went quiet at 8:35 PM yesterday." End it at 8:35 PM / Keep it all. Ending there moves the walk's end; the tail's fixes stay stored and are read out. | 1, 3, 4 | low: offered, never done; only the tail | M: a core rule, the stop's two callers, the read's end, `SNAP_RULES` |
| C | **A More (⋯) row for walks already kept**, "End it where it went quiet", asking the same | 1, 3, 4 (after the fact) | low | S on top of B (`WalkActions`) |
| D | **A reminder while it runs**: a phone notification once after a long quiet, like the pause's | 2, 5 | Never "Nagging" if repeated; notifications are the owner's (0157) | S, native only (a hidden page cannot know) |
| E | **End it by itself** after hours of quiet, at the quiet point | 1-5 | high: the app decides; reverses "open until the user taps stop" | M |

## The owner's calls

Asked in person, 2026-11-27, the rendered mock-up shown (`docs/mockups/forgotten-stop/mockup.html`; its Design canvas
could not be published from the session). Decision 0272 records them, amending 0048, 0220 and 0041.

1. **The look**: the ask at a held Stop and a More (⋯) row, as drawn; or the other shape, ended there by itself with an
   Undo; or redraw. Answer: **"Ask, as drawn (Recommended)"**.
2. **How long quiet before Stop asks**: 30 minutes, 1 hour or 2 hours. Answer: **"30 minutes (Recommended)"**.
3. **How a shortened end is kept** (an architecture call): move the walk's end back, later readings kept and read out
   (`SNAP_RULES`, no migration); a pause over the quiet hours; or a new kept row for the cut (a migration). Answer:
   **"Move the walk's end back (Recommended)"**.
4. **A reminder while a forgotten walk runs** (0157): none, ask only at Stop; one phone notification after 2 hours
   quiet; or that and an end by itself after 12 hours. Answer: **"No; ask only at Stop (Recommended)"**.

Engineering choices made here, not asked: a ride counts as activity (it is kept travel, drawn and measured), so a
forgotten walk that rode home is offered its end after the ride; the cut is offered only at the last activity, never
at a point the walker picks (a scrubber like Strava's Crop is a later slice if ever wanted).

## The recommendation

B with C, one slice: the offer at both Stops and the row for walks already kept. D and E are left out (the owner
asked for an offer, and answered no to a reminder). /vision was not run again: the answers kept the shape.

```
## Vision
Idea: When a walk is left running, the app infers where it went quiet and offers to trim it there, so it is not 20 hours of nothing to the last known point.
Verb: honour (the walk is kept as it happened: its time and its end where the walking stopped) and return (the replay, its card, the row and the day give it back truthfully)
Touches: Never "All-day tracking" (0036: a forgotten walk is a day of tracking; the trim takes it back out of the walk); Never "Editing out the lows" and Always "The lows stay in" (0001: only the quiet tail after the last activity, never a sit mid-walk, a capture or a ride); Never "Nagging" (no reminder while it runs; the ask comes only at the Stop the walker holds, and once); Always "Moments and the trace are truth; streets, areas and summaries are recomputed" (the raw fixes stay stored; the end moves and the derived is recomputed, `SNAP_RULES`); Always "Restraint" (one card, a time of day, no count); decisions 0220, 0048, 0071, 0157 (notifications are the owner's)
Verdict: aligned if reshaped
Shape: an offer at Stop and in the walk's More (⋯), never an automatic trim or stop; the cut only at the last activity (walking on, a ride, a capture, a Resume) and only when the quiet after it is 30 min or more; the words a time of day; no notification
Precedent: Apple Watch's End Workout Reminder asks rather than ends (verified); Strava's Crop, AllTrails' crop and Garmin's Trim Activity trim the end by hand afterwards (unverified). docs/research/adjacent-apps.md, "End a recording left running; trim its end"
Criteria: nothing ends or trims a walk without the walker's tap; no moment, ride or walking before the quiet point is ever cut; the walk's raw readings are never deleted by a trim; the ask and the row say a time of day, never a count or a number of hours; nothing is notified
Open: none (the threshold, how the trim is kept and a reminder were the owner's, answered Nov 27, decision 0272)
```

**Size: M.** The criteria (Done when, below, restated): 1. the quiet point found on the web's shape (one long break,
then standing) and the phone's (a long stay, a fix a second) alike, within a minute; 2. a sit mid-walk, a capture, a
ride or a Resume after it is never cut; 3. the walk screen's held Stop asks only on a quiet end of 30 min or more, else
ends as today; 4. the bar's held Stop asks the same; 5. End it moves the walk's end, and the replay, its card, the row,
the day, the end mark and the areas read the walk up to it; 6. Keep it all is today's Stop exactly; 7. the More (⋯)
row on a kept walk, with the same ask, gone once used; 8. the raw readings stay stored and Share GPS log keeps them; 9.
`SNAP_RULES` bumped, so kept walks read again; 10. the strip's Resume and Stop whole at 320 px with a day-long time.
About nine source files (below), no migration (the end is the walk's own `ended_at`, decision 0272); native: the bar's and the walk
screen's Stop on a phone, and the phone's shape of a quiet end, never seen on one.

## Done when

On the web build at 390 x 844, a walk left running and opened 20 hours later, its Stop held: the walk screen asks
whether to end it where it went quiet, and with End it the replay's card, Chronicle's row and the day say the walk's
own time, its end mark sits where the walking stopped, and no dotted line runs to where the phone was the next day.

## What the slice will touch

- A new core module in `src/lib/` (quietEnd, say): the quiet point from the read trace, the moments, the rides, the pauses and the
  stills; tests first, on two fixtures (a long break; a long stay of 1 Hz fixes).
- `src/lib/rides.ts` (`readTrace`) or its loaders: a walk's trace stops at its end; `src/lib/tiles.ts`, `SNAP_RULES`.
- `src/lib/session.ts`: `stopWalk` at a given time, and moving a kept walk's end.
- `src/lib/unsaved/stopEnd/`: the stop's answer gains the quiet point, as it carries `warn` today.
- `src/app/walk.tsx`, `src/components/RecordingBar.tsx`: the ask; `src/components/WalkActions.tsx`: the row.
- A copy module for the words (one place, asserted verbatim).
- Journeys: `walk` (the ask, both answers, 320 px), `tabs` (the bar's Stop), `replay` (the card and end mark), a fixture
  walk with a 20 h tail. Checks first: `npm run check:affected`; the e2e's `toStop` pauses first.

## Open for the owner

None: the four calls were answered in person on Nov 27; the words on the card and the row are the drawn ones the owner approved.

## Engineering unknowns

- What counts as walking on after a stay: the read trace leaving its last spot by more than its reach (settled jitter
  never counts); the builder settles it on the two fixtures, and on `outAndBack.json` and `eastonSlow.json` so a slow
  walk is never read as quiet.
- Whether the end is applied in `readTrace` (eleven callers) or where the trace is loaded; either way it is a
  derivation rule, so `SNAP_RULES` moves.
- `pausedMs` and the pause Stop adds after the quiet point: clipped at the new end.
- The day's replay (M10-M14) and Where I've been (`pastLines`, built at Stop) must read the moved end; a line already
  built is rebuilt.
- Never run on a phone: the native recorder's day of 1 Hz fixes (its size and the read's cost over 70,000 fixes), the
  bar's Stop and the walk screen's ask on iOS and Android.
