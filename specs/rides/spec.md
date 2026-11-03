<!-- Mirror of the Claude Docs tab "Rides (in progress)" (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). The doc is the owner's authoring surface; this file is the greppable copy. When they differ, the doc wins and this file needs a re-export. Last exported: 2026-11-03. -->

# Rides

A walk can include a stretch on a trolley, bus or train: it is drawn as a dashed line, holds captures, and counts for places but not for streets or walked distance. The owner's calls (Nov 1), after a bus ride showed only "Weak GPS" and no trace: rides are part of exploring; walked and ridden distance are shown apart; places yes, streets no; the replay squeezes a ride to a few seconds; a quiet "On a ride" chip shows and Explore waits until you are on foot.

Why it broke: every fix faster than 7 m/s (25 km/h) was dropped as a GPS jump, so a bus kept its first fix and nothing after it.

## Criteria

1. **R1 · A ride is sustained speed.** A stretch is a ride when, over at least 20 s and 3 fixes, the median speed is above 7 m/s (25 km/h) and the net movement is at least 4.5 m/s. The speed is the phone's own reading where it gives one, else fix to fix. A ride shows within 30 s of starting, from where it started.
2. **R2 · Jumps stay out.** A single bad fix, or a burst shorter than 20 s, is still dropped as a GPS jump, as on foot today. Inside a ride, a fix faster than 100 m/s (a high-speed train) from the last kept one is a jump. A ride reaches at least 200 m from where it began, so GPS drifting off and back is not one.
3. **R3 · Ends and stops.** A ride runs from its first fix at 3 m/s or faster to its last. Two rides are one across a stop (under 3 min and 150 m), or across traffic still moving at 3 m/s or more, however long. Hurrying to a stop and standing there is not the ride. A pause, or a gap over 60 s, ends a ride.
4. **R4 · Old walks too.** Raw fixes are stored unfiltered, so a walk recorded before rides existed shows its rides the next time it is read.
5. **R5 · Drawn dashed.** A ride is a dashed line in the trace's green on its white edge, joined to the walk on either side, on the walk screen and in the replay.
6. **R6 · Walked and ridden apart.** The walk screen's distance stays the walked distance, with "+ 4.1 km ride" on a second line once a ride exists. The replay card keeps its line and adds "+ 4.1 km by ride" below it. With no ride, both read as today.
7. **R7 · No streets from a ride.** Ride fixes never credit a street, so the fog stays. A ride is a break in the walked trace: no solid line across it, however short.
8. **R8 · Places from a ride.** Ride fixes count toward neighborhoods, towns and states, like walked metres. The walk's title comes from where you walked, unless you walked nowhere.
9. **R9 · Captures on a ride.** A capture taken on a ride is placed on the ride line, shows its pin there, and stops the replay there.
10. **R10 · The replay squeezes a ride.** A ride takes at most 4 s of the path's 30 s. It draws dashed as the dot moves along it.
11. **R11 · The chip.** While you are on a ride, including stops of up to 3 min, a quiet "On a ride" chip shows. It ends after 20 s of walking, 30 m from where the ride stopped. "Weak GPS" means no fix within the 50 m accuracy gate for 20 s, so fast fixes never read as weak GPS.
12. **R12 · Explore and navigation wait.** On a ride, Explore names no place, gives no pocket alert and starts no read; the fog reads no streets and the dead-zone nudge doesn't count it. Navigation doesn't re-route; arriving still counts. Reminders still fire, and memories still show.
13. **R13 · Walk me back walks.** Walk me back routes over walked ground and streets, never along a ride.
14. **R14 · Every walk re-reads.** The rule change marks every walk to re-snap and re-place when its replay next opens, so old walks gain ride distance and places. The phone's location task applies the same rules.

## Tests

- Unit tests: the ride rules on made-up traces, a bus, a train, a stop at a light, a GPS burst downtown, a short ride, a pause mid-ride (R1-R4); distance, snapping, places, capture placement, walk me back and the replay clock with a ride in the walk (R6-R10, R13, R14).
- E2E: a walk with a bus leg at 12 m/s draws a dashed line, shows "On a ride" and never "Weak GPS", and the card reads walked and ridden apart (R5, R6, R11).
- Native (the location task's rules, the dashed layer) has not run on a device.

## Audited (Nov 1)

One report-only pass found 14 issues; 11 were fixed with a regression test each, and the criteria above were updated to match.

- **Fixed:** rides missed with a fix every 10 s or with Android's "speed 0"; the replay clock going backward over a stop inside a ride; all rides together now take at most half the replay; "On a ride" lingering about 2 min after getting off; a slow bus crawl counted as walking; trains over 70 m/s; GPS drift read as a ride; a GPS jump or a run-up at the stop drawn into the ride; old ride distances on native; fog reads and the dead-zone nudge on a bus.
- **Faster:** reading a 3-hour walk takes about 8 ms (it was 23), and the map gets the ride lines only when they change.
- **Deferred:** the phone's background task misses rides in its first 20 s after a relaunch; old walks gain their rides' places only when their replay is opened, as with every rule change.
- Native (the task's rules, the dashed layer, migration 10) has not run on a device.
