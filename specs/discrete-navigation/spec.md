<!-- Repo first: written from the owner's request in a session (Nov 4), not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Discrete navigation: Explore's map steps from area to area

Nov 4, 2026 · @Miguel Guerrero

Explore's map is small and pans freely, so a drag mostly loses you between the area dots. The owner wants to try a map that moves in steps instead. A swipe goes to the next area in that direction: the next neighborhood when you're looking at neighborhoods, the next town when you're looking at a town. It is an experiment, shipped as the way the map moves, and reverted if it doesn't feel right.

## Decisions (the owner's calls, Nov 4)

- **Gestures:** a one-finger drag (or a mouse drag) steps to the next area. Pinch, the mouse wheel, a double tap, the two-finger turn and the long press stay as they are. Free panning is gone from Explore's map only.
- **Rollout:** this replaces free panning on Explore, with no setting. If it doesn't work out, it is reverted.
- **The card:** a swipe only selects an area: its ring, its name, its tile. The card opens on a tap, as now. On a phone the card covers the map, so opening it on every swipe would stop the swiping.
- **Towns:** on a town's page with no neighborhood selected, a swipe opens the page of the next town in that direction. With one of its neighborhoods selected, a swipe moves between that town's neighborhoods. On the page near you, swipes move between neighborhoods.

- **Swiping, amended (Nov 4, after a try on the iPhone):** a swipe lands where it would have panned the map, a flick coasting as a pan does, and snaps to the nearest area to that spot; it always moves (never back to the selected area); the levels stay (neighborhoods on the page near you, towns on a town's page). The area must lie on the side swiped toward (the plan's default, so a swipe toward nothing still changes nothing).

## Criteria

1. **DN1** A one-finger drag on Explore's map never pans it freely. When the finger lifts, the map has either moved to an area or stayed where it was.
2. **DN2** A swipe lands where it would have panned the map: what comes into view follows the finger, so dragging left moves the map's middle east (when the map faces north; the direction follows the map when it is turned), as far as the drag at the map's zoom, plus the coast of a flick as a pan would have. The swipe selects the area nearest that spot among those on the side swiped toward (less than 90° off the swipe), never the one already selected, so every swipe moves and a longer or faster one goes further. The map eases to centre the area, keeping its zoom, or jumps there with reduced motion. A drag shorter than 24 px is not a swipe. (Amended Nov 4: it was the nearest area within 45° of the swipe, which never reached Bethlehem from Fountain Hill.)
3. **DN3** With an area selected, a swipe starts from it. With none selected, a swipe starts from the middle of the map.
4. **DN4** With no area on the side swiped toward, nothing changes: the selection and the camera stay where they were.
5. **DN5** Retired Nov 4 with DN2's amendment: a swipe back the same way lands back where it came from by itself, so there is no trail.
6. **DN6** A swipe only selects. The map draws the area's ring and its name in the accent colour, and its tile in the grid is marked and scrolled into view. The card does not open. A tap on a tile opens the card, as before.
7. **DN7** On the page near you, swipes move between that page's neighborhoods: the points on the map.
8. **DN8** On a town's page with one of its neighborhoods selected, swipes move between that town's neighborhoods. With none selected, a swipe opens the page of the nearest listed town in that direction, the same as a tap on its tile, and the opposite swipe brings back the town before.
9. **DN9** A tap on the map away from any area clears the selection, so on a town's page the next swipe moves between towns.
10. **DN10** Pinch, the mouse wheel, a double tap, the two-finger turn (with its compass), the long press (What's good here, Walk here) and Locate all work as before.
11. **DN11** On web, the arrow keys on the focused map do what a slow 48 px swipe that way does. `+` and `-` still zoom.
12. **DN12** A screen reader announces the area's name when a swipe or an arrow key selects it.
13. **DN13** Only Explore's map steps. The walk screen, Chronicle, the replay and a day still pan freely.

## Routes and data

- No new routes, dependencies or storage. The selection, and the trail that lets the opposite swipe return (DN5), live in the Explore screen's state.

## Record (Nov 4)

Built on branch `claude/discrete-navigation`; the owner's go-ahead on the plan, Nov 4.

| Id | Passed by |
|---|---|
| DN1 | e2e `snap` "DN1: a drag that points at no area leaves the map's centre where it was" |
| DN2 | `snap.test.ts` (three DN2 cases); e2e `snap` "DN2: a swipe centres the area it selects and keeps the zoom", "a drag up goes south", "a drag left goes east", "a drag under 24 px is not a swipe" |
| DN3 | `snap.test.ts` "DN3: ..."; e2e `snap` "DN3: with nothing selected, a swipe starts from the map's middle" |
| DN4 | `snap.test.ts` "DN4: nothing that way returns null"; e2e `snap` "DN4: with nothing that way, the selection stays" |
| DN5 | `snap.test.ts` "DN5: ..."; e2e `snap` "DN5: the opposite swipe returns where it came from" |
| DN6 | e2e `snap` "DN6: a swipe selects, the card stays closed, the tile is marked and in view", "DN6: the tile was out of view before the swipe, so the grid scrolled to it" |
| DN7 | `snap.test.ts` "DN7, DN8: ..." |
| DN8 | `snap.test.ts` "DN7, DN8: ..."; e2e `snap` "DN8: on a town's page a swipe west opens the next town's page", "DN8: the opposite swipe brings the first town back" |
| DN9 | e2e `snap` "DN9: a tap on the map clears the selection", "DN9: closing the long press's choices keeps the selection" |
| DN10 | e2e `snap` "DN10: the mouse wheel still zooms", "DN10: the long press still offers What's good here"; the compass by `qol` |
| DN11 | `snap.test.ts` "DN11: ..."; e2e `snap` "DN11: ArrowRight on the focused map selects the area to the east", "DN11: + on the focused map still zooms in" |
| DN12 | e2e `snap` "DN12: a swipe announces the area's name" (the web's hidden live region) |
| DN13 | e2e `snap` "DN13: Navigate's map still pans by a drag" |

- **Test-first, honestly:** `snap.test.ts` was seen failing (no module) before `atlas/snap.ts`; the `snap` journey was seen failing at DN3 before the screen code. The first run after the code found a real bug: the browser's `click` at the end of every drag cleared the selection (DN9), since maplibre suppresses it only when its own drag-pan is on. A drag over 8 px is now never a tap.
- **Changed from the plan:** DN6's tile is checked by its accent border, not `aria-selected` (react-native-web drops it on a button). Area points aren't tappable on the map (they never were), so DN6 says a tap on a tile opens the card. The swipe centres the area where a tap's frame does, below the title card, not at the canvas's middle.
- **Native, never run on a device:** `docs/NATIVE_UNVERIFIED.md` "Discrete navigation".

## Audit (Nov 4, at the owner's request)

12 findings: 11 fixed (one in part), 1 deferred, and finding 10's guard windows rejected. Each fix is behind a test named `discrete-navigation audit N`, seen failing first. The exceptions: audit 3's native wiring and audit 9 are reviewed, not run.

1. On a wide screen a swipe left the side card on the area it left; on a town's page it blocked Escape after a swipe to the next town: accept. A swipe closes any open card (it only selects). E2e `snap` "discrete-navigation audit 1" (two checks, 1200 px wide).
2. A tap-drag zoom and a shift box zoom also stepped: accept. `zoomStart` (`snap.ts`) refuses both. Unit "discrete-navigation audit 2"; the web wiring (`tappedAt`, `shiftKey`) is covered by code review, since a second touch can't be made headless.
3. Native: a long press slid after it fired, or a pinch begun with one finger, stepped: accept. `releaseSwipe` with the most fingers seen and the last long press (`createSwiper`). Unit "discrete-navigation audit 3"; native unverified.
4. The tile was revealed from stale row positions (web's `onLayout` misses a move): accept. The row and the grid are measured when asked (`measureInWindow`). E2e "discrete-navigation audit 4" (a What's good here banner above the grid).
5. With nothing selected, a swipe started from the canvas's middle, 30 px above where areas are framed: accept. The swipe starts from the map's padded centre (`getCenter()`). E2e "discrete-navigation audit 5".
6. A tap on the selected area's own dot cleared it: accept. `tapClears` keeps the selection within the tap's reach of any point. Unit and e2e "discrete-navigation audit 6".
7. The same area twice in a row was not announced again: accept. The live region's text changes with each announcement. E2e "discrete-navigation audit 7".
8. On a town's page the revealed tile ended under the back pill: accept. `revealTo` keeps clear of it. Unit "discrete-navigation audit 8".
9. The step trail outlived a turn away from the tab, against the plan: accept. Blur clears it. Code review only: no layout in the e2e world makes the trail and the nearest area differ without moving the other checks.
10. Guard windows and a lost mouseup: in part. A drag whose mouseup is lost (the window loses focus, or the button comes up outside it) is dropped, and is never a tap either. E2e "discrete-navigation audit 10". The 500 ms after a drag and 1 s after a long press are rejected: they are what keeps a drag's click and a long press from being a tap or a swipe (DN9, DN10).
11. The arrow keys could not be found (the canvas said "Map"): accept. The canvas's label says the arrow keys move between areas. E2e "discrete-navigation audit 11".
12. A swipe toward nothing is silent for a screen reader: defer, with the visual bounce (`docs/DEFERRED.md`).

Test review: the DN5 unit line that could not fail now places a nearer area; DN6's "out of view before" and DN3's expected area no longer pass vacuously. Still not covered: a touch-screen swipe, the turned map on screen, pinch and double tap on screen.

## After the deploy (Nov 4, the owner's iPhone)

- **discrete-navigation fix 1, 2:** from Allentown's page, a swipe to Catasauqua tinted it but never moved the map. Cause: a neighborhood swipe before had eased with `padding`, which maplibre keeps on the map and adds to every later fit; on the 200 px map the two left no room, so the town's fit found no camera and did nothing. `showPoint` eases with an offset now, the swipe's start and the `+`/`-` keys read the frame's padding. The e2e `snap` reproduces the owner's order (a neighborhood swipe, the title, a swipe to a 600 m town beside a 4 km one), by touch; it failed before the fix ("discrete-navigation fix 2 (touch), after a neighborhood swipe": the view stayed at Allentown's width). Fix 1's checks (the same without the neighborhood swipe, mouse and touch) pass before and after. Chronicle's star taps used the same `showPoint` and are fixed with it.

## Amended (Nov 4): swipes land where they would have panned

From Fountain Hill's page no swipe ever reached Bethlehem: within any 45° wedge that held it, a nearer town came first. DN2 is now "where the pan lands, the nearest area on that side, never the selected one", with a flick's coast (`landing`, `coastPx`: maplibre's own inertia constants); DN5's trail is retired. Tests: `snap.test.ts` "DN2: a swipe lands where it would have panned the map, turned with it", "DN2: a flick coasts further ...", "DN2: the nearest area to where the swipe lands wins, past a nearer one beside the way (Fountain Hill to Bethlehem)", "DN2: a short swipe always moves ...", "DN3: ...", "DN4: with no area on the side swiped toward ..."; e2e `snap` computes every expected area with the same projection, and "DN2: a flick coasts past the area a slow swipe would reach". The DN5 unit test and `discrete-navigation audit 9` (the trail after a blur) retire with the trail.

## Amended (Nov 10, decision 0124): a swipe steps the row of cards

Explore is now a full-height map with one row of area cards under it (`specs/explore-carousel/spec.md`, EC1-EC20), and a swipe on the map steps that row: left for the next card, right for the previous, by what is on screen. The areas are no longer chosen by where a pan would have landed.

- **Retired** with the grid and the directional landing: DN3, DN4, DN6 (its tile in a grid), DN7, DN8 and DN9 (a tap on the map no longer clears the selection: something is always selected), with DN5 retired Nov 4.
- **Amended:** DN2 now says only that a drag under 24 px, a long press, two fingers or a pinch is never a swipe; DN11's arrows are ArrowRight next and ArrowLeft previous, ArrowUp and ArrowDown nothing (EC9).
- **Kept:** DN1 (one finger never pans Explore's map), DN10, DN12 and DN13.
- The pure directional code (`nextArea`, `landing`, `swipeHeading`, `coastPx`, `snapScope`, `revealTo`, `tapClears`) and its tests are deleted; the `snap` journey keeps DN1, DN10, DN12, DN13 and the input audits, and the `carousel` journey holds the row.
