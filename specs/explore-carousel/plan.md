# Explore carousel: the plan

For the owner to review before any code. The criteria are in `spec.md` (EC1-EC20).

## What exists

- `src/app/(tabs)/explore.tsx` is a short `WalkMap` (170-260 px) over a vertical `ScrollView` grid of `AtlasTile`s (`neighborhoods`, then "Other towns"; on a town's page the wide tile, then its neighborhoods). From 1000 px the map and the grid sit side by side. `selected` and `open` are set by `pick()`; a town's page is `townSeen`, entered by `enterArea()`.
- The map's one-finger swipe (`onSwipe`, DN1-DN13) lands where a pan would have and selects the nearest area on that side (`atlas/snap.ts`: `swipeHeading`, `landing`, `nextArea`, `snapScope`), and `createGridRows` scrolls the tile into view.
- `areaPoints` already draws one level and names only the selected area (`areaPins`, fix map-levels and pins-selected-only).
- The Busy layer's street names are DOM labels from `busy.view.labels` and `.strips` (`WalkMap.web.tsx:825`), drawn for every area read within 3 km: the stack in the screenshot.

## Design

1. **The decisions, pure (`src/lib/atlas/carousel.ts`, `@layer core`).**
   - `carouselOrder({ town, ownTown, neighborhoods, towns })`: the row's keys (EC3).
   - `firstSelection(order, selected)`: the key to select when nothing is, or the selected one has left the list (EC1, EC12).
   - `rowStep(dx, dy, minPx)`: -1, 0 or 1 from a swipe's screen direction, never turned by the bearing (EC8, EC9); `stepKey(order, selected, dir)`: the neighbouring key, or null at an end.
   - `settledIndex(offsetX, step, count)` and `offsetOf(index, step)`: the card a scroll settled on, and where to scroll to centre one (EC4).
   - `busyNamesNear(view, at, zoom, ringM)`: the Busy view with its names kept only inside the selected area's ring and from zoom 13 (EC7). Its lines stay.
2. **The row (`components/atlas/AtlasCarousel.tsx`, a view).**
   - A horizontal `ScrollView` with `snapToInterval`, `decelerationRate="fast"` and the card width `min(screenW * 0.78, 320)` with a 12 px gap and padding so the first and last card centre. No new dependency: the same `ScrollView` both platforms have.
   - Each card is the existing `AtlasTile` in a compact variant (`compact` prop, no change for the town's wide tile), with its testIDs kept (`atlas-tile`, `data-name`, `data-selected`), so the journeys' selectors still find them. It keeps name, distance words, familiarity words, character line, busiest street and kind dots, and a town's "See its neighborhoods" footer (EC15, EC18). **What goes is the 4:3 mini-map picture**: at a card 312 px wide it alone is about 234 px, which would leave the map under half the screen. The card is about 190 px tall; the area's own card (EC20) still shows the picture. This is the one thing the owner has to accept (open call 4).
   - The selected card's accessibility label ends "Opens its card" (a town's "Opens its page"), the others' "Selects it" (EC13).
   - Scrolling that settles reports a key (`onSettle`); the screen selects it. A selection made elsewhere (a map swipe, a tap) scrolls the row to it (`scrollTo`, animated unless reduced motion). The two cannot loop: a settle that equals the selected key does nothing.
   - A status card (`atlas-empty`, the states EC14 lists) replaces the cards when there are none.
3. **The screen (`(tabs)/explore.tsx`).**
   - Layout: the map takes `flex: 1`; the row (about 200 px, with the safe-area bottom) sits below it, above the tabs. The grid, its section headings, `createGridRows`, `reveal`, `gridWithBack` and the wide two-pane split go. Banners, the scanning line and the long-press hint become an overlay above the row.
   - `useEffect` on the order calls `firstSelection` and selects; a select goes through `setSelected` (not `pick`, so no card opens). The page's `enterArea`/`leave` already clear the selection; the next order selects the first card (EC1, EC12).
   - Map swipe: `onSwipe` → `rowStep` → `stepKey` → select, ease to it (`showPoint`), scroll the row, announce (EC8, EC13). The directional `nextArea`, `landing`, `swipeHeading` and `snapScope` are deleted with their tests.
   - Map tap away from an area only closes the long press's choices (EC1); the selected dot no longer needs `tapClears`.
   - Tapping a card: the selected card opens the area's card, or a town's page; another card selects and centres it (EC11).
   - `areaPoints` keeps `areaPins`; `landing={busyNamesNear(busy.view, sel.area.at, view.zoom, ATLAS_RULES.ringM)}` (EC7).
4. **`WalkMap` (web and native)** keeps `onSwipe` unchanged (the drag, its speed, the framed middle); the screen reads only the drag's direction. Arrow keys keep `arrowSwipe`; the screen drops ArrowUp and ArrowDown through `rowStep`.

## Tests per criterion (written first, as todos)

| Id | Test |
|---|---|
| EC1 | `carousel.test.ts` "EC1: ..." (`firstSelection`: none selected, a selection that left the list, a selection still listed); e2e `carousel` "EC1: on arrival one area is selected", "EC1: a tap on the map away from an area keeps it" |
| EC2 | e2e `carousel` "EC2: the map is over 55% of the screen and the row sits below it", "EC2: no grid and no section headings", "EC2: no card shows a number or a rank" |
| EC3 | `carousel.test.ts` "EC3: ..." (near page, town page, no towns, you-are-in leading) |
| EC4 | `carousel.test.ts` "EC4: settledIndex ..." (rounding, the ends, one card); e2e "EC4: a swipe on the row selects the card it settles on" |
| EC5 | e2e `carousel` "EC5: the selected neighborhood has its ring and name; a town has its tinted border" (`data-selected`, `data-borders`) |
| EC6 | `atlas.test.ts` "fix map-levels", "fix pins-selected-only" stand; e2e "EC6: one name on the map" |
| EC7 | `carousel.test.ts` "EC7: ..." (outside the ring, below z13, the selected area's own); e2e "EC7: at zoom 11 the map has no street names" |
| EC8 | `carousel.test.ts` "EC8: left is next, right previous, vertical none, the bearing never turns it, the ends hold"; e2e "EC8: a drag left on the map selects the next card" |
| EC9 | e2e `carousel` "EC9: ArrowRight, ArrowLeft step; ArrowUp does nothing; + zooms" |
| EC10 | e2e `carousel` "EC10: a drag never pans the map", "EC10: the wheel zooms, a long press offers What's good here" |
| EC11 | e2e `carousel` "EC11: a tap on the selected card opens its card", "EC11: a tap on another card selects and opens nothing", "EC11: a town's selected card opens its page" |
| EC12 | e2e `carousel` "EC12: a town's page selects its own card first; the pill and Escape return to the first card" |
| EC13 | e2e `carousel` "EC13: a step is announced", "EC13: a card is one labelled control" |
| EC14 | e2e `carousel` "EC14: with no areas, one status card in words and the banners are over the map" |
| EC15 | e2e `carousel` "EC15: no digit-only text and no 'nearest/top/best' on a card" (the existing text scans) |
| EC16 | e2e `carousel` "EC16: at 1200 px the row is at the map's bottom and a card opens beside it" |
| EC17 | e2e `snap` "DN13" and the `qol` journey stand |
| EC18 | e2e `carousel` "EC18: a card names its busiest street" |
| EC19 | e2e `carousel` "EC19: Locate, Layers, the compass and the long press's choices are inside the map, none under the row", "EC19: What's good here is reachable with the row showing" |
| EC20 | e2e `atlas` (its existing card checks: the Walk to footer, the busy streets' Walk to) stand against the row |

EC12's "pill visible over a banner" and EC14's "one banner at a time" are checks in `carousel` too ("EC12: the pill is above the row and visible while a banner shows", "EC14: only one of a banner, the hint and Looking around shows"). The e2e text scan for EC15 allows a digit only inside a distance or a "Walked N times" clause.

The existing `snap` journey is rewritten around the row (its DN2-DN9, DN11 checks retire with their criteria; DN1, DN10, DN12, DN13 stay), `atlas` and `grading` keep their tile selectors, and the other journeys that read Explore (`layers`, `walkability`, `outlines`, `marks`, `tabs`) are re-run. The retired DN ids go in `RETIRED` in `scripts/features.js`; `explore-carousel` is added to the explore feature's `specs` and, while built, to `IN_PROGRESS`.

## Files

`src/lib/atlas/carousel.ts` (new, core), `src/lib/atlas/snap.ts` (shrunk), `src/components/atlas/AtlasCarousel.tsx` (new), `src/components/atlas/AtlasTile.tsx` (`compact`), `src/app/(tabs)/explore.tsx` (the layout and swipe), `src/components/map/WalkMap.web.tsx` and `.native.tsx` (only the arrow keys), `scripts/e2e/journeys/{carousel,snap,atlas}.js`, `scripts/features.js`, the rule file `.claude/rules/explore-and-discovery.md`, `docs/`. About 10 files, so a slice and not a fix.

## Data

None: no migration, no `ATLAS_CODE` or derivation bump. The row is derived from what `useAtlas` already lists.

## Deferred

- Tapping a dot on the map to select it (dots stay inert).
- Peeking the next card's edge as a fixed width on very narrow screens beyond the clamp.
- A different card for a town (a wide card with its own sketch).
- Chronicle's and Navigate's maps stay as they are.

## Native, never run on a device

The horizontal `ScrollView`'s snap and `scrollTo` on iOS and Android, the swipe over the new layout (the `PanResponder` and the row's own scroll sharing a screen), and the row's safe-area bottom. Each goes in `docs/NATIVE_UNVERIFIED.md` as a `Do / Expect` item.

## The steward's findings (Nov 10), triaged

- **S1 accept:** one new decision record (`docs/decisions/0123-explore-carousel.md`, with the owner's answers below) names 0034, 0066, 0067, 0077 and 0092, says what is kept (presence as dots, familiarity in words, rings read by themselves, the card, one way back) and is added to VISION.md's Precedents by the owner's say. Written when the owner gives the go-ahead.
- **S2 accept:** EC15 names the card's contents; EC18 keeps the busiest street; the mini-map picture is dropped from the row's card and stays on the area's card (open call 4).
- **S3 accept:** EC7 and EC18, and the spec says it amends 0034's names, never its information. The steward asked which colour the Busy layer is: `HOTSPOT` is `#d6268c`, magenta, as the screenshot shows (the "green" in a `WalkMap` comment is stale; fixed in passing with the layer code).
- **S4 accept:** EC19, and the Touches line no longer says a capture lives on Explore. Reaching Walk to is select, then tap, as 0067's footer stays on the card; open call 2.
- **S5 accept:** EC12's pill is above the row, over the map, and never under a banner; checked in `carousel`.
- **S6 accept:** EC14 (a town with no neighborhoods shows its own card and the words over the map).
- **S7 accept in part:** EC14 gains "one banner, hint or status at a time" and "the hint shows once". The selected name stays in the accent colour: a selection is not a win, and it is what the map already does.
- **S8 accept:** EC13 (labels, reachability, the row is the screen reader's stepping).
- **S9 accept:** a town's footer and a tap on its selected card do the same (EC15). The plan's `drill` footer stays.
- **Silent 1 (a long row's last card):** the row says nothing of a rank (EC3); not capped beyond today's `ATLAS_RULES`.
- **Silent 2 (the first area far from you):** the arrival keeps today's framing (`nextFrame`: the areas and your dot), and the selection does not ease the camera away; open call 5.
- **Silent 3 (the same-scale mini-map comparison):** lost in the row, kept on the area's card; open call 4.
- **Silent 4 (looking beside the selected area):** the long press, as now; pinch and the wheel to zoom out; open call 5.

## Open calls for the owner

1. Towns in the same row after the neighborhoods (recommended), or the towns as their own row?
2. A tap on the selected card opens its card, a tap on another card only selects (recommended), or any tap opens?
3. Wide screens: the same layout with the card as a side panel (recommended), or keep the map beside a list?
4. The row's card drops the mini-map picture so the map keeps over half the screen (recommended), or keeps it and the row is taller?
5. With one-finger panning gone, to look beside the selected area you pinch out or long-press; arrival keeps today's framing of the areas and you. Acceptable (recommended)?
