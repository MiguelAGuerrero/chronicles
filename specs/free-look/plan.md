# Free look: the plan

For the owner to review before any code. The criteria are in `spec.md` (FL1-FL14).

## What exists

- `explore.tsx` keeps `from` (where the atlas lists: your fix, else where it last listed) and `stale` (no fix since launch: "You're here" is never said). `useAtlas(focused, from, townSeen)` lists and reads around `from`; it has no idea of "you".
- The map takes `onSwipe` and, with it, never pans: web builds `dragPan: !props.onSwipe`, `keyboard: !props.onSwipe` once, in the constructor, and registers the swipe listeners only `if (props.onSwipe)` (`WalkMap.web.tsx` 296, 428); native's `dragPan={!props.onSwipe}` is a prop, and its swipe handlers are spread only with `onSwipe` (`WalkMap.native.tsx` 313, 344).
- The long press already offers **What's good here?** (`testID="look-here"`, `lookHere(at)`) and Walk here at any point; the map just can't be moved to a far point to press it.
- Locate (`useLocate.onFix`) already is "a way back to you": it sets `from`, clears `stale`, leaves a town's page, drops the pick and frames you.
- `distanceWords(m, here, fmt)` says "N min walk" or "X away" from `from`; `here` says "You're here".

## Design

1. **Pure, `src/lib/atlas/freeLook.ts` (`@layer core`).**
   - `lookedList(list, you)`: a list as the page lists it around the looked-at point, with `here` false and each `distanceM` measured from `you` (null `you`: left as is, as `stale` leaves it today) (FL7, FL12 input).
   - `lookWords(looking)`: the title and subtitle while looking, and the announcement (FL7, FL13).
   - `centreOf(cam)`: the point Show areas here takes, the map's settled centre.
   - `moveMapLabel(on)`: the toggle's accessibility label and hint (FL2).
2. **The screen (`explore.tsx`).** Two new pieces of state, nothing stored:
   - `you`: today's `from` for everything that means *you* (`askFirst`'s distance, `stale`'s `fixSeen`, Locate). `at`: where the atlas lists, `looked ?? you`. `useAtlas(focused, at, townSeen)`.
   - `looked: LngLat | null`; `free: boolean`.
   - Show areas here: `setLooked(centre)`, leave a town's page, drop the pick, close the card and the spot, frame the first area as arrival does, announce (FL6). Locate's `onFix` also clears `looked` (FL8). A reload starts near you (nothing stored).
   - While `looked`: `neighborhoods` and `allTowns` go through `lookedList(…, you)`; `home` is null; the title and subtitle come from `lookWords`; the town's page subtitle never says "You're here".
   - `onSwipe={free ? undefined : onSwipe}` and the arrow keys follow it (FL1, FL3, FL4). A blur effect sets `free` false (FL14).
   - Controls: `FreeLookControls` (below). `exploreSlots` gains `free` so the scale bar and the overlay clear the Show areas pill.
3. **`components/atlas/FreeLookControls.tsx` (a view).** The Move map toggle button in the right column, above the compass; "Show areas here" as a pill low on the map, above the row, beside the Towns back pill's corner; the centre mark (a small crosshair, pointer-events none), drawn only while `free` (FL5). Icons from the existing set; state drawn by fill and label, not colour alone (FL2).
4. **`WalkMap.web.tsx`.** An effect on `!!props.onSwipe` calls `map.dragPan.enable()/disable()` and `map.keyboard.enable()/disable()`, sets the canvas's `touch-action` and `aria-label` ("Map. The arrow keys pan it." or "…move between areas."), so a toggle after the constructor works. The swipe listeners are registered always; they already return when `onSwipe.current` is empty. `native`: `dragPan` already follows the prop; check `swiper.handlers` is dropped in the same render (FL3).
5. **Reads.** `useAtlas` is unchanged apart from taking `at`: the near read, the ring reads, outlines and the archive run around it as around you, so FL9 holds by construction; `ALLOWED_HOSTS` is untouched and a test pins it.

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
| FL9 | `freeLook.test.ts` "FL9: ALLOWED_HOSTS is unchanged"; shell test with `fakePorts()` is not needed: `useAtlas` is a view hook, covered by the e2e journey's reads |
| FL10 | e2e `freelook` "FL10: a long press on a panned spot offers What's good here and Walk here", "FL10: a pan never starts a long press" |
| FL11 | `freeLook.test.ts` "FL11: no digit and no rank word in the copy" |
| FL12 | `freeLook.test.ts` "FL12: a looked list measures from you" (metres from `you`, with `walkToChoice` unchanged) |
| FL13 | `freeLook.test.ts` "FL13: the announcement is said once"; e2e `freelook` "FL13: the map's label says the arrow keys pan it, and a look is announced" |
| FL14 | e2e `freelook` "FL14: leaving Explore turns Move map off, the look stands" |

A new journey, `scripts/e2e/journeys/freelook.js` (listed under `explore` in `scripts/features.js`), runs on `snapWorld`: it pans from Providence to Cranston. The unit file is `src/lib/__tests__/explore/freeLook.test.ts` (the `explore` feature's folder, beside `carousel.test.ts`).

## The goal-to-control lines

| Goal | When | Control | Matrix row |
|---|---|---|---|
| Move the map to another place | now and then, from Explore | a toggle button in the right column (Move map) | 14, outside a list: a button that behaves like a toggle; precedent: Layers and Compass in the same column |
| Load what is around where I'm looking | after a pan | a pill, "Show areas here", low on the map | a primary action on the current view: a button; precedent: the Towns back pill's place |
| Come back to me | any time | Locate, as it is | unchanged |

## Files (about 12)

New: `src/lib/atlas/freeLook.ts`, `src/components/atlas/FreeLookControls.tsx`, `src/lib/__tests__/explore/freeLook.test.ts`, `scripts/e2e/journeys/freelook.js`, `docs/decisions/0147-free-look.md`. Changed: `src/app/(tabs)/explore.tsx`, `src/components/map/WalkMap.web.tsx` (and a check of `WalkMap.native.tsx`), `src/lib/atlas/overlaySlots.ts`, `scripts/features.js`. Docs: `.claude/rules/explore-and-discovery.md`, `.claude/rules/map.md` if it holds the swipe note, `docs/PRODUCT.md`, `docs/STATUS.md`, `docs/NATIVE_UNVERIFIED.md`, `specs/explore-carousel/spec.md` (EC10's amendment line), VISION.md's Precedents row for 0147.

## Data

None: no migration, no schema, no new meta key. The look and the toggle are screen state. Not a derivation rule: no `SNAP_RULES`, `STREET_CODE`, `LANDING_CODE` or `ATLAS_CODE` bump.

## Native

Never run on a device: the pan with `dragPan` turned on at runtime, and the swipe handlers dropped in the same render. Each gets an item in `docs/NATIVE_UNVERIFIED.md` (FL3, FL10 on a phone).

## Deferred

- Search by name (a geocoder, a new host: not without a decision).
- A look that survives a relaunch, or a history of looks.
- Busy and Walkability layers beyond what they do around the page's centre.

## The steward's pass (run inline against `docs/VISION.md`, report-only)

- **S1 [drift] a name that collides.** The long press's choice is already "What's good here?" with `testID="look-here"`. The new button must not be called "Look here" or reuse that id: it is "Show areas here" (`atlas-show-here`). Accepted into FL5's wording.
- **S2 [breach risk] "You're here" on a looked page.** `nearList` marks the town whose outline holds the *list point* as `here`, so a look would say it of a town the reader is not in. Accepted: FL7, and `lookedList` clears `here`.
- **S3 [breach risk] a distance that misleads.** Distances from the looked point would read as how far from the reader. Accepted: FL12 and `lookedList` measure from `you`; open call 2.
- **S4 [tone] nothing sells or counts.** The copy has no number, rank or "best" (FL11).
- **No finding** against Never lines on data leaving the device (FL9), captures (Explore has none; Locate, Walk here and the tabs stay on screen), or tallies.

## Open calls (my recommendation first)

1. **The copy while looking.** Title "On the map", subtitle "Not around you"; a town's page keeps its own name and says "Not around you" where it said "You're here" or a distance. Recommended; the alternative is "Around the map's middle".
2. **Distances while looking.** From you ("35 min walk" from where you are), while the row's order stays nearest the looked-at point. Recommended; the alternative is to drop the distance on a looked page, so nothing can mislead.
3. **The button's name.** "Show areas here", because "Look here" is too near the long press's "What's good here?". Recommended.
4. **Move map resets when you leave Explore** (the look stands). Recommended: snapping is the default and a forgotten pan mode is the likeliest surprise. The alternative is to keep it on until turned off.
5. **A centre mark** while Move map is on, so the reader sees what Show areas here will take. Recommended; without it the middle of the map is a guess.
