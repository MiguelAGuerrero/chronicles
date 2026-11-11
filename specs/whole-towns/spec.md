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
Open: none (the owner's four answers, and the answer to the steward's S1, Nov 11; decision 0127).

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
5. **WT5** A place the map calls a hamlet is listed as a neighborhood of a town when its point is inside that town's border. A hamlet outside every border is not listed, and walks are placed as before (the home's stars are unchanged).
6. **WT6** A point named as a ward ("1st Ward", "Eighth Ward", "Ward 5", "10th Ward") is not listed as a neighborhood, on a town's page or near you, including rows listed before this change. A name that only contains the word ("Wardsville", "Howard Park") is listed.
7. **WT7** With any area selected, every place still to find inside it (a neighborhood's ring, a town's border) is on the map, of the kinds shown, as a "?" or a dot (WT12).
8. **WT8** A "?" on the map is never named; the card's "Waiting to be found" shows one per kind whatever is selected; no text on the page, the row or the card holds a count of places or of neighborhoods, in digits or in words.
9. **WT9** Opening a town's page lists its neighborhoods once per build: going back and in again reads nothing twice, and a listing made before this change (by the 5 km reach) is made again once, across the border.

10. **WT10** Explore's map draws no found place, whatever is selected: a find leaves the map when it is made, and an area with every place found shows no pin, line, tint or check that says so, on the map or its card in the row. The area's card keeps its "Found" list.
11. **WT11** With an area selected, its "?" pins are one accessible element naming the area and the kinds waiting ("Places to find in Downtown: art, parks"); no "?" is announced on its own, and how many there are never changes what is announced.

12. **WT12** Each place on the map is a "?" pin where the pin has room on screen and a dot where a pin would overlap another pin: no two "?" overlap. Which places get a pin is decided once the camera settles, at the zoom rounded to half levels (as capture pins are, `useZoomPins`), nearest the area's middle first, so the same view always shows the same pins and a pan or a pinch in progress changes nothing.
13. **WT13** A tap on a dot eases the map in around it to the zoom at which it has room to be a "?" (at most zoom 18); nothing is named. With reduced motion the map jumps. A tap on a "?" does what it did (the area's card).
14. **WT14** A dot is smaller than a "?" pin, in its kind's colour with a white edge, and carries no name, number or icon; its tap reach is the map's press reach (44 px). Dots and "?" are drawn only for the selected area, never for every area in view.

## Amends

- The explore atlas's AT2 (`specs/explore-atlas/spec.md`): a town's own neighborhoods were "within its reach (capped at 5 km), at most 24"; with a border they are those inside it (WT1), the reach and cap staying for a town without one (WT3).
- The carousel's EC3 (`specs/explore-carousel/spec.md`): "not capped beyond what the atlas lists today" now lists a town's whole border.
- **Fix area-marks** (`.claude/rules/explore-and-discovery.md`): one "?" per kind gives way to every place, as "?" or dot (WT7, WT12); the finds named over the map are gone (WT10, decision 0127).

## Routes and data

- No new routes, dependencies or storage. Neighborhood rows (`atlas_area`) are cache, as before; a hamlet's row is a neighborhood row. The near read's record in meta `atlas_near:neighborhood` gains the town it covered.
- Walk placement (`AREA_RULES`, the home's stars) is untouched.
