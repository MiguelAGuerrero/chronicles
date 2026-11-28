<!-- Repo first: from the owner's proposal G16 (docs/STATUS.md, "Next evolutions"; filed 2026-11-27 from the owner's
     /investigate), answered yes in person 2026-11-27 ("G17 current position, G16 forgotten stop, T67-T69 walkability,
     TF27 follow-up"; G17 built first), built under `/tend inbox G16 yes` (decision 0272). Not a tab of the concept doc. -->

# A walk left running: Stop offers to end it where it went quiet (QE)

Nov 28, 2026 · the owner

The owner's words (/investigate, Nov 27): "I noticed sometimes I forget to stop a walk and there go hours and hours of the
last activity so that needs to be a smart way to infer like do you wanna trim this walk down so that it's not 20 hours of
nothing till the last known point".

The brief is `docs/research/forgotten-stop.md` (what the owner saw, the causes ranked, `file:line` references and the
owner's four calls); this slice builds G16's ten criteria and no more.

## Vision

```
Idea: When a walk is left running, the app infers where it went quiet and offers to trim it there, so it is not 20 hours of nothing to the last known point.
Verb: honour (the walk is kept as it happened: its time and its end where the walking stopped) and return (the replay, its card, the row and the day give it back truthfully)
Touches: Never "All-day tracking" (0036: a forgotten walk is a day of tracking; the trim takes it back out of the walk); Never "Editing out the lows" and Always "The lows stay in" (0001: only the quiet tail after the last activity, never a sit mid-walk, a capture or a ride); Never "Nagging" (no reminder while it runs; the ask comes only at the Stop the walker holds, and once); Always "Moments and the trace are truth; streets, areas and summaries are recomputed" (the raw fixes stay stored; the end moves and the derived is recomputed, `SNAP_RULES`); Always "Restraint" (one card, a time of day, no count); decisions 0220, 0048, 0071, 0157 (notifications are the owner's)
Verdict: aligned if reshaped
Shape: an offer at Stop and in the walk's More (⋯), never an automatic trim or stop; the cut only at the last activity (walking on, a ride, a capture, a Resume) and only when the quiet after it is 30 min or more; the words a time of day; no notification
Precedent: Apple Watch's End Workout Reminder asks rather than ends (verified); Strava's Crop, AllTrails' crop and Garmin's Trim Activity trim the end by hand afterwards (unverified). docs/research/adjacent-apps.md, "End a recording left running; trim its end"
Criteria: nothing ends or trims a walk without the walker's tap; no moment, ride or walking before the quiet point is ever cut; the walk's raw readings are never deleted by a trim; the ask and the row say a time of day, never a count or a number of hours; nothing is notified
Open: none (the threshold, how the trim is kept and a reminder were the owner's, answered Nov 27, decision 0272)
```

## Decisions

The owner's four calls, in person, 2026-11-27 (decision 0272, amending 0048, 0220 and 0041):

- **"Ask, as drawn (Recommended)"**: a held Stop, on the walk screen and on the recording bar, on a walk gone quiet asks
  once, in a card above the strip or the bar; a finished walk with a quiet end has one row in its More (⋯). Not the
  other shape drawn (ended there by itself, with an Undo).
- **"30 minutes (Recommended)"**: the ask shows only when the quiet after the last activity is 30 min or more, the
  longest break the app fills as a gap (0071).
- **"Move the walk's end back (Recommended)"**: End it writes the quiet time as the walk's `ended_at`; the readings after
  it stay stored and are left out when the walk is read; `SNAP_RULES` is bumped; no migration.
- **"No; ask only at Stop (Recommended)"**: no notification and no reminder while a walk runs; nothing ends a walk by
  itself.

## Mock-up

Drawing: `docs/mockups/forgotten-stop/mockup.html` and `mockup-full.png` (kept local: the canvas could not be published
from the session), the befores beside the asks at 390 and 320 px, the bar's ask, the replay's card after End it, the
More row, and the other shape (not recommended).
Approved: with G16, "Ask, as drawn (Recommended)" (the owner, 2026-11-27).

## How adjacent apps do it

The job: end a recording left running, and trim its end. From `docs/research/adjacent-apps.md`, "End a recording left
running; trim its end":

- **Apple Watch Workout** (watchOS 8 guide): "End Workout Reminder" "will also remind you to end your workout, in case
  you get distracted when you're cooling down"; on by default; it asks, it does not end. Source:
  https://support.apple.com/en-kz/guide/watch/apde0be691be/8.0 , read Nov 27, 2026. **Verified**.
- **Strava**: Crop, from an activity's ellipsis menu, trims the start or the end of a GPS activity; a crop cannot be
  undone. Source: from memory and a search summary, unverified. **Unverified**.
- **AllTrails**: "How do I crop the length of my recording": the end point dragged back on the map for a session left
  running. Source: from memory and a search summary, unverified. **Unverified**.
- **Garmin Connect**: Edit › Trim Activity, by time or distance, stats recalculated. Source: from memory, unverified.
  **Unverified**.

Where this departs: none of them ends a recording by itself, and none offers the cut point it infers. This asks at the
Stop the walker holds, with the point already found (the owner's own words: "do you wanna trim this walk down"); like
Strava's and Garmin's, the trim of a kept walk is a row in its More (⋯); unlike Strava's Crop, the raw readings are
never deleted (truth), so Share GPS log still holds them.

## Every surface (decision 0167)

From the code (`grep -rn "stopEnd\|<WalkActions\|readTrace(" src`):

- **The walk screen's held Stop** (`src/app/walk.tsx`, `stop()`, after Pause, 0220): the ask, QE3.
- **The recording bar's held Stop** (`src/components/RecordingBar.tsx`, `endWalk`, 0048): the ask above the bar, QE4.
- **The walk's More (⋯)** (`src/components/WalkActions.tsx`), hosted by the replay's card (`src/app/replay/[id].tsx`) and
  Chronicle's walk row (`src/app/(tabs)/index.tsx`): the row, QE7.
- **What reads a finished walk's trace** (QE5): the replay, its card and its end mark (`loadReplay`, `lib/summary.ts`;
  `lib/traceEnds.ts` reads its runs), the summary behind Chronicle's row, the day and the year (`snapWalk`,
  `lib/finish.ts`: duration, distance, streets, areas through `assignAreas` and `snap`), Where I've been (`pastLines`,
  `lib/pastLines/shell.ts`), the day's replay (`app/day/[key].tsx`, through `loadReplay`).
- **What keeps every reading** (QE8): Share GPS log (`lib/shareLog`), the walk's export bundle and the backup read
  `db.getPoints` whole, unchanged.
- **Every other reader of a finished walk's trace** (steward 1): Plan an outing's "visited on foot" (OJ47,
  `lib/outing/app.ts`), the empty-walk drop (`lib/emptyWalk/shell.ts`) and a piece split out of its moment
  (`lib/split/shell.ts`) read it up to its end too.
- **Not here:** the open walk's readers (`useLiveTrace`, navigation's `useNavigation`, the planner's `openWalkLast`) read
  only a walk still recording, which has no end to move. A test enumerates every `getPoints(` outside the stores and
  names each reader's class (up to the end, whole, or the open walk), so a new reader cannot be missed.

## Criteria

G16's ten, in its words, numbered with the slice's prefix; the states they imply are in QE3, QE6 and QE7 (slice step 2).

1. **QE1** A walk's quiet point is the latest of its last walking on (the read trace leaving its spot), the end of its
   last ride, its last capture and its last Resume; found the same, within a minute, on a web-shaped tail (one long
   break, then standing fixes) and a phone-shaped one (a long stay of a fix a second).
2. **QE2** A sit mid-walk followed by walking, a capture, a ride or a Resume is never a quiet end; a slow walk
   (`outAndBack`, `eastonSlow` fixtures) never reads as quiet.
3. **QE3** (the owner's task: "do you wanna trim this walk down") On the walk screen, Stop held on a walk quiet 30 min or
   more shows the card as drawn, "This walk went quiet at <time of day>[ yesterday]." with "End it at <time>" (the one
   filled button) and "Keep it all"; quiet less than 30 min, Stop ends as today with no card. **Finding:** the walker
   holding Stop the next morning sees the card above the strip before anything ends, with the time it went quiet in
   its words. While the card shows, End it is the screen's only filled accent (Resume beneath it is not filled); a tap
   on the strip, outside the card or Back closes the card and ends nothing (steward 4). The capture stack stays one tap:
   a tap on the camera, the mic or the note closes the card and captures in that same tap (steward 2).
4. **QE4** The recording bar's held Stop asks the same, with the same words, above the bar.
5. **QE5** End it writes the quiet time as the walk's end: the replay, its card, Chronicle's row, the day, the end mark,
   the areas and the streets read the walk up to it, and the dotted hop to the next day's spot is gone. Every reader of
   a finished walk's trace reads it up to `ended_at`; only Share GPS log, the export bundle and the backup read it whole
   (steward 1).
6. **QE6** Keep it all is today's Stop exactly.
7. **QE7** A finished walk quiet 30 min or more at its end has "End it where it went quiet" in its More (⋯) (the replay
   card and Chronicle's row), which asks with the same words and buttons ("End it at <time>", Cancel); after it the row
   is gone. **Finding:** someone who kept it all and sees "20 h" on the card opens the card's ⋯ and finds the row by its
   words, between Rename and Share GPS log.
8. **QE8** No reading is deleted: Share GPS log still holds the tail; `SNAP_RULES` is bumped so kept walks are read
   again.
9. **QE9** Nothing ends or trims a walk without the walker's tap, nothing is notified, and the words say a time of day,
   never a count or a number of hours (`check:vision`): the clock's and the date's digits only; "yesterday" in lower
   case; no word for today; a day further back reads "on <day>" (`dayLabel`'s words) (steward 5). The More row's hint
   names no unit of time: "At 8:35 pm yesterday; what came after it leaves the walk" (steward 3).
10. **QE10** The paused strip's Resume and Stop stay whole at 320 px beside a day-long time (today "Resu…").

Done when (G16): on the web build at 390 x 844, a walk left running and opened 20 hours later, its Stop held: the walk
screen asks whether to end it where it went quiet, and with End it the replay's card, Chronicle's row and the day say
the walk's own time, its end mark sits where the walking stopped, and no dotted line runs to where the phone was the next
day.

## The plan's review (the steward, Nov 28)

Steward 1-5 accepted into QE3, QE5 and QE9 above, with their tests (`forgotten-stop steward N: …`). The proxy's calls
under 0157, 2026-11-28 (the owner said "Proceed autonomously", Nov 28):

- **Steward 2:** the approved drawing's look is kept; a tap on a capture button while the ask is up closes the card and
  captures in the same tap (VISION Always, "Capture is one tap away").
- **The clock and the day** (the plan's judgment calls 1 and 2): "8:35 pm", as every clock time in the app (`clockOf`),
  where the drawing wrote "8:35 PM"; a day further back than yesterday, "on <day>".
- **Share GPS log, the export and the backup** keep every reading, unmarked (QE8 as approved; the trace is truth).
- **A linger** within 50 m for 30 min or more at the end reads as quiet: nothing ends without the walker's tap, and Keep
  it all is one tap.

## Open questions

- A walk stopped by choice after a long sit (a café, 30 min or more) is asked at Stop, and keeps the row in its More
  after Keep it all; walks kept before this slice gain the row too. Remembering Keep it all would be a stored field (a
  data-model change, the owner's): filed `[owner]` low in `docs/DEFERRED.md`, walk-screen.
- A slow linger within 50 m (a market, a gallery) for 30 min or more at the end reads as quiet (the proxy's call above).
- E-walk-screen-4 ("… to bring the walk straight back as its replay") meets one question on a quiet walk: an amendment
  is the owner's (decision 0236), left as it is and named in the run's report.

## Amends

- Decision 0048 (the bar's own Stop) and 0220 (Pause, then Resume or Stop): a held Stop on a quiet walk asks one
  question first; amended by 0272.
- Decision 0041 ("truth is append-only, deletes aside"): a walk's end may be moved back by the walker; amended by 0272.
  AGENTS.md's "Truth vs cache" line and `.claude/rules/recording-and-traces.md` say so (0272's consequences).

## Not in this slice

- A reminder or a notification while a forgotten walk runs (the owner's no, 0272); an end by itself.
- A cut at a point the walker picks (a scrubber like Strava's Crop), or at the start.
- Undoing a moved end: the readings stay stored, but no control moves the end forward again (none was drawn).

## Tests

Unit, in `src/lib/__tests__/recording/quietEnd.test.ts` (feature `recording`): QE1, QE2, QE5 (the read's end), QE8,
QE9 (the words); the shells in `src/lib/__tests__/tabs/stopEnd.test.ts` (QE3, QE6, QE9: the Stop's answer) and
`src/lib/__tests__/recording/quietEndShell.test.ts` (QE5, QE7: a kept walk's end moved, read again). The journey
`quietend` (new): QE3-QE7 and QE10 on the web build at 390 and 320 px, a walk left running 20 hours.

## The diff review (Nov 28)

One round: the auditor, the ux-reviewer and the steward over 61003e70..1129a7b0. 18 findings accepted, merged into 14
fixes, each behind its regression test (`forgotten-stop audit 1-14`; audit 8 is AGENTS.md's wording, no test): the
strip's two lines in the core (1, high: `npm test` red at 1129a7b0); a break crossing the reach read as walking on and the
kept gaps read (2, high); the pin before the quiet read (3); drift not walking on (4); End it reading the point again and
the bar's ask closing on a capture from the page (5, with steward 6); a walk ended at its Resume never dropped (6); a pause
closed at the end no Resume (7); AGENTS.md's "Raw fixes" line (8, with steward 8); the minute after a walk's end its own
(9: an ordinary Stop loses no reading; the SNAP_RULES differential rewritten so it can fail); the More's ask in the
sheet's confirm order (10); the replay framed after End it from the More (11); the row's glyph (12); the card not modal
(13); the bar's ask closing on another tab or a page click (14). Deferred 4: auditor 9 (`[loop]` low), the steward's
silent 1 and 2 and ux 4 (`[owner]` low), in `docs/DEFERRED.md`, walk-screen. Rejected 0. The proxy's calls, and ux 5-8's
departures from the drawing kept, are in decision 0276. Two tests stay source-text: the replay's and the snap's read of
`untilEnd` (`summary.ts`, `finish.ts`) and `SNAP_RULES` 10 (`tiles.ts`), whose modules load React Native through the
app's db and cannot run under `npm test`.

## Record

Built 2026-11-28 under `/tend inbox G16 yes`.
