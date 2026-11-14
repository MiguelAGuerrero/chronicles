# After dark (DK1-DK17)

Last exported: not from the concept doc. The owner's idea at the vision gate and their calls in this session (Nov 14) are the source.

## Vision

Idea: The owner, Nov 14: "There should be some idea of safety assessment, whether that be crime rate or another metric that can evaluate an area based on how known it is to walk around perfectly fine and safely. Right now, there's a little bit of reliance on the fact that the app shows you where the storefronts are, but an extra consideration might be helpful."
Verb: earn (it helps the walker notice where streets are mapped as lit and what is open after dark; steward S7)
Touches: Always, "Guidance is structural: where there is a lot, and what makes a place itself, never whether it is good"; Never, "Ratings, reviews, stars, 'best of', rankings of places"; Never, "Data leaving the device without a tap"; AGENTS.md, "No dataset is hard-coded"; decisions 0093 and 0096 (walkability judged from how the ground is built, in words, never a number; a silent heads-up while the layer is on); 0080 (busy streets are a density of places, not busyness: unchanged by this slice); 0097 (map layers: one Layers button, every layer off by default).
Verdict: aligned if reshaped (crime rates are out; the owner took the after-dark shape at the gate, Nov 14)
Shape: a fourth map layer, "After dark", off by default: a faint line along ways OpenStreetMap marks as lit, and a small mark at each place whose opening hours say it is open after dark. While navigating with the layer on, after sunset, a quiet line ahead of a stretch OpenStreetMap marks as unlit. It never shows "safe", "unsafe", a red zone, a crime figure, a number, or a route that avoids an area.
Criteria: DK3, DK4 (only evidence adds to the map: lit ways and places known open), DK11 (no safety or grade words, no number), DK8 (tile bounds only, never the walker's position, through the existing Overpass host), DK10 (the heads-up never changes the route), DK17 (no suggested route reads after-dark data).
Open: none (the owner's answers of Nov 14 are below).

The gate's shape put "open now" inside Storefronts; the owner then chose a layer of its own, so Storefronts and decision 0080 are untouched, and the gate's line "a place with no opening hours still counts" (a Busy-streets rule) became DK4's "a place with no hours readable draws nothing and is never drawn closed".

## What it is

Walkability (0093, 0096) answers "is this ground built for feet". After dark it answers a second question a walker asks in a town they do not know: where are the streets lit, and where is something still open. Both are read from OpenStreetMap tags (`lit`, `opening_hours`), which Overture's road and place data do not carry (checked against Overture's schema, Nov 14). The app already reads OpenStreetMap ways through the Overpass API as walkability's fallback; this layer asks Overpass by tile for the two tags, keeps the answer on the device, and judges it on read.

How much of a town is tagged is not known: Overpass and taginfo are blocked from the cloud session where this was planned, so tagging coverage in the owner's towns (Allentown, Phillipsburg, Baltimore) is measured on the first run, not assumed. Where little is tagged, the layer shows little, and its note says it shows only what is mapped.

## Decisions (the owner's calls, Nov 14)

- **Crime data is out** (the gate): a rating of places by reputation, misleading in busy centres, with no open worldwide source. The after-dark shape instead.
- **Both moments**: a map layer on Explore and Navigate, and a heads-up on a navigated walk.
- **Overpass per tile**: one request per z14 tile for lit ways and places with opening hours, kept on the device, under walkability's back-off and its 60-a-day cap, one cap for both. The chronicles-data archive is not used for now.
- **A small opening-hours reader of our own**: the common forms, anything else unknown; no dependency.
- **After dark begins at local sunset** and ends at sunrise, worked out on the device from the position and the date; no library, no network.
- **A layer of its own**, "After dark", the fourth switch in the Layers panel; Walkability and Storefronts unchanged. The heads-up follows this switch.

## Criteria

1. **DK1** The owner's task, in their words: "see where streets are lit and where places are still open, before I go and while I walk." From the Layers button on the Explore map, Navigate (ready) and the live walk, the panel lists a switch "After dark" with a moon, beside Walkability, Storefronts and Town borders; turning it on draws the layer on that map and every other (one setting for every map, ML). While it is on and drawn, the panel line under it, on every screen, ends "Only what is mapped" (steward S1). Under its name the switch says "Lit streets, open places and a line on a route" (after-dark ui 1, audit 9).
2. **DK2** Found cold: someone not told where the control is, shown the Explore map and asked to "see where the streets are lit", taps the Layers button and then the "After dark" row.
3. **DK3** With the layer on, a way OpenStreetMap tags as lit (`lit=yes`, `24/7`, `automatic`, `limited`, `interval`, `sunset-sunrise`, `dusk-dawn` or a time range) draws a line along it, of one fixed width at 3:1 on the ground, fading to half below z15 (after-dark ui 2, audit 8), with no halo, blur, fill or area built from the lines (steward S1). A way with no `lit` tag, or `lit=no`, draws nothing on the map: nothing is ever drawn as dark.
4. **DK4** With the layer on, a place (food, drink, a show, or a shop presence counts in Shops; never a pharmacy, fuel, a chemist, a convenience store or a supermarket: audit 10) whose opening hours say it is open at the reading's time draws a small open mark at its place, never its name, kind or a count; marks never cluster or carry a label at any zoom, and a tap on one does nothing (steward S9). A place closed then, or whose hours are missing or can't be read, draws nothing. When the map's centre is more than 45 minutes of solar time from where you are (or, with no position, 150 minutes from the device's own offset), no open marks are drawn and the panel line says "Hours read only near you" (steward S8).
5. **DK5** The reading's time: between local sunset and sunrise at the map's centre, now; in daylight, an hour after tonight's sunset. The panel's line under the switch says which in words, "Open now" or "Open after sunset", followed by "Only what is mapped", while the layer is on.
6. **DK6** Sunset and sunrise are worked out on the device from the position and the date, within five minutes of published tables at the equator, in Allentown in June and December, and at 60° north; on a day with no sunset (polar day) the layer draws no open marks and says "No dark tonight"; on a day with no sunrise every hour is dark.
7. **DK7** Opening hours are read in the common forms: days and day ranges (`Mo-Fr`, `Sa,Su`), several time ranges (`09:00-12:00,13:00-18:00`), a range past midnight (`18:00-02:00`, open into the next day), `24/7`, `off` and `closed`, rules separated by `;` with the later one winning for its days. A rule with a month, a week, a date, a public holiday (`PH`), `sunset`/`sunrise` times or a comment makes the whole value unknown, never open and never closed.
8. **DK8** One Overpass request per z14 tile asks for that tile's lit ways and its places with opening hours, and nothing else; the request carries the tile's bounds, never the walker's position. Each request counts toward the one 60-a-day Overpass cap and pauses under the one back-off that walkability's fallback uses, so the two together never send more than the cap. After-dark reads stop at 40 of the 60, so walkability's fallback always has 20 left in any day (steward S10).
9. **DK9** A tile read is kept on the device and read again only when it is 30 days old; what is kept is the tags as OpenStreetMap gave them (the opening-hours text, the `lit` value), and whether a place is open is judged at read time, never stored. The kept tiles are cache, cleared with the other derived stores.
10. **DK10** While navigating with the layer on, between sunset and sunrise, a quiet line shows 200 m before a stretch of 100 m or more of the route along ways tagged `lit=no` (each run 100 m or more on its own; `lit=disused` is never said: audit 1, 11): "Next: <street> is mapped as unlit" ("Next: a stretch mapped as unlit" where the way has no name; steward S6). Unlit stretches less than 200 m apart are one stretch, said once (steward S3). Once per stretch, kept 15 s past it, with no sound or vibration, and the route never changes. The line wears the layer's moon, never a car, caution or warning glyph (steward S2). When walkability's line is due at the same time, walkability's shows (one line at a time).
11. **DK11** No word or number this layer shows (the switch, its panel lines in `notes.ts` and `sun.ts`, the legend, its tooltips, its note, the heads-up's template with a fixed street name; a street's own name is exempt) contains a number, a count, a share, a comparison, or any of the words "safe", "unsafe", "secure", "danger", "dangerous", "crime", "risk", "avoid", "caution", "careful", "warning", "comfortable", "well-lit", "poorly", "mostly", "quiet", "deserted", "isolated" or "lively" (steward S5).
12. **DK12** The legend, in the walk's settings drawers (Navigate's start settings and the live walk's options), shows, with swatches matching what is drawn:
    - "Lit streets", tip: "Lit streets: streets OpenStreetMap marks as having street lights.";
    - "Open after dark", tip: "Open after dark: places whose hours, as mapped, say they are open now after sunset, or an hour after sunset by day." (audit 7);
    - a third row with the moon, "On a route after dark", tip: "On a route after dark: a line before a street mapped as unlit." (steward S3);
    - and the layer's note: "From OpenStreetMap. Only what is mapped: a street with no lighting mapped may still be lit."
13. **DK13** Nothing is read for the layer while it is off: no Overpass request and no read of the kept tiles; the heads-up reads no route tile while it is off.
14. **DK14** When Overpass is busy, unreachable or past its cap, the panel line says "Not available now" and no guess is drawn; tiles already kept are still drawn, and a tile that failed is not asked again for two minutes.
15. **DK15** The map keeps its last after-dark drawing while new tiles are read, and sends its data again only when what is drawn changes (a new tile, or the reading's time crossing an opening or closing).
16. **DK16** Maps without a Layers button (Chronicle's map, the replay, a moment's place) never draw the layer: it is guidance before and during a walk, not part of a memory.

17. **DK17** No suggested route (Scenic routes, Kind walk, the walk planner, Walk me back, Go here) reads after-dark data, and no `unlit` stretch reaches them: none of their modules imports `src/lib/dark/` or takes the unlit stretches (steward S4).

## Record

Built 2026-11-14 on `claude/affectionate-heisenberg-4x07ad`, test-first by history (17 of 17). Unit tests in
`src/lib/__tests__/after-dark/`, a contract case on all three stores, the `dark` journey (Explore, Navigate and the walk with the
browser's clock after sunset and by day; a refusing Overpass; the unlit heads-up; Chronicle drawing nothing). Merged with
`main` on the way: storage after reactions (SQLite migration 30, IndexedDB 23), Storefronts' names. Native unverified.

**The cold find** (decision 0167): lit streets found through the Layers button (medium); open places not placeable from the
name alone, so the switch says what it shows (`after-dark ui 1`).

**The UI review** (decision 0145), 7 findings, plus one from the legend's picture: U0 (the legend's picture) fixed in the
journey; U1 the lit line at 1.1:1, fixed (`after-dark ui 2`); U2 the fixture's lit ways off the streets, fixed in the harness;
U6 the subtitle could read as a status, fixed (`after-dark ui 3`, reworded again by audit 9); the legend's swatches not as
drawn, fixed (`after-dark ui 4`); U3 (a key on Explore) and U4 (the ring beside a find) to the owner (DEFERRED); U5 (the panel's
ground) and U7 (the line's width) rejected: the panel and the line are shared components older than this slice.

**The audit** (2026-11-14, at the owner's request): 16 findings (the auditor's 10, the steward's 6), 11 fixed, 1 fixed in the
docs, 3 to the owner, 1 rejected.

1. Short unlit crossings of an untagged street joined into a stretch: accept, fixed (`after-dark audit 1`).
2. Walkability's line held for the after-dark read: accept, fixed (`after-dark audit 2`).
3. A later rule did not stop hours running past midnight into its day: accept, fixed (`after-dark audit 3`); the reading is the
   cautious one (a missing mark over a wrong one).
4. Some tiles failed, and the panel did not say so: accept, fixed (`after-dark audit 4`).
5. Crossing sunset cleared a walkability line on screen: accept, fixed (`after-dark audit 5`).
6. Two busy answers at once doubled the pause: accept, fixed (`after-dark audit 6`).
7. The open tip pointed at "the time above": accept, fixed (`after-dark audit 7`).
8. The amber line, whole at town zoom, could read as a lit zone (steward S1): accept, fixed (`after-dark audit 8`); no picture at
   town zoom over a densely tagged centre exists yet.
9. The switch did not name the line on a route (steward S3): accept, fixed (`after-dark audit 9`).
10. Chemists, convenience stores and supermarkets as open marks (steward S4): accept, fixed (`after-dark audit 10`).
11. `lit=disused` said as unlit (steward S5): accept, fixed (`after-dark audit 11`).
12. The records out of date (migration and version numbers, Busy streets, "faint"): accept, fixed in the docs.
13. The "near you" rule differs from DK4's first wording, and judges a town an hour away on the wrong clock with no position:
    defer to the owner (DK4 now states the built rule; DEFERRED).
14. No words on the map while the panel is closed (steward S2): defer to the owner (the panel holds the words, Nov 5).
15. The amber sits near the accent (steward S6): defer to the owner (the colour is a plan default).
16. The heads-up wraps to two lines: reject (two lines are fine for a long street, as the UI review found).
