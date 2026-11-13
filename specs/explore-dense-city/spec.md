<!-- Repo first: written from the owner's report in a session (Nov 12, 2026), not a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Explore in a dense city: names the map can place, and a page that keeps up

Nov 12, 2026 · @Miguel Guerrero

## Vision

Idea: The owner, Nov 12, in Downtown Baltimore on an iPhone: "the performance is awful. It's not smooth to move between neighborhoods, and the screen is cluttered with street names." The busy-street names drawn by the map, overlaps hidden, one per street, the busiest placed first, more as you zoom in; the busy read off the drawing thread and only once the map settles; fewer re-renders; no pre-rendered image.
Verb: earn (where there is a lot stays legible in a dense city: names you can read, and a map that keeps up while you look between neighborhoods)
Touches: Always, "Restraint in motion, colour and copy: the content is the novelty, not the chrome" (served: fewer names, none stacked); Always, "Guidance is structural: where there is a lot, ... never whether it is good" and Never, "Ratings, ... 'best of', rankings of places" (the placement order is the density grade AD already draws; it must never be said or shown as an order); Never, "Popularity, trending, foot traffic" (busy stays a density of places, AD1); decision 0124 / EC7 (names only near the selected area and from zoom 13: kept, collision works inside it); 0034 (busy areas are information only: no tap, no card on a name); EC18 (every area's busiest street stays named on its card, whether or not the map draws it). The performance half (worker, settle, re-renders) is no surface.
Verdict: aligned
Shape: as asked. Which names survive a crowd follows the grade the lines already show; the map never numbers, orders or highlights a name as "top", and a name dropped for room returns when zooming in gives it room.
Criteria: DC2 (no two names overlap), DC3 (a street named once), DC4 (no rank, count or "busiest" on the map), DC6 (EC7's limits kept; EC18 holds).
Open: none

## What it is

Explore's Busy layer names its streets with the map's own text, the way the base map names its roads: a name that has no room is left out, a street is named once, and zooming in gives room to more. When names compete, the heavier street keeps its name; nothing says so. Moving between neighborhoods stays smooth: reading a part of town not yet read happens off the page's thread on the web, starts only once the map has stopped moving, and the screen re-renders less per move.

## Decisions (the owner's calls, Nov 12; decision 0156)

- **Measure, then fix** (`scripts/perf-explore.js`, `docs/TESTING.md`): at 4x CPU, a first read of an unread area froze the page for one 4.4 s task (street derivation 1.7 s, the store write 1.7 s, decoding 0.5 s, the density pass 0.4 s); every switch lost about 1 s to long tasks (the map's own camera move about 320 ms, React about 350 ms, Explore rendered 3 to 5 times). Drags were smooth in Chromium, which does not model WebKit's compositing of DOM markers.
- **Names drawn by the map** (a symbol layer with collision, on web and native), not as DOM markers.
- **The read in a web worker on the web**, started only once the map settles on both platforms; on native it stays on the JS thread, yielding between stages.
- **On the walk screen and in Navigate the base map's names keep their room**, and the trace and route draw over the busy names; only Explore gives busy names priority (DC16).
- **The base map's own name of a busy street stays**; only one that would overlap a busy name gives way (steward S3).
- **No clutter** (the owner, Nov 12, after the names were in: "Ensure there is no clutter as shown"): every "?" pin keeps its room, so no busy name is drawn under one (DC17); a name its point can't hold slides along its street beside the pin. Where pins cover the screen, names appear as zooming in spreads the pins.
- **The "?" pins and the area points stay DOM markers this round.** If a drag still stutters on the phone, they move to map layers next (DEFERRED).
- **No pre-rendered image of the area:** at street zoom a city is several times iOS Safari's canvas limit, baked text can't avoid overlaps or be tapped, and it must be redrawn whenever an area is read again. Raster tiles for the magenta lines alone stay an option for later.

## Criteria

### The names

1. **DC1** The Busy layer's street and pocket names are drawn by the map itself, on web and native: no busy name is a DOM element over the map, and where the map shows a busy street near the selected area from zoom 13, its name is on the map when there is room for it.
2. **DC2** No two busy names overlap each other on screen, and a busy name never overlaps a base-map label: a name with no room is not drawn.
3. **DC3** A street is named at most once in its area: one name per busy street (or pocket), never one per block, and never twice for one street read by two remembered areas (fix street-label-double holds).
4. **DC4** Where names compete for room, a heavier busy street's name is placed before a lighter one's. The map shows each name exactly as the street is called: no rank, number, count or "busiest" in any label, and every busy name has the same font, size, colour and halo whatever its street's grade; only staleness changes its look (DC6) (steward S2).
5. **DC5** Zooming in never takes a busy name away that had room, except to a "?" pin that zooming in gave room (DC17 wins, audit 3): a name left out for room at one zoom is drawn once zooming in gives it room.
6. **DC6** EC7 and EC18 hold: names only near the selected area (a neighborhood's ring, a town's own reach) and only from zoom 13; every area's busiest street stays named on its card whether or not the map draws it. Stale areas' names are drawn as their lines are, dimmed.

14. **DC14** No busy name is drawn under the selected area's name on the map (steward S4; 0124: nothing near the selection drawn over its text).
15. **DC15** A tap on a busy name does what a tap on the bare map there does: no card, no selection, nothing of its own (0034, steward S5).
17. **DC17** No busy name is drawn under a "?" pin: every pin on the map keeps the room it covers (48 px wide, standing above its point), and a name with no other room is not drawn (the owner, Nov 12: "Ensure there is no clutter as shown"; UI review U1).
16. **DC16** On the walk screen and in Navigate (the same Busy layer), the names follow DC2-DC5 too; there the base map's own street names keep their room and the walker's trace and route draw over the busy names (steward S1; the owner's call, Nov 12).

18. **DC18** On the walk screen and Navigate, busy names are drawn only within 800 m of you (Explore's ring) and only from zoom 13; the magenta lines draw everywhere as before (the owner, Nov 12, at the audit).
19. **DC19** Where names compete for room, a current area's names are placed before a stale area's; within each, the heavier street first (the owner, Nov 12, at the audit).

### Moving between neighborhoods

7. **DC7** On the web, while the Busy layer reads an area, the page keeps drawing: decoding, deriving the streets and measuring density run off the page's thread, and no single task on the page's thread during the read is longer than 250 ms at the e2e's speed.
8. **DC8** If the background reader can't start or fails (a page left open across a deploy, a browser without workers), the read runs on the page as before and still finishes with the same result.
9. **DC9** A read the Busy layer needs (no remembered area within 1.5 km, ML9) starts only once the map has stopped moving: never during a switch's ease or a drag; a further move before it starts waits for that one to settle.
10. **DC10** Storing an area's street pieces never holds the page in one long write: on the web they are written in batches, the page drawing between them. A read cancelled before its write starts writes nothing; a write once started finishes, so no tile is left half stored (audit 5).
11. **DC11** On native the read yields between tiles and between its stages, so a read never holds the JS thread for the whole read at once (device: unverified).
12. **DC12** A switch to the next neighborhood renders Explore at most twice, and a Move map drag renders it at most once, at the drag's end.
13. **DC13** A busy read off the page gives the same busy streets, pockets, names and stored pieces as one on the page (one function computes both).

## Steward (Nov 12, on the spec and plan)

Five drifts, no breaches. S1 (the walk screen and Navigate change too, unreviewed): accepted as DC16, with the base map's names and the trace keeping priority there (the owner's call). S2 (a heavier name could later be made bigger): accepted into DC4. S3 (a street named by the busy layer and by the base map): the owner kept the base names (collision already hides those that would overlap a busy name; hiding them by name leaves a street nameless wherever its busy name has no room). S4 (a busy name under the selected area's DOM name): accepted as DC14, the area's name reserving its room in the names' layer. S5 (no tap on a name): accepted as DC15. Its silent questions: screen readers lose nothing (today's strip names are `aria-hidden` DOM labels, read by no one; EC18's card says the busiest street); the map's own label fades are off on the web (`fadeDuration: 0`, map rules); MapLibre Native has no setting for them (only `rasterFadeDuration`), so a native name fades in and out on the library's timing, outside reduced motion (DEFERRED; unverified on a device).

## UI review (decision 0145, Nov 12, on the `dense` journey's pictures)

U2 accepted (`explore-dense-city ui 1`: stale names keep full opacity in `#7d6274`, 5.4:1 on the halo; dimmed they were about 2.3:1). U3 accepted (`ui 2`: within 5 degrees of north-south a name reads bottom to top). Its turned-map note accepted (`ui 3`: the names' turn folds upright for the map's bearing). U1 (pins hide names) became DC17 at the owner's word ("Ensure there is no clutter as shown"). U4 rejected: the dot and trace are over the names by DC16, and the edge column is the capture stack. U5 was the picture's resolution.

## Audit (Nov 12, decision 0074: the auditor, the steward and the UX review, on the pictures in the `dense` journey)

1. A crowded north-south name slides across its street onto the next (maplibre shifts a variable anchor in screen x, never along `text-rotate`): accept. Only near-level names slide; a turned one is centred or left out.
2. The first Busy switch-on holds tasks of about 800 ms; DC7 was shown only on a later read: accept. Find and fix the cause; DC7 times the first switch-on too.
3. Zooming past `PIN_ROOM.townPinZoom` turns dots into "?" pins whose room takes names already drawn: reject. DC17 is the owner's call ("no clutter"): a name gives way to a pin. DC5 says so.
4. One street named twice within one area (two strips of one name): accept (with 14 and 16). One name per street within 300 m, one area or two (the owner's call at the audit: once per 300 m).
5. A cancelled read leaves a half-written street cache, and a card says "No street or path close by" (RP20): accept. A started write finishes; places are not written after a cancel. DC10 says so.
6. Native draws the busy names under the magenta lines: accept. Native puts the pockets and strips under the base labels, as the web does, and the names over them.
7. A map taken down mid-ease leaves the busy read waiting for a settle that never comes: accept. A map going away reports its settle; the motion is a small tested store.
8. With Busy off the invisible pin rooms still hide base-map labels: accept. No busy names, no rooms.
9. A cancelled read keeps computing, in its worker or on the page: accept for a cancel (it ends the worker and never falls back to the page); defer iOS suspending a page past the 60 s timeout (DEFERRED).
10. An empty complexes result no longer clears an earlier result for the same area: accept. Only a result for another area than the one shown is skipped.
11. Names cut by the screen's edge ("21 Street" read as "1 Street") or under a control: accept on the web (with 15 and 17): Explore's controls and the canvas's edges keep their room after each move; defer native (DEFERRED).
12. A zero-length street piece can lay a north-south name level: accept.
13. The font fixture links to its licence instead of shipping it: accept. `OFL.txt` with Noto's copyright beside it.
14. Steward S1, one street named twice: see 4.
15. Steward S2, controls and the edge cut names: see 11.
16. UX X1, Navigate names one street two or three times: see 4.
17. UX X2, names cut at the edge or under the edge buttons: see 11.
18. UX X3, few names at street zoom, and not the card's street: defer. Choosing a point along each street clear of the pins is a larger change (DEFERRED).
19. UX X4, the pins are now the clutter: defer, the owner's next round (DEFERRED).
- **Counts (Nov 13):** 19 findings: 12 fixed, each behind a test named `explore-dense-city audit N` (1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13; 2, 4 and 11 also in the `dense` journey), 1 rejected (3), 3 deferred (9's iOS suspend, 18, 19, and 11 on native), 6 folded into others (14-17 and the native half of 11). Two found while fixing: 2's fix first computed an atlas ring's profile in a fresh worker per ring, which made the first "?" pins 1-2 s later, so one worker now serves job after job (first pins 7.7-8.3 s after a tap in the e2e world, 6.4-7 s before the slice, which then held the page 600-700 ms per ring); 4's first fix missed a pocket named for its street, whose name is now the street's own.
- **Journeys after the fixes:** `dense` (every DC and audit check), and the 24 the fixes reach since `0533880`: atlas, capturehome, carousel, complexes, curiosities, edit, freelook, gaps, headsup, hidden, layers, marks, outlines, qol, ready, reload, replay, snap, space, tabs, upgrade, walk and walkability pass. `walk`'s ML8 and ML10 failed once: they read Thayer Street's name, 1.1 km from the walker, which DC18 no longer names; they now read the drawn lines (`data-busy`), and passed. `drive` fails at DW14 as before the slice (DEFERRED).
- Steward's silent questions, answered by the owner at the audit: the walk maps name only near you (DC18); current areas first (DC19); one name per street within 300 m (4).

## Record

- **Built Nov 12** on `claude/trusting-cannon-f5wdhg`, tests first for all 17 criteria (`check:test-first`: 16 of 16 before DC17, DC17 after), and the three UI fixes behind `ui 1-3`. Native has not run on a device: its items are in `docs/NATIVE_UNVERIFIED.md`.
- **Measured** with `scripts/perf-explore.js` at 4x CPU, the build before the slice against after, two runs each:
  - a first read of an area: the longest task 3.3-3.8 s to 0.2 s; time in long tasks 4.1-4.8 s to 0.7-0.8 s; the 95th-percentile frame 100 ms to 33 ms;
  - a switch between areas already read: no gain in this browser (time in long tasks 0.85-0.91 s before, 0.95-0.97 s after). Its cost is the map drawing its own camera move in software WebGL; Explore's renders per switch fell from 3 to 2 (DC12), which these numbers do not show;
  - a drag: unchanged in Chromium (it doesn't model WebKit's compositing of DOM markers); the page elements over the map went from 52 to 31 (the street names). Only the owner's iPhone can say what the drag feels like now.
- **Changed from the plan:** names sit at a strip's busiest point turned along the street, not along the whole line (`line-center` placed none: pieces don't meet end to end and most strips are shorter than their name at z15); a crowded name slides along its street (variable anchors). The read's store write stays on the page, in batches of 150.
- **E2E:** `dense` (all DC checks), and the journeys the slice's files reach: atlas, capturehome, carousel, complexes, curiosities, freelook, layers, marks, qol, replay, snap, tabs, upgrade, walk, walkability pass. `walk`'s ML8 and ML10 now read the names the map was given (they were DOM text). `drive` fails about one run in two at DW14 (the area card does not open within 15 s on Cranston's page) on this branch and on the build before the slice alike (1 of 2), and 1 of 3 on main by `e2e:baseline`'s log (its summary line says 3 of 3 passed; the log shows run 2 failed); the journey's own race (opening Providence's page while the towns' row filled in) is fixed here.
- **Explained at the audit (2):** the first Busy switch-on's long tasks were the atlas's ring reads of the town page's neighborhoods (`profileFrom`: street derivation and the density pass, 600-700 ms each), not the Busy read. They run off the page now (`atlas/ringCompute.ts`), and the switch-on's longest task is 100-160 ms in the `dense` journey.
