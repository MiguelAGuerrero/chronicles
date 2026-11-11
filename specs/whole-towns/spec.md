<!-- Repo first: written from the owner's request in a session (Nov 11, with a screenshot of Allentown on Explore), not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Whole towns: a town's page holds every neighborhood inside its border

Nov 11, 2026 · @Miguel Guerrero

## Vision

Idea: "There appears to be missing points of interest given how big Allentown is ... the neighborhoods seem very incomplete given the scale of Allentown ... ensure that we're loading all the appropriate tiles and packages that would be relevant to completely exploring any given region despite where I currently am" (the owner, Nov 11); with the owner's answers: every neighborhood inside a town's border, hamlets inside a town count, wards do not, and a selected neighborhood shows every place still to find as a "?".
Verb: earn (the whole town is there to notice wherever you stand: its neighborhoods all listed, a neighborhood's places all shown where they are)
Touches: Never, "Scores, streaks, completion, coverage" and decision 0031 ("discoveries in the moment, not a planned list"): a neighborhood's map of every "?" beside its finds would read as done against to go (the steward, S1), answered by the owner by taking found places off Explore's map (WT10); Never, "Tallies such as '12 of 87' ... of places" (its nearest fit, "'what's waiting' as kinds only", holds for the card; the map shows positions, never a number); Never, "rankings of places" (the row stays nearest you first, EC3); Always, "Restraint" (more places on the map: a dot where a "?" would crowd, WT12, WT14); decision 0115 ("?" in countless stars, named only on a tap, never listed or counted) is the precedent for many unnamed "?"; decision 0126 and STATUS's "Needs the owner" (a neighborhood past its town's reach), which this answers; AT7 (a "?" is never named).
Verdict: aligned
Shape: as asked. The card's "Waiting to be found" stays one per kind; the map's "?" are unnamed positions; nothing on the page or the card counts places or neighborhoods.
Criteria: WT8, WT9, WT10, WT11, WT12, WT14.
Open: none (the owner's four answers, and the answer to the steward's S1, Nov 11; decision 0128).

## What it is

On Allentown's page the map names 38 neighborhoods inside the city's border, and the page listed at most 24: the nearest to where you stood, and only within 5 km of the city's label point. A town's page now lists every neighborhood inside its border, wherever you are, and the selected area's map shows each place still waiting in it: a "?" where there is room, a dot where there isn't.

What was already whole: a town's card counts places across its whole border (TP1-TP3; Allentown's border touches 27 tiles, all read). The map showed one "?" per kind by design (AT7, fix area-marks); this slice lifts it.

## Decisions (the owner's calls, Nov 11)

- **Every neighborhood inside the border**, nearest you first, with no cap and no 5 km limit. Without a border, today's reach and cap.
- **Hamlets inside a town's border are its neighborhoods** (Hanover Acres, Allentown). Outside every border a hamlet stays unlisted: rural places are the queued Places out of town slice (0115).
- **Wards are not neighborhoods** ("1st Ward", "6th Ward", "Eighth Ward"): voting districts, not places to wander. Historic districts stay, as the map names them.
- **Every place still to find is on the map, for a neighborhood and for a town** ("All for the town", the owner, Nov 11).
- **A dot where a "?" would crowd** (the owner, Nov 11: "not putting a whole bunch of question marks overlaid on top of the map ... maybe like a dot instead. And the question marks can appear when you scope into a particular area"): a place is a "?" wherever its pin has room on screen and a small dot in its kind's colour wherever a pin would overlap another; zooming in, or selecting a smaller area, gives pins room. A tap on a dot zooms in toward it.
- **Presence, not completion** (the owner's answer to the steward, Nov 11): "this is not for completion. This is for presence", and the remedy is to take the places already found off the view. Explore's map draws no found place; a neighborhood with nothing left waiting looks like one with nothing mapped. The card keeps its "Found" list.

## Criteria

1. **WT1** On a town's page, with the town's border known, every current neighborhood whose point is inside the border is listed, whatever its distance from the town's point or from you and however many there are, nearest you first, after the town's own card.
2. **WT2** A neighborhood inside a smaller town's border that lies within the open town's (a borough inside a township) belongs to the smaller town and is not listed on the larger town's page.
3. **WT3** Where the town has no border in the data, its page lists as before: within its reach capped at 5 km, at most 24, nearest you first. A border read that fails is not taken for a town with none: the listing is tried again after the retry wait.
4. **WT4** The listing read for a town's page covers its whole border: a neighborhood point anywhere inside the border is found, including one more than 5 km from the town's point, up to the town read's tile budget (`TILE_BUDGET`), nearest the town's point first.
5. **WT5** A place the map calls a hamlet is listed as a neighborhood of a town when its point is inside that town's border. A hamlet outside every border is not listed. Walks are placed in a hamlet only inside the walk's town border (whole-towns audit 7, `AREA_RULES` 4).
6. **WT6** A point named as a ward ("1st Ward", "Eighth Ward", "Ward 5", "10th Ward") is not listed as a neighborhood, on a town's page or near you, including rows listed before this change. A name that only contains the word ("Wardsville", "Howard Park") is listed.
7. **WT7** With any area selected, every place still to find inside it (a neighborhood's ring, a town's border) is on the map, of the kinds shown, as a "?" or a dot (WT12).
8. **WT8** A "?" on the map is never named; the card's "Waiting to be found" shows one per kind whatever is selected; no text on the page, the row or the card holds a count of places or of neighborhoods, in digits or in words.
9. **WT9** Opening a town's page lists its neighborhoods once per build: going back and in again reads nothing twice, and a listing made before this change (by the 5 km reach) is made again once, across the border.

10. **WT10** Explore's map draws no found place, whatever is selected: a find leaves the map when it is made, and an area with every place found shows no pin, line, tint or check that says so, on the map or its card in the row. The area's card keeps its "Found" list.
11. **WT11** With an area selected, its "?" pins are one accessible element naming the area and the kinds waiting ("Waiting in Downtown: art, green", whole-towns audit 15); no "?" is announced on its own, and how many there are never changes what is announced.

12. **WT12** Each place on the map is a "?" pin where the pin has room on screen and a dot where a pin would overlap another pin: no two "?" overlap. Which places get a pin is decided once the camera settles, at the zoom rounded to half levels (as capture pins are, `useZoomPins`), nearest the area's middle first, so the same view always shows the same pins and a pan or a pinch in progress changes nothing.
13. **WT13** A tap on a dot eases the map in around it to the zoom at which it has room to be a "?" (at most zoom 17, the map's closest fit); nothing is named. With reduced motion the map jumps. A tap on a "?" does what it did (the area's card).
14. **WT14** A dot is smaller than a "?" pin, in its kind's colour with a white edge, and carries no name, number or icon; its tap reach is the map's press reach (44 px). Dots and "?" are drawn only for the selected area, never for every area in view.

## Amends

- The explore atlas's AT2 (`specs/explore-atlas/spec.md`): a town's own neighborhoods were "within its reach (capped at 5 km), at most 24"; with a border they are those inside it (WT1), the reach and cap staying for a town without one (WT3).
- The carousel's EC3 (`specs/explore-carousel/spec.md`): "not capped beyond what the atlas lists today" now lists a town's whole border.
- **Fix area-marks** (`.claude/rules/explore-and-discovery.md`): one "?" per kind gives way to every place, as "?" or dot (WT7, WT12); the finds named over the map are gone (WT10, decision 0128).

## Routes and data

- No new routes, dependencies or storage. Neighborhood rows (`atlas_area`) are cache, as before; a hamlet's row is a neighborhood row. The near read's record in meta `atlas_near:neighborhood` gains the town it covered.
- Walk placement (`AREA_RULES`, the home's stars) is untouched.

## Record (Nov 11)

- **Built** on `claude/cool-shannon-p9gph3`: WT1-WT14, test first (`6f6a8fd`). Unit tests in `src/lib/__tests__/explore/wholeTowns.test.ts` (WT1-WT11, Allentown's real border and place points in `allentownHoods.json`) and `waitingPins.test.ts` (WT12-WT14); the `carousel` journey's `wholeTowns` checks WT5-WT8, WT10-WT14 on the web build.
- **Allentown:** 24 neighborhoods listed before, 36 after (35 neighbourhood points less 3 wards, Trexler Park 5.5 km out among them, and the hamlet Hanover Acres).
- **Changed from the plan:** WT13's cap is zoom 17, the map's closest fit, not 18; WT10's journey check is in `carousel`, not `marks`.
- **Deferred:** in `docs/DEFERRED.md`, "Whole towns". **Native:** never run on a device (`docs/NATIVE_UNVERIFIED.md`, "Whole towns").

## Audit (Nov 11, at the owner's request)

The auditor (1-13), the steward (14-15) and the UX reviewer (16-23), with the journey's six pictures
(`whole-towns-0` to `-5`). The owner's calls on 14, 17/18, 4/16 and 7 (AskUserQuestion, Nov 11; decision 0128).

1. A neighborhood past the z10 tile edge of the town's point drops off (the border is clipped to the tile read): accept, the border is read across the tiles its clipped edges touch.
2. A dot's tap reach is ~10 px at whole-town zoom (`pressRadiusM` caps at 150 m): accept, the dot's reach is 44 px at the settled zoom.
3. At high zoom every waiting place of a town becomes a marker: accept, only places in view can be "?"; the rest are dots (one layer).
4. Dots hidden under a "?" (a pin stands above its point): accept, the owner's call: a "?" with places under it zooms in on a tap until they separate; at the closest zoom it opens the card. The split uses the pin's real footprint.
5. With the pins hidden from a screen reader, a town with no neighborhoods has no keyboard way to its card: accept, the spoken line is a button that opens the selected area's card.
6. Native reports the zoom only every 0.25, so the split runs on a stale zoom: accept, the split runs on the settled camera's own zoom (`onCameraChange`).
7. A hamlet's card says "New to you" forever (walks are never placed in hamlets): accept, the owner's call: walks are placed in a hamlet inside the walk's town border (`AREA_RULES` 4, every walk placed again).
8. A town's read stands in for the read near you: accept, a town's read never satisfies a near-you read.
9. A tap that closes the Layers panel also zooms: accept, that tap does nothing else.
10. The ward rule misses "Ward One", "Thirtieth Ward", "Ward 5A", and hides New Orleans' "7th Ward": accept the misses; reject the rest (the owner's call: wards are not neighborhoods).
11. The spoken line says "green" and "views", where the spec's example says "parks": reject, the line uses the card's own kind words (`ATLAS_LABEL`); the spec's example is corrected.
12. The page lists by reach while the border is pending: reject, a fallback to the old list for a moment, never a wrong area (WT3 governs the read, which never takes a pending border for none).
13. Town reads are evicted by twelve near reads, so a page re-reads its border: accept, town reads are kept apart from near reads.
14. The town map thins as places are found (the steward's S1): accept, the owner's call: with a town selected, under neighborhood zoom, every findable place is the same dot whether found or not; "?" (the unfound only) on a neighborhood or zoomed in.
15. "Places to find in X" reads as an errand list (S2): accept, the line is "Waiting in X: kinds", as the card's "Waiting to be found".
16. Dots under pins and under the area's point (U1): accept, as 4.
17. "?" and dot read as two things; a tapped purple dot becomes a black "?" (U2): reject, the owner kept the kind colours (Nov 11); the kind is named on the card.
18. Dot colours under 3:1 (U3): accept, the owner's call: kind colours with a dark outline that reaches 3:1 on every ground.
19. After a dot's zoom the crowd runs off screen (U4, opinion): defer.
20. Selecting another neighborhood keeps a deep zoom (U5): reject, EC5: the map eases to the selected area at the current zoom (decision 0124).
21. Overlapping tap reaches; Android's 48 dp (U6): accept in part (a pin wins inside its footprint, as 4); 48 dp deferred.
22. Three kinds of small circle (U7, opinion): reject, the dots' dark outline and the walker's ring keep them apart; the owner kept kind colours.
23. The back pill covers the scale bar; a shape under Locate (U8): defer, it predates the slice.

**Audit record (Nov 11):** 23 findings: 16 fixed (14 whole, 10 and 21 in part), 2 deferred (19, 23; and 21's 48 dp), 5 rejected (11, 12, 17, 20, 22; and 10's "7th Ward"). Regression tests, each failing on `8b48aab` and passing after: `whole-towns audit 1`, `2`, `3`, `4`, `7`, `8`, `9`, `10`, `13`, `14`, `15`, `18` in `src/lib/__tests__/explore/wholeTownsAudit.test.ts`; `whole-towns audit 4`, `5`, `6`, `14` in the `carousel` journey's `wholeTowns`. Finding 16 is held by audit 4's tests, 21's part by audit 4's. `TO9` now pins `AREA_RULES` 4. The owner's calls in this audit (14, 18, 4, 7) are in decision 0128.
