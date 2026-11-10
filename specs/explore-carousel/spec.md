<!-- Repo first: written from the owner's request in a session (Nov 10, with a screenshot of the cluttered map), not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Explore carousel: most of the screen is the map, the areas are a row of cards

Nov 10, 2026 · @Miguel Guerrero

## Vision

Idea: Explore's map is still cluttered (the Busy layer's magenta street names stack when zoomed out, area names crowd the small map). Make browsing a single row of cards you swipe between, at the bottom, with most of the screen the map, Atlas Obscura style. For any selection (neighborhood, town or city) the area is highlighted on the map and no neighbouring area is drawn with its text; a swipe on the map steps the row; the first area is selected on arrival (the owner, Nov 10).
Verb: earn (it raises what you notice: one area at a time, named and shown, instead of a map of competing labels)
Touches: Always, "Restraint in motion, colour and copy: the content is the novelty, not the chrome"; Always, "Counts are words" and Never, "Tallies" (a card shows no count); Never, "Scores, ... rankings" (the row's order is the nearest first, never a rank, and says so in no copy); Always, "Capture is one tap away" (Explore has no capture; Walk here, Locate and the tabs stay on screen, EC20); decisions 0066 and 0067 (the atlas is a grid, "no level switch", a card as a full-screen drawer, wide panes, "Walk to" as a footer), 0077 (one way back on a town's page), 0092 (discrete navigation, an experiment), 0034 (busy areas are information only): the carousel supersedes the grid, the wide panes and the swipe and amends 0034's names, by the owner's call; it needs one new decision record naming all five (written with the owner's answers to the open calls, and linked from VISION.md's Precedents).
Verdict: aligned if reshaped
Shape: As asked, with these changes. The row is ordered nearest first and never labelled "best" or "top"; a card carries what a tile carries today (name, where it is, familiarity in words, its character in words, its busiest street, kinds as dots) and never a count or a rating. The Busy layer's names are drawn on the map only for the selected area and only when zoomed in (its lines draw at any zoom); every area's busiest street stays named on its card. The first area is selected on arrival by distance and "you are in it", never by popularity.
Criteria: EC2, EC3 (no rank, no count on a card); EC6, EC7 (the map's only names are the selected area's and the Busy names near it); EC15 (a card's content, and no count, rating or score); EC18 (a busy area keeps its name on its card).
Open: the calls in `plan.md` (towns in the same row, tap behaviour, wide screens, the first area's framing, looking beside the selected area).

## What it is

Explore opens on a full-height map. The areas around you are one horizontal row of cards docked at the bottom, above the tabs. One card is always the selected one; it is highlighted on the map, and swiping the row, swiping the map or tapping a card moves the selection. This replaces the grid of tiles below a short map (0066) and the map's directional swipe (DN2, 0092).

## Decisions (the owner's calls, Nov 10)

- **A carousel, for any selection.** Browsing neighborhoods is a single row you swipe between; the same for a town or a city. Most of the screen is the map.
- **The map shows only what is selected.** The selected area is highlighted; adjacent neighborhoods, towns and cities are not drawn with their text.
- **A swipe on the map steps the row**, in the row's order, left for the next card and right for the previous.
- **The first area is selected on arrival**, the one you are in or the nearest, so something is always highlighted and named.

## Criteria

1. **EC1** While any area is listed, one is selected. On arrival the first in the row is, and again whenever the page changes or the selected area is no longer listed. A tap on the map away from an area never clears the selection.
2. **EC2** The map fills the screen from the top to the row; the row sits above the tabs. There is no grid of tiles and no "Neighborhoods near you" or "Other towns" heading, on a phone and on a wide screen. No card or heading shows a count, a rank or a rating.
3. **EC3** The row's order is fixed and not capped beyond what the atlas lists today (`ATLAS_RULES`). On the page near you: the neighborhoods nearest first, the one you are in leading, then the other towns nearest first. On a town's page: the town's own card, then its neighborhoods nearest first. The row says nothing of a rank, a first or a last.
4. **EC4** Swiping the row (a finger's drag or flick; on desktop web the wheel, a tap on a card, a swipe or an arrow key on the map) settles on one card at a time and selects it. After it settles, the centred card and the selected area are the same, and a card's name is shown in full.
5. **EC5** The selected area is highlighted on the map: a neighborhood by its ring, a town by its tinted border, either by its name in the accent colour. The map eases to it at the current zoom (jumps with reduced motion).
6. **EC6** The map draws no name but the selected area's. The other areas of its level are unnamed dots; areas of another level are not drawn (fix map-levels, kept).
7. **EC7** The Busy layer's lines draw at any zoom. Its street names are drawn only near the selected area (a neighborhood's ring, a town's own reach) and only from zoom 13; otherwise none.
8. **EC8** A one-finger swipe on the map steps the row by what is on screen: left, next card; right, previous, whatever the map's bearing. A swipe more vertical than horizontal does nothing. At the first or last card nothing changes.
9. **EC9** On web, with the map focused, ArrowRight is next and ArrowLeft previous; ArrowUp and ArrowDown do nothing; `+` and `-` still zoom.
10. **EC10** One finger never pans the map. Pinch, the wheel, a double tap, the two-finger turn, the long press (What's good here, Walk here) and Locate work as before (DN1, DN10).
11. **EC11** A tap on the selected card opens its card, as a tile did; a tap on a town's selected card opens its page. A tap on any other card selects and centres it and opens nothing.
12. **EC12** A town's page has the pill and Escape back (0077); opening or leaving a page selects the first card again and resets the row to it. The pill is visible and tappable while a banner, the hint or "Looking around…" shows, and Back (Android) still returns.
13. **EC13** A screen reader hears an area's name when the selection changes, by a swipe, a key or a tap. Every card is reachable by a screen reader's swipe and by Tab, and is one control named by its area and where it is; the selected card's label ends "Opens its card" (a town's "Opens its page") and the others' "Selects it". The row is the screen reader's way to step areas.
14. **EC14** With no area to show, the row's place holds one status card in words ("Find where you are to see the areas around you." with a Find me button when there is no position, "Reading the map around you…", "Couldn't read the map. It will try again in a moment.", "No neighborhoods are named on the map here."). A town with no neighborhoods shows its own card, and over the map what the map lacks ("The map names no neighborhoods in X.", never a claim about the town). The errors, notices, "Looking around…" and the long-press hint sit over the map above the row, never inside it, and at most one of them shows at a time; the hint shows once: after a few seconds on screen it is marked seen, used or not.
15. **EC15** A card carries what a tile carries: the name, "You're here" or the distance in words, familiarity in words ("New to you", "Walked 3 times"), its character line, its busiest street and the kinds as dots; a town's, when it is the selected card, its "See its neighborhoods" footer, which does what a tap on it does. No digit appears on a card outside a distance or a "Walked N times" clause, no rating or score, and no "nearest", "top" or "best" wording.
16. **EC16** From 1000 px wide the layout is the same (map, row at the bottom of it) and the area's card opens as the side panel, as now.
17. **EC17** Only Explore changes: Navigate, Chronicle, the replay and a day pan their maps freely (DN13).
18. **EC18** Each area's busiest street is named on its card whether or not the map draws the name (the owner's complaint amends 0034's names on the map, never the information).
19. **EC19** The long press's choices (What's good here, Walk here), Locate, Layers and the compass are inside the map: none is under the row or the tabs, at any card height the layout takes. Walk here and What's good here stay reachable with the row showing.
20. **EC20** The area's card (the full drawer or the side panel) still holds Walk to as its footer, the busy streets' Walk to and everything the card held; the row only changes how it is reached.

## Amended and retired (DN, discrete navigation 0092)

- **Retired:** DN2 (the swipe lands where a pan would have), DN3, DN4 (a swipe with nothing that way), DN6's tile in a grid, DN7, DN8 (a town step is a row step), DN9 (a tap clearing the selection), DN11's four arrows. They are replaced by EC1, EC8, EC9, EC11.
- **Kept:** DN1, DN10, DN12 (EC10, EC13), DN13 (EC17); `swipeOf`'s 24 px floor and the web and native swipe reports.

## Routes and data

- No new routes, dependencies, storage or derivation rules. The row is a horizontal `ScrollView` with snapping, which both platforms have. The selection and the open card stay in the Explore screen's state; the row's order is derived from what `useAtlas` lists.

## Audit (Nov 10, at the owner's request)

The auditor (8 findings) and the vision steward (8 findings, numbered 9-16 after them): 16 findings, 9 fixed, 2 deferred, 3 rejected, 1 for the owner, 1 in part.

1. A mouse drag on the row does nothing on desktop web: defer. Touch is the platform; a desktop reader steps by a tap on a card, the map's swipe or the arrow keys. EC4's wording says so now; a web-only drag-to-scroll would be a web exception (DEFERRED).
2. A stalled page re-aims the row to a card nobody chose: accept. `settleStep` (`carousel.test.ts` "explore-carousel audit 2"); a reader's own drag clears the row's target. The component wiring is by review and the existing journeys.
3. The Busy view is rebuilt on every camera move: accept. `busyNamesOn`, a view returned as it is when nothing is dropped, and the screen memoizes on that boolean ("audit 3").
4. An unselected town card promises "See its neighborhoods": accept. `cardFooter` ("audit 4"); e2e `carousel` "explore-carousel audit 4".
5. A selection moved by a re-list is not eased or announced: defer. It is not a selection event; the map frames the page's areas, and the card and ring move together (DEFERRED).
6. A town selected in the row is framed twice: reject, not reproduced. The bounds do not change when the outline arrives; e2e `carousel` "explore-carousel audit 6" pins it.
7. A long name is cut at two lines: accept. The name wraps in full; `carousel.test.ts` "explore-carousel audit 7" reads the card's source.
8. `onSwipe` still carries the camera centre and metres a pixel, and `map.md` described them: accept the docs line, defer the payload (DEFERRED).
9. VISION.md's Precedents does not list 0124: for the owner. The page is theirs to edit; it is in STATUS "Needs the owner".
10. The long press's hint shows until used, not once: accept. It is marked seen after 5 s on screen; e2e `carousel` "explore-carousel audit 10".
11. The way back on a town's page disappears while the long press's choices show: accept. The pill and the overlay sit above them; e2e `carousel` "explore-carousel audit 11".
12. "It is one area." states derived data as a fact: accept. `townNote` ("audit 12").
13. The first card is accented before the walker chose: reject. The owner asked for something always highlighted; a selection is not a win (the plan's S7).
14. Hues on the cards (magenta busy line, route and trace colours, accent footer): reject. They are the tile's round-3 design (decision 0067), kept; a quieter card is the owner's call to ask for.
15. The fourth status ("Find me") is missing from EC14, and the row has no name: accept both. EC14 lists it; the row is named "Areas near you" (or "Areas in X"); e2e `carousel` "explore-carousel audit 15".
16. The Busy names use an unseen 800 m around a town: accept. `busyRadiusM`: a neighborhood's ring, a town's own reach ("audit 16").

Silent questions the steward put to the owner: whether a far first card should be highlighted on arrival with no fix (the row's order is by distance and the card says how far); whether "You're here" in the route colour is a celebration (it is the tile's round-3 look); whether stepping the row should move what the Busy layer reads (it does: the map shows what is selected).

## Record

Built on branch `claude/keen-maxwell-5rxhkx`, Nov 10; the owner's go-ahead on the plan, the open calls answered with the recommended options.

| Id | Passed by |
|---|---|
| EC1 | `carousel.test.ts` "EC1: ..."; e2e `carousel` "EC1: on arrival one area is selected", "EC1: a tap on the map away from an area keeps the selection" |
| EC2 | e2e `carousel` "EC2: the map is over 55% of the screen and the row sits below it", "EC2: there is no grid", "EC2: no section headings" |
| EC3 | `carousel.test.ts` "EC3: ..." (two cases); e2e `carousel` "EC3: the row holds the neighborhoods, then the towns" |
| EC4 | `carousel.test.ts` "EC4: a scroll settles ..."; e2e `carousel` "EC4: the row settles with the selected card centred" |
| EC5 | e2e `carousel` "EC5: the selected area has its ring on the map", "EC5: a town's card selected has no ring, and the map names only that town"; `snap` "DN12 ... keeps the zoom" |
| EC6 | `atlas.test.ts` "fix map-levels", "fix pins-selected-only"; e2e `carousel` "EC6: the map names only the selected area" |
| EC7 | `carousel.test.ts` "EC7: ..." (two cases); e2e `carousel` "EC7: zoomed out the map carries no Busy street names" (the e2e world has no busy streets) |
| EC8 | `carousel.test.ts` "EC8: ..." (two cases); e2e `carousel` "EC8: a drag left on the map selects the next card", "a vertical drag ... does nothing", "a drag right goes back" |
| EC9 | `carousel.test.ts` "EC9: ..."; `snap.test.ts` "DN11: ..."; e2e `carousel` "EC9: ArrowRight ... ArrowUp ... ArrowLeft" |
| EC10 | e2e `carousel` "EC10: a drag never pans the map"; `snap` "DN1", "DN10" |
| EC11 | e2e `carousel` "EC11: a tap on another card selects it and opens nothing", "EC11: a tap on the selected card opens its card" |
| EC12 | e2e `carousel` "EC12: a town's page selects its own card first", "the back pill is above the row", "Escape returns" |
| EC13 | e2e `carousel` "EC13: a step is announced", "EC13: the selected card's label ends \"Opens its card\"" |
| EC14 | e2e `carousel` "EC14: with areas listed, no status card shows" (the status card and the one-banner rule are by code review: no e2e world has no areas) |
| EC15 | e2e `carousel` "EC15: no digit outside a distance or a Walked-N-times clause, and no ranking words on a card" |
| EC16 | e2e `carousel` "EC16: at 1200 px the map is full width and the row is at its bottom"; `snap` "discrete-navigation audit 1" |
| EC17 | e2e `carousel` "EC17: Navigate's map still pans by a drag"; `snap` "DN13" |
| EC18 | e2e `carousel` "EC18: a card names its busiest street" |
| EC19 | e2e `carousel` "EC19: Locate is above the row", "EC19: Layers is above the row" |
| EC20 | e2e `carousel` "EC20: the area's card still holds Walk to"; the `atlas` journey's card checks |

- **Test-first, honestly:** the unit tests and the journey's checks were committed failing before any code, and seen failing (the unit tests against stubs that threw, the journey on the old layout: no grid, a 203 px map, nothing selected). The first tests-first commit wrote its todos through a helper constant and a wrapper function, which `check:test-first` does not read, so the literal forms followed in the next commit and the checker reports 9 criteria (EC1-EC4, EC7-EC9, EC13, EC15) as "real before todo". The order the tests ran in was the right one; the history does not show it.
- **Changed from the plan:** the row's card is the existing `AtlasTile` without its picture (it keeps its testIDs); the selection is derived in render (`firstSelection`), not set by an effect; a town selected in the row tints its border through `lit`; the DN journeys were rewritten around the row. EC14's status card and one-banner rule have no e2e: the e2e worlds always list areas.
- **Native, never run on a device:** `docs/NATIVE_UNVERIFIED.md` "Explore carousel".
