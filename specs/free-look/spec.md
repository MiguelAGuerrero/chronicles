<!-- Repo first: written from the owner's request in a session (Nov 11, 2026), not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Free look: pan the Explore map, then load the areas around its centre

Nov 11, 2026 · @Miguel Guerrero

## Vision

Idea: Explore's map snaps from area to area, so there is no way to scroll the map to a place away from you (Carlisle while standing in Camp Hill) and load its information. Let a reader free the map to pan, then load the areas around the map's centre (the owner, Nov 11).
Verb: earn (it raises what you notice about places you aren't standing in; 0115 already reads "?" out of town)
Touches: decision 0092 and EC10, "One finger never pans the map" (amended here: only while Move map is on, the default stays snapping); Always, "Restraint in motion, colour and copy: the content is the novelty, not the chrome" (the toggle and the button are quiet controls); Never, "Tallies" and Never, "rankings" (the row stays nearest first, now nearest the looked-at point, with no count and no "best" in any copy); Never, "Data leaving the device without a tap" (no new host: the reads are the near-you reads); decision 0121 (a far Walk to already asks "Walk now" or "When I get there"); DEFERRED, "Explore's layers follow the selected area or you, not the panned map" (a look makes the looked-at point the page's centre, so the layers follow it).
Verdict: aligned if reshaped
Shape: As asked, with these changes. A looked page says only what it is around ("Around the middle of the map"), never where the reader is or is not; "You're here" returns only for a town a fresh fix is inside. Locate is the way back to you. Turning Move map off returns to snapping. Distances on the cards are measured from you when a fresh fix exists and left out when not, never from the looked-at point (the owner, Nov 11: distance is not a ranking; ranking is for the quality of a place).
Criteria: FL1 (the default still snaps); FL7 (no "You're here" while looking); FL8 (Locate returns); FL11 (no count or rank in the copy); FL9 (no new host).
Open: none that block the plan; the owner's calls of Nov 11 are in Decisions, and the two defaults left (Move map resets on leaving the tab, the centre mark) are in `plan.md`.

## What it is

On Explore, a **Move map** switch frees one-finger panning. With it on, the reader drags the map to Carlisle and taps **Show areas here**: the page lists the towns (or neighborhoods) around the middle of the map, nearest that point first, and reads them the way it reads the areas near you. The long press on a panned spot still offers What's good here and Walk here. **Locate** brings the page back to where you are.

## Decisions (the owner's calls, Nov 11)

- **Pan, then load the map's centre.** No search, now or here (a search needs a geocoder: a new host and typed text leaving the device, which 0005 forbids until a decision says otherwise).
- **A Move map toggle** frees one-finger panning; snapping stays the default. This amends 0092 and EC10; a decision record (0147) says so.
- **Nothing is stored** about the look beyond what the page's reads already keep (see FL15). The look and the toggle live in the screen, like the page and the selection.
- **The page's words** are "Around the middle of the map": it says what the page is around and nothing about where the reader is (Nov 11).
- **Distance is not a ranking** (Nov 11): cards keep their distance, from the reader's fresh fix; ranking in the Never lines is for the quality of a place.
- **The layers follow the look** (Nov 11): Busy streets, Walkability and the town borders read around the looked-at point; this amends the DEFERRED line "Explore's layers follow the selected area or you, not the panned map".
- **Out-of-town stars follow the look** (Nov 11): within 50 km of the looked point; a tapped star's distance is from the reader. Decision 0147 amends 0115's "within 50 km of you". The stars are not built yet (0115 is queued), so this is carried by that slice (FL19, deferred).

## Criteria

1. **FL1** With Move map off (every visit to Explore starts so), the map is exactly as the carousel left it: one finger never pans (EC10, DN1), a swipe steps the row (EC8), the arrow keys step it.
2. **FL2** A Move map control sits on the map as a toggle button: its name says what it does, its state is said in words to a screen reader (pressed) and drawn with more than colour, and its target is at least 44 pt.
3. **FL3** With Move map on, a one-finger or mouse drag pans the map on web and native, with the usual coast; a drag no longer steps the row; pinch, the wheel, a double tap and the two-finger turn work as before; on web an arrow key pans the map and + and - zoom one level, never two (the swipe handler's key listener stands down).
4. **FL4** Turning Move map off goes back to snapping: a swipe steps the row again, the selected area stays selected, the map does not move, and a standing look keeps its words.
5. **FL5** While Move map is on, a "Show areas here" button is on screen and a small mark at the map's own middle says what it will load; neither is there while it is off. A tap while the map still coasts loads where the map settles, and the mark sits there.
6. **FL6** Show areas here loads the page around the map's middle: the row holds the towns around that point (the neighborhoods only as they are on the page near you), in plain distance order from that point whatever outline holds it, the first selected. Each look is its own page: the map frames the first area as on arrival, around the looked point only (never spanning you), also on a second look from the near page. A town's page, a card or the long press's choices open when it is tapped close.
7. **FL7** A looked page says what it is around ("Around the middle of the map") and never where the reader is or is not: not "Not around you", not "You're here" from the looked point. "You're here" returns only on a town a fresh fix is inside, and nothing contradicts it.
8. **FL8** Locate ends the look: the page is around you again, framed on you, with "You're here" where it was true, as before the look.
9. **FL9** A look reads through the same reads as the page near you (the near read, the ring read, outlines, the archive) with the same retry and one-at-a-time rules, and adds no host: the journey records the hosts the page asks and they are the near-you ones.
10. **FL10** The long press on a panned spot (zoom 10 or closer) still offers What's good here and Walk here, and a drag that pans never starts one.
11. **FL11** No string this slice adds carries a number or a rank ("top", "best", "closest"): the toggle's label and hint, the pill, the page's words, the map's label and the announcement are all scanned. The row's order is the nearest first and says so nowhere.
12. **FL12** While looking, a card's distance is measured from you, and only from a fresh fix: with none, a looked card carries no distance and Walk to does not choose by the looked point. Walk to and the long press's Walk here ask "Walk now" or "When I get there" by your distance (0121); a far point never starts a walk unasked.
13. **FL13** A keyboard and a screen reader can use it: the toggle and the button are buttons with names; with Move map on, the map's label says the arrow keys pan it (and says the other in snapping, the label standing in both states); a look is announced each time it is made ("Showing areas around the middle of the map").
14. **FL14** Leaving Explore turns Move map off; the look stands, like the page and the selection.
15. **FL15** A look is never taken for where the reader was: a relaunch with no fix opens where the atlas last listed around you, never at a looked place, and looks do not displace the reads kept around you.
16. **FL16** What means you stays on you while looking: the walker's dot, the area card's "you", the walk planner's start, and the busy streets' walkability from your fix.
17. **FL17** A launch fix that arrives while Move map is on or a look stands never moves the map or the look; it only becomes `you`.
18. **FL18** After a look, the Busy layer, the Walkability layer and the town borders read around the looked-at point, as around a page's centre; the DEFERRED line that said they follow the selected area or you, not the panned map, is amended.
19. **FL19** Deferred with 0115: the out-of-town "?" stars (decision 0115, queued, not built) will be drawn within 50 km of the page's centre, so of a look, and a tapped place's distance will be said from you. Nothing in the app draws them yet, so there is nothing to build or test here; the call is recorded in decision 0147 for that slice to carry.
20. **FL20** A look with no area around the middle (open water, a field) says so in words, with no cards and no count; Locate and Move map stay on screen.
21. **FL21** The overlays never overlap in any combination of the long press's choices, a town's page, Move map and a turned map's compass, at 390 px and at 320 px: the toggle, the pill, the scale bar, the Towns pill, Locate and the compass each have their own place.

## Retired and amended

- The carousel's rule that one finger never pans the map (`specs/explore-carousel/spec.md`, criterion EC10) is amended: it holds unless Move map is on (FL1, FL3). Its tests (`carousel` "EC10", `snap` "DN1", "DN10") stay as they are and now describe the default.

## Out of scope

- Search by name (a geocoder: a new host, decision 0005).
- A look that survives a relaunch, or a list of places looked at (nothing stored).
- The Busy and Walkability layers over a looked-at place beyond what they already do around the page's centre.

## Audit

Audit of the plan, before any code (Nov 11, 2026): the `auditor` (1-10) and the `steward` (11-16), both read-only. No pictures: nothing is built. Counts: 16 findings, 15 accepted into criteria and the plan (each gets its test, named `free-look audit N`, written first when the slice is built), 1 rejected, 0 deferred.

1. A look contaminates "where it last listed" (a relaunch could open at the looked place): accept, FL15; test `free-look audit 1`. The near read of a look is marked as one and never taken for the page near you.
2. Show areas here does not reframe on the same page: accept, FL6; test `free-look audit 2` (each look is its own frame key; `nextFrame` takes the looked point).
3. The `you` / `at` split lacked a list of callers (the walker, the card's you, busy walkability, the planner, outlines, `layerCentre`, `hintShown`, `initialCenter`): accept, FL16 and the plan's caller table; test `free-look audit 3`.
4. A looked page with no or a stale fix, the `ownTown` fallback, and a far Walk here: accept, FL12; test `free-look audit 4`.
5. The map's key listener double-handles keys once always registered: accept, FL3; test `free-look audit 5`.
6. A late launch fix pulls a look back: accept, FL17; test `free-look audit 6`.
7. "Nearest first" against `nearList`'s outline-first order: accept, FL6 (plain distance order while looking); test `free-look audit 7`.
8. The settled centre, the padded middle and a tap mid-coast: accept, FL5; test `free-look audit 8`.
9. Overlay slots collide (compass, Show pill, Towns pill, scale bar, the long press's choices): accept, FL21; test `free-look audit 9`.
10. Smaller gaps (`touch-action` stated, the label standing in both states, the announcement each time, FL4's words, `snapWorld` having rows near Cranston, FL9's pin that cannot fail): accept, FL4, FL9, FL13 and the plan; test `free-look audit 10`.
11. "Not around you" can be false: accept, FL7 and the owner's call (Nov 11); test `free-look audit 11`.
12. Nearest-the-look order against distances from you reads as a ranking: reject, the owner's call (Nov 11): distance is not a ranking; ranking in the Never lines is for the quality of a place. The honest part stands in FL12 (no distance without a fresh fix).
13. With no fix, distances are measured from the looked point: accept, FL12; test `free-look audit 13` (with 4).
14. The DEFERRED line contradicted and not updated: accept, FL18 and the owner's call; test `free-look audit 14`; `docs/DEFERRED.md` is in the plan's files.
15. Decision 0115's "within 50 km of you": accept, FL19 and the owner's call; test `free-look audit 15`; 0147 amends it.
16. FL11 scanned only `lookWords`: accept, FL11; test `free-look audit 16`.

The steward's "Silent" list: a look with no area is FL20; the long press's Walk here far away is FL12; a standing look on a new visit is FL14's call (the look stands); the pill must not cover Walk here, Locate or the tabs is FL21.

## Record

Built Nov 11, 2026 on `slice/free-look`. FL1-FL16, FL18, FL20, FL21 have tests (unit `freeLook`; journey `freelook`, all checks pass); FL17 is recorded as deferred in `UNTESTED` (a late launch fix cannot be staged; the guard is `lookedRef`/`freeRef`); FL19 is deferred with the out-of-town stars. Deferred in DEFERRED.md: a tap while the map still coasts loads the last settled middle (FL5). Native paths are in NATIVE_UNVERIFIED.md and have never run on a device. Decision 0147. A far Walk here asks first (`spot.ask`, FL12). The UI review (ux-reviewer on pictures) has not run.

UI review (the `ux-reviewer` on the journey's pictures, 390 and 320 px; Nov 11): 6 findings, 4 accepted, 1 deferred, 1 rejected. Accepted and fixed, each held by the journey's pictures and checks: the looked title clipped under the Layers button (ui 1: the title card clears that column and wraps to two lines while looking); the pill and Locate sharing one glyph (ui 2: the pill has no icon); a looked card's distance not saying whose it is (ui 3: "4.0 km from you"); the centre mark's hairline (ui 6: a light edge). Deferred: the toggle is icon-only (ui 4; its spoken name and pressed state are tested; a visible cue on first use is the owner's to ask for). Rejected: no feedback on the pill (ui 5: the page's title and the announcement are the feedback).
