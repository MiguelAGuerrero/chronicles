# Drive there, walk back: the plan (DW1-DW14)

Approved by the owner, Nov 10 (2 km; towns past 10 km offer When I get there).

## Files

| File | Change |
|---|---|
| `src/lib/nav/wayBack.ts` (new, core) | `landingOf(tr: ReadTrace)`: the first walked fix after the last ride that has walked fixes after it, else null. `wayBackTarget({ start, landing, chosen })`: `{ at, kind, label, said }`, the chosen spot over the landing over the start. The three labels and accessibility lines (DW6, DW8). |
| `src/lib/startPlan.ts` (core) | `GET_THERE_M = 2000`, `FRESH_FIX_MS = 30 min`; `walkToChoice(fix, at, now)` gives `'start'`, `'ask'` or `'later'` (DW1, DW2, DW5, DW14; `now` passed in, core reads no clock). |
| `src/lib/nav/store/shell.ts` (shell) | `saveWayBack(walkId, at)`, `loadWayBack(walkId)`, `clearWayBack()` over meta `way_back` (DW7). `savePendingDest` already exists for DW3. |
| `src/lib/meta.ts` | Declare `way_back` (owner `nav`). |
| `src/lib/useLiveTrace.ts` (view) | Publish `landing: LngLat \| null` from `landingOf(tr)`, kept unchanged when it is the same point. |
| `src/lib/useStartWalk.ts` (view) | `later(dest)`: `navStore.savePendingDest(dest)`, then `showWalk()` (DW3). It goes through the shell, so the view gains no db call. |
| `src/app/walk.tsx` | Walk me back reads `wayBackTarget` (its 50 m, label and destination; DW6, DW8); the press-and-hold card gains `spot-way-back` "Walk back here" and the notice "Walk me back now leads here." (DW7); Stop clears `way_back` beside `nav`. The card's actions wrap above the capture column, never over it (DW13). |
| `src/components/atlas/AtlasCard.tsx` | The footer's and the busy streets' Walk to go through one `onWalkTo(at, label)`. When asked, the footer shows "Walk now" (`atlas-walk-now`) and "When I get there" (`atlas-walk-later`) with a close button (`atlas-walk-cancel`) in place of Walk to. Back and Escape close the choice before the card (DW2). Past 10 km, the footer is `atlas-walk-later` alone, in place of "Too far to walk from here" (DW14). |
| `src/app/(tabs)/index.tsx` | Passes `from` and the two actions: `walkStart.start` and `walkStart.later`. |

Nothing changes `SNAP_RULES`, `STREET_CODE` or `LANDING_CODE`: no derived rule changes.

## Data

- No migration (SQLite) and no IndexedDB version.
- Meta `way_back`: `{ walk_id, at }`. It isn't truth: like `nav`, it is where the open walk heads back to, cleared on Stop.
- The landing is never stored (DW10).

## Tests per criterion

| Id | Test | File |
|---|---|---|
| DW1 | `DW1: a place within 2 km starts at once` (core: `walkToChoice`), plus the e2e's near Walk to | `src/lib/__tests__/navigation/wayBack.test.ts`; journey `drive` |
| DW2 | `DW2: past 2 km asks; Walk now starts; cancel saves nothing` | journey `drive`, plus the core `walkToChoice` case |
| DW3 | `DW3: When I get there saves the destination and starts no walk` (shell over `fakePorts()`: `nav` holds it for no walk, no walk is open, the recorder never started, no location task, the notifier has nothing scheduled), plus the e2e's ready bar "To <place>" | `src/lib/__tests__/navigation/wayBackStore.test.ts`; journey `drive` |
| DW4 | `DW4: only Start starts the walk; arriving starts nothing` (e2e: after When I get there, the mocked GPS drives to within 30 m of the place and sits there 2 min; no walk is open, no notice or prompt shows, the ready bar is unchanged; then Start opens the walk where the fix is, routed to the place), plus the DW3 shell test's empty recorder, location-task and notifier logs | journey `drive`; `wayBackStore.test.ts` |
| DW5 | `DW5: no position, or one over 30 min old, asks` | `wayBack.test.ts` |
| DW6 | `DW6: back to where the last ride ended; the start with none; a ride under way doesn't count` (a drive, then a walk, then a bus, then a walk; a walk with no ride; a ride still under way) | `wayBack.test.ts`; journey `drive` (a ride in mocked GPS) |
| DW7 | `DW7: the spot chosen wins, a later one replaces it, another walk never sees it, Stop clears it` (shell) and the e2e's reload | `wayBackStore.test.ts`; journey `drive` |
| DW8 | `DW8: the label names the target in words, with no digits; shown past 50 m` | `wayBack.test.ts`; journey `drive` reads `aria-label` |
| DW9 | `DW9: the way back never follows the ride` (`traceRouteSource` with a landing target past a ride) | `wayBack.test.ts` |
| DW10 | `DW10: the landing moves with RIDE_RULES, read from the trace` (the same fixes read with a raised speed give no ride, so the target is the start) | `wayBack.test.ts` |
| DW11 | `DW11: no mark for the walk-back point but the route's end` (not navigating: the map's marks hold none; led back: only the destination's ring) | journey `drive` |
| DW12 | `DW12: nothing asked of the network` (the harness's request log holds no new host during the journey) | journey `drive` |
| DW13 | `DW13: the capture stack stays put under the press-and-hold card at 320 px` (boxes of `cap-photo`, `cap-voice`, `cap-note` before and with the card open) | journey `drive` |
| DW14 | `DW14: too far to walk offers When I get there alone` (core: `walkToChoice` gives `'later'` past 10 km; e2e: the card's footer) | `wayBack.test.ts`; journey `drive` |

A new journey, `scripts/e2e/journeys/drive.js` (`E2E_ONLY=drive`): it opens Explore, opens a far area's card (the harness's fix moved past 2 km), checks the choice, picks When I get there and checks Navigate, ready. It then moves the fix there, taps Start, drives the mocked GPS at about 12 m/s for a minute, stops, walks 200 m, and checks the label and the route's end. Last, Walk back here and a reload. Owned by the `navigation` feature (journeys `scenic`, `drive`; specs `+ drive-then-walk`).

## Deferred

- **Explore's long press "Walk here", Chronicle's Walk here and the walk planner** keep starting at once. The owner named the area card only. The planner plans its way from where you stand, so a far plan needs its own thought.
- **Open in Maps on the card** stays deferred (0058).
- **Undoing a spot chosen by hand** without choosing another, or stopping: it goes on Stop.

## Native

Nothing native is new. The meta write, the card and the label run on the same code on a phone. They have never run on a device. The device suite gets: "**Do:** drive 3 km inside a walk, get out, walk 200 m. **Expect:** Walk me back says where you got off and leads there, not to where the drive began (DW6)."

## The owner's answers (Nov 10)

1. **The distance:** 2 km, kept.
2. **Towns past 10 km:** offer When I get there (DW14).
3. **The decision record:** 0109, listed in VISION.md's Precedents table (the steward's S5).

## The steward's findings (Nov 10), triaged

| Finding | Triage |
|---|---|
| S1 the spot card's fourth action could cover the capture row | accepted: DW13 |
| S2 the chosen spot is invisible once set; the button's label is spoken only | accepted: DW7's one notice; DW8 says the label is spoken and the bar shows the name |
| S3 DW3's "no background location, no alert" untested | accepted: the DW3 shell test checks the location task and the notifier |
| S4 DW11 against the route's end mark | accepted: DW11 reworded |
| S5 NV23/NR8 and 0021/0049 amended without saying so; Precedents row | accepted: the spec's "Amended"; 0109 listed in Precedents |
| S6 "where you are" has no age | accepted: DW5, a fix over 30 min old asks |
| S7 towns past 10 km would widen the slice | the owner said yes: DW14 |
| S8 "where you got off" names a bus | accepted: "where the ride ended" |
| Silent 1: a saved destination never expires | rejected for this slice: it is the drawer's destination (NV23), which already stands until Start, a new one or a clear; nothing pushes |
| Silent 2: Chronicle's and the long press's Walk here behave differently | deferred (above), the owner named the area card |
| Silent 3: "Walk now" keeps the drive in the chronicle | as it is: the owner chooses Walk now, and the lows stay in (0001) |
