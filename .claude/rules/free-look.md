---
paths:
  - "src/lib/atlas/freeLook.ts"
  - "src/components/atlas/FreeLookControls.tsx"
  - "src/lib/__tests__/explore/freeLook.test.ts"
  - "scripts/e2e/journeys/freelook.js"
  - "specs/free-look/**"
---
# Free look

Explore's Move map and Show areas here (FL1-FL21, decision 0150, `atlas/freeLook.ts` core, `components/atlas/FreeLookControls.tsx`): Move map (`atlas-move-map`, off on every visit, reset on blur) sets `WalkMap`'s `freePan`, which stands the swipe handlers down and turns maplibre's `dragPan` and keyboard on at runtime (web; native `dragPan` and no swiper). Show areas here (`atlas-show-here`) sets `looked = {at, you}`; the screen keeps `you` (the fix: the walker, the card's you, the planner, walkability, Walk to's choice) apart from `from = looked?.at ?? you` (what the page lists, frames and draws layers around). A looked list is `lookedList` (plain order from the point, `here` false, distance from a fresh fix or `unplaced`, no distance said). A look's near reads carry `look: true`: `listedAround` and `needsNear` for near-you never take them, and `withNear` keeps them apart (`LOOK_KEPT`) so they do not push out the reads around you. Each look is a frame page (`lookPage`). The words are `lookWords()`: never a number, a rank or where the reader is. A late launch fix only sets `you` (`lookedRef`, `freeRef`). A far Walk here asks (`spot.ask`). Trap: stepping the row eases the map, so a swipe's check is the selection, not an unmoved centre.
