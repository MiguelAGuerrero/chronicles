# Free look: the plan

For the owner to review before any code. The criteria are in `spec.md` (FL1-FL21); the audit of this plan (Nov 11) and the owner's calls are folded in.

## What exists

- `explore.tsx` keeps `from` (where the atlas lists: your fix, else where it last listed) and `stale` (no fix since launch: "You're here" is never said). `useAtlas(focused, from, townSeen)` lists and reads around `from`; it has no idea of "you".
- The map takes `onSwipe` and, with it, never pans: web builds `dragPan: !props.onSwipe`, `keyboard: !props.onSwipe` once, in the constructor, and registers the swipe listeners only `if (props.onSwipe)` (`WalkMap.web.tsx` 296, 428); native's `dragPan={!props.onSwipe}` is a prop, and its swipe handlers are spread only with `onSwipe` (`WalkMap.native.tsx` 313, 344).
- The long press already offers **What's good here?** (`testID="look-here"`, `lookHere(at)`) and Walk here at any point; the map just can't be moved to a far point to press it.
- Locate (`useLocate.onFix`) already is "a way back to you": it sets `from`, clears `stale`, leaves a town's page, drops the pick and frames you.
- `distanceWords(m, here, fmt)` says "N min walk" or "X away" from `from`; `here` says "You're here".

## Design

1. **Pure, `src/lib/atlas/freeLook.ts` (`@layer core`).**
   - `lookedList(list, you)`: a list as the page lists it around the looked-at point: in plain distance order from the point (the outline-first move of `nearList` undone, audit 7), `here` false, and each `distanceM` measured from `you`, or removed when `you` is not a fresh fix (audit 4, 13; FL12).
   - `lookWords()`: the title "Around the middle of the map", the subtitle, the empty state's line (FL20) and the announcement (FL7, FL13). It says nothing about where the reader is.
   - `youFresh(fix, now)`: whether a fix may stand for `you` (FL12), with the clock as an argument.
   - `centreOf(cam)`: the point Show areas here takes, the map's settled centre.
   - `moveMapLabel(on)`: the toggle's accessibility label and hint (FL2).
2. **The screen (`explore.tsx`).** Two new pieces of state, nothing stored:
   - `you`: today's `from` for everything that means *you*. `at`: where the atlas lists, `looked ?? you`. `useAtlas(focused, at, townSeen)`. The callers, one by one (audit 3):

     | Caller (`explore.tsx`) | Takes |
     |---|---|
     | `useAtlas`, `nearList` input, the `outlines` and `bordersFor` reads, `layerCentre`, `pointsOf`, `initialCenter` on a first open | `at` |
     | `walker`, the area card's `you`, `PlannerDrawer`'s start and `fixNow`, `busyAreas`' walkability from a point, `askFirst`, `walkToChoice`, a tapped star's distance, Walk here's ask | `you` |
     | the empty state `!from`, `hintShown` | `at` (a look is a place to list) |
     | the launch-fix effect | sets `you` only; when `free` or `looked` it never frames or moves the look (audit 6, FL17) |
   - `looked: LngLat | null`; `free: boolean`.
   - Show areas here: `setLooked(centre)` where `centre` is the map's settled middle from `onCameraChange` after the coast (audit 8), leave a town's page, drop the pick, close the card and the spot, announce (FL6). Each look gets its own page key (`{page:'look', at, build}`) so `nextFrame` frames the first area, around the looked point only, also on a second look (audit 2). Locate's `onFix` also clears `looked` (FL8).
   - **A look is never where the reader was** (audit 1, FL15): `readNear` records a read of a look with a `look` flag (a field in the meta JSON, no new key, no schema); the launch fallback and `needsNear` for the page near you ignore flagged reads, and `withNear` keeps the newest 12 of each of the two kinds apart, so looks never push out the reads around you.
   - While `looked`: `neighborhoods`, `allTowns` and the `ownTown` fallback go through `lookedList(…, you)`; `home` is the town a fresh fix is inside, else null; the title and subtitle come from `lookWords`; a town's page keeps its own name and its subtitle never says where the reader is.
   - The layers read around `at` (FL18). The out-of-town stars (0115) are not built yet: FL19 is deferred and recorded in 0147 for that slice.
   - `onSwipe={free ? undefined : onSwipe}` and the arrow keys follow it (FL1, FL3, FL4). A blur effect sets `free` false (FL14).
   - Controls: `FreeLookControls` (below). `exploreSlots` gains `free` so the scale bar and the overlay clear the Show areas pill.
3. **`components/atlas/FreeLookControls.tsx` (a view).** The Move map toggle button in the right column, above the compass; "Show areas here" as a pill low on the map, above the row, beside the Towns back pill's corner; the centre mark (a small crosshair, pointer-events none), drawn only while `free` (FL5). Icons from the existing set; state drawn by fill and label, not colour alone (FL2).
4. **`WalkMap.web.tsx`.** An effect on `!!props.onSwipe` calls `map.dragPan.enable()/disable()` and `map.keyboard.enable()/disable()`; `touch-action` stays `none` in both states (maplibre drives the pan itself); the canvas's `aria-label` is set from the same effect and again on every `load`, so a rebuilt canvas keeps it. The swipe listeners are registered always; mousedown and touchstart already return when `onSwipe.current` is empty, and the canvas `keydown` listener gets the same guard, so with Move map on `+` and `-` zoom once and an arrow pans by maplibre alone (audit 5). `native`: `dragPan` already follows the prop; check `swiper.handlers` is dropped in the same render (FL3).
5. **`overlaySlots.ts`.** `exploreSlots({spot, town, free})` gives the Show pill, the Towns pill, the scale bar and the overlay each their place for every combination (the long press's bar spans the width and wins), and the toggle sits above the compass in the right column with the compass fixed at its own place (audit 9, FL21).
6. **Reads.** `useAtlas` is unchanged apart from taking `at`: the near read, the ring reads, outlines and the archive run around it as around you, so FL9 holds by construction; the journey records the hosts the page asks, and they are the near-you ones (a constant that cannot change pins nothing).

## Tests per criterion (written first, as todos)

| Id | Test |
|---|---|
| FL1 | e2e `freelook` "FL1: with Move map off a drag never pans and a swipe steps the row"; the existing `carousel` EC8-EC10 and `snap` DN1, DN10 stay green |
| FL2 | `freeLook.test.ts` "FL2: the toggle's label and hint say what it does and its state"; e2e `freelook` "FL2: the toggle is a button, 44 px, aria-pressed" |
| FL3 | e2e `freelook` "FL3: with Move map on a drag pans the map and does not step the row", "FL3: the arrow keys pan"; native by `docs/NATIVE_UNVERIFIED.md` (device) |
| FL4 | e2e `freelook` "FL4: off again, the selection stays, the map stays, a swipe steps" |
| FL5 | e2e `freelook` "FL5: Show areas here and the centre mark are there only while Move map is on" |
| FL6 | `freeLook.test.ts` "FL6: centreOf is the map's settled centre"; e2e `freelook` "FL6: Show areas here lists the areas around the map's middle, nearest it first, the first selected", "FL6: it closes a town's page, a card and the spot" |
| FL7 | `freeLook.test.ts` "FL7: a looked list says here nowhere", "FL7: the words say the page is not around you"; e2e `freelook` "FL7: no 'You're here' anywhere on the page while looking" |
| FL8 | e2e `freelook` "FL8: Locate ends the look and says You're here again" |
| FL9 | e2e `freelook` "FL9: a look asks only the hosts the page near you asks" (the harness's request log) |
| FL10 | e2e `freelook` "FL10: a long press on a panned spot offers What's good here and Walk here", "FL10: a pan never starts a long press" |
| FL11 | `freeLook.test.ts` "FL11: no digit and no rank word in any string the slice adds" (`lookWords`, `moveMapLabel`, the pill, the map's label, the announcement) |
| FL12 | `freeLook.test.ts` "FL12: a looked list measures from a fresh fix", "FL12: with no fresh fix a looked card has no distance"; e2e `freelook` "FL12: a far Walk here asks first" |
| FL13 | `freeLook.test.ts` "FL13: the announcement is said once"; e2e `freelook` "FL13: the map's label says the arrow keys pan it, and a look is announced" |
| FL14 | e2e `freelook` "FL14: leaving Explore turns Move map off, the look stands" |
| FL15 | `freeLook.test.ts` "FL15: a read of a look never stands for the page near you", "FL15: looks do not push out the reads around you" |
| FL16 | e2e `freelook` "FL16: the walker's dot and the card's you stay on your fix while looking" |
| FL17 | e2e `freelook` "FL17: a late launch fix never moves the map or the look" (a delayed geolocation) |
| FL18 | e2e `freelook` "FL18: after a look the Busy and Walkability layers and the borders are around the looked point"; `freeLook.test.ts` "FL18: layerCentre is the look" |
| FL19 | deferred (`UNTESTED` in `scripts/features.js`): the stars of 0115 are not built; 0147 records the call for that slice |
| FL20 | `freeLook.test.ts` "FL20: a look with no area has its line"; e2e `freelook` "FL20: open water says so and keeps Locate and Move map" |
| FL21 | `freeLook.test.ts` "FL21: exploreSlots never overlaps for every spot, town and free combination"; e2e `freelook` shots at 390 and 320 px |

The audit's regression tests (`free-look audit 1`-`16`, the record in `spec.md`) are the same tests under their audit names where a criterion carries them: each is written first, as a todo, and fails before its code.

A new journey, `scripts/e2e/journeys/freelook.js` (listed under `explore` in `scripts/features.js`), runs on `snapWorld`: it pans from Providence to Cranston. The unit file is `src/lib/__tests__/explore/freeLook.test.ts` (the `explore` feature's folder, beside `carousel.test.ts`).

## The goal-to-control lines

| Goal | When | Control | Matrix row |
|---|---|---|---|
| Move the map to another place | now and then, from Explore | a toggle button in the right column (Move map) | 14, outside a list: a button that behaves like a toggle; precedent: Layers and Compass in the same column |
| Load what is around where I'm looking | after a pan | a pill, "Show areas here", low on the map | a primary action on the current view: a button; precedent: the Towns back pill's place |
| Come back to me | any time | Locate, as it is | unchanged |

## Files (about 15)

New: `src/lib/atlas/freeLook.ts`, `src/components/atlas/FreeLookControls.tsx`, `src/lib/__tests__/explore/freeLook.test.ts`, `scripts/e2e/journeys/freelook.js`, `docs/decisions/0147-free-look.md`. Changed: `src/app/(tabs)/explore.tsx`, `src/components/map/WalkMap.web.tsx` (and a check of `WalkMap.native.tsx`), `src/lib/atlas/overlaySlots.ts`, `scripts/features.js`. Docs: `.claude/rules/explore-and-discovery.md`, `.claude/rules/map.md` if it holds the swipe note, `docs/PRODUCT.md`, `docs/STATUS.md`, `docs/NATIVE_UNVERIFIED.md`, `docs/DEFERRED.md` (the layers line, FL18), `docs/decisions/0115-*` (a line pointing at 0147, FL19), `src/lib/atlas/read.ts` (the `look` flag, `withNear`) and `atlas.ts` (`needsNear`, `nextFrame`'s look key), `specs/explore-carousel/spec.md` (EC10's amendment line), VISION.md's Precedents row for 0147.

## Data

None: no migration, no schema, no new meta key. A near read's JSON gains an optional `look` flag (FL15). The look and the toggle are screen state. Not a derivation rule: no `SNAP_RULES`, `STREET_CODE`, `LANDING_CODE` or `ATLAS_CODE` bump.

## Native

Never run on a device: the pan with `dragPan` turned on at runtime, and the swipe handlers dropped in the same render. Each gets an item in `docs/NATIVE_UNVERIFIED.md` (FL3, FL10 on a phone).

## Deferred

- Search by name (a geocoder, a new host: not without a decision).
- A look that survives a relaunch, or a history of looks.
- Busy and Walkability layers beyond what they do around the page's centre.

## The audit of this plan (Nov 11)

The auditor and the steward ran over the spec and plan (16 findings, 15 accepted, 1 rejected; the record is in `spec.md`). The plan above carries them: the caller table and the `look` flag (1, 3), the look's own frame key (2), the keydown guard (5), the launch fix (6), distance order (7), the settled centre (8), the slots (9), the words (11), distances without a fresh fix (4, 13), the layers (14), the stars (15) and the scan (16). The one rejected finding (12) is the owner's call that distance is not a ranking.

## The owner's calls

- **Page copy** (Nov 11): "Around the middle of the map", nothing about where the reader is.
- **Distances** (Nov 11): shown, from a fresh fix; distance is not a ranking.
- **Layers** (Nov 11): follow the look.
- **Stars** (Nov 11): within 50 km of the look; a tapped star's distance from you.

## Defaults I am taking unless you say otherwise

1. **The button's name** is "Show areas here" (the long press's "What's good here?" keeps `look-here`).
2. **Move map resets when you leave Explore**; the look stands (FL14).
3. **A centre mark** is drawn while Move map is on, at the map's own middle (FL5).
