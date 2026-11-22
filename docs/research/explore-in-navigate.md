# Explore in Navigate: investigation (2026-11-22)

From: the owner's /investigate, 2026-11-22: "The navigate and explore pages should be merged into one, with the
explore being a full-width dialog that can be triggered from the navigate view." Asked what they meant: "if you want
to explore the area that you're in, you have to minimize the walk and then open up the Explore tab. Whereas it seems
more intuitive and immersive if the Explore functionality is accessible while you are in the Navigate. Whether that be
to suggest a tour, or suggest a walk, or just scope out points of interest in your area." Queued as G15 (the first of
three slices). Status: queued.

## What the owner saw

No picture came with the ask; the two screens were pictured on the web build at 390 x 844 (journeys `where` and
`carousel`), kept in `docs/mockups/explore-in-navigate/` as `today-navigate-ready-390.png` and `today-explore-390.png`.

| Mark | What it is | Drawn by |
|---|---|---|
| Chevron, top left of Navigate | Back to the tab beneath (`exitPlan`) | `components/walk/useReady.tsx` (ready), `src/app/walk.tsx` (walking) |
| Column at the right edge | Locate or Recenter, then note, mic, camera (`CaptureStack`) | `components/walk/CaptureStack.tsx`, `components/walk/layout.ts` |
| Strip at the foot | 0:00 · 0 m and Start; walking, time, distance, … and Pause | `ReadyBar` in `walk.tsx` and `useReady.tsx` |
| No way to Explore | Navigate has none; the walk must be minimized (chevron) and the Explore tab pressed | `(tabs)/_layout.tsx` (`TABS` in `lib/startPlan.ts`) |
| Explore's own map | A second `WalkMap`, mounted only while the tab is focused (NV4) | `src/app/(tabs)/explore.tsx:755-756`, `lib/useTabMap.ts` |
| "Near you", search, "Plan an outing" | Title card, `SearchButton`, the outing entry | `explore.tsx:838-858`, `components/atlas/PlaceSearch.tsx` |
| Row of area cards above the tabs | `AtlasCarousel` of `AtlasTile`s, the selected one outlined | `explore.tsx:973-981`, `components/atlas/` |
| The area's card (full screen, tabs folded) | `AtlasCard`, `hideTabs()` | `explore.tsx:1020`, `AtlasCard.tsx:185` |

## Why it reads wrong

1. **Two maps of one place, a screen apart.** Explore (0124) and Navigate (0076) are each a full-screen map of the
   same ground; the walk screen is a root stack route over the tabs (`_layout.tsx:101`, `showWalk()`), so Explore is
   reached only by leaving it: minimize, then the tab. Chosen on purpose: 0112 kept "Explore stays as it is" and the
   three tabs; 0076 made Navigate the walk screen with no tab bar. The owner's call to revisit, not a bug.
2. **The hand-off jumps screens.** Walk to on Explore's card saves the destination and opens the walk screen
   (`useStartWalk.later` and `start`, `lib/useStartWalk.ts:49-80`); the place you were looking at is gone from view
   once you are where you go.
3. **The planners live only on Explore.** Plan an outing (`OutingPage`, `explore.tsx:1081`) and the walk planner
   (`PlannerDrawer`, `:1104`) are hosted only there, so "suggest a walk" from the walk is two screens away.
4. **Each map has its own gestures.** One finger never pans Explore's map (a swipe steps the row, 0124); it pans the
   walk's. Merging means choosing one (answered below).

Never seen on a phone: the walk screen's pull-up bar over MapLibre RN, the tab press interception (0076), Explore's
map on native.

## How adjacent apps do it

Recorded in `docs/research/adjacent-apps.md`, "Browse what is near from the map you walk on".

- **Apple Maps:** nearby places in the search card over the one map; swipe up for all, drag the map, Search Here.
  https://support.apple.com/en-asia/guide/iphone/iphbaf51b2c0/15.0/ios. **Verified** (read partly as a summary).
- **Google Maps:** Explore's content is a sheet over the same map that lowers but never hides; Explore stays a tab.
  9to5google (Jan 2025, Jul 2024), from a search summary. **Unverified**.
- **AllTrails:** Explore and Navigate are separate tabs; a trail is followed from Explore by Start. support.alltrails.com,
  from a search summary. **Unverified**. The split this leaves.

## Options

Causes by number from "Why it reads wrong".

| Shape | Answers | Vision risk | Cost |
|---|---|---|---|
| A. Leave it | none | none | nothing; Explore stays a minimize and a tab away from every walk, Walk to keeps jumping screens |
| B. A full-screen dialog from Navigate holding today's Explore whole, its own map, the walk map taken down | 1 (in part), 3 | low | M: Explore lifted into a host component; the walk map remounts under it (NR6 kept by care); one map at a time; you still leave the walk's map to browse |
| C. A sheet over the walk's own map: the row of cards, the area's card, towns, search, planners; the walk map draws the selected area | 1, 2, 3, 4 | captures under a sheet (Always: one tap away); a tour read as a list of sights | L: Explore's ~600 lines of inline state lifted into a hook, the walk map takes Explore's area drawing, a sheet with two heights, ~33 journeys move; native sheet code |
| D. An Explore button on Navigate that opens the tab as it is | 1 (in part) | none | S: one control; two maps and the tab kept, and the walk is still minimized |

## The owner's calls

1. **Two philosophies** (asked in chat): the owner asked which way the precedents lean; one map with a sheet
   (Apple, Google) or two tabs (AllTrails). The recommendation was the one-map sheet, with the caution that a
   full-screen dialog alone (B) is the weakest gain. The owner's job, quoted above, settled it.
2. **The Explore tab** once Explore is a sheet in Navigate: Remove it (Recommended) / Keep it as well / Tab opens
   Navigate with the sheet up. Answer: "Remove it (Recommended)".
3. **Mid-walk, how much of Explore:** All of it (Recommended) / Nearby only mid-walk. Answer: "All of it (Recommended)".
4. **Resume on this direction:** Yes, resume (Recommended) / Not yet. Answer: "Yes, resume (Recommended)".
5. **The mock-up** (https://claude.ai/artifact/BYDBWTYdQdvDimi8LLQ8gv, `docs/mockups/explore-in-navigate/`): Approve as
   drawn (Recommended) / Control in the right column / Card stops below captures / Redraw. Answer: "Approve as drawn
   (Recommended)".
6. **One finger on the map with the sheet up:** Map pans; row steps itself (Recommended) / Swipe steps the row while
   up. Answer: "Map pans; row steps itself (Recommended)". Amends 0124.
7. **Where the record goes:** Straight to main (Recommended) / Session branch only. Answer: "Straight to main
   (Recommended)".

Written: decision 0258 (amends 0112, 0124, 0076).

## The recommendation

**C, staged as an L**, the owner's answers applied.

```
## Vision
Idea: "if you want to explore the area that you're in, you have to minimize the walk and then open up the Explore
tab … more intuitive and immersive if the Explore functionality is accessible while you are in the Navigate.
Whether that be to suggest a tour, or suggest a walk, or just scope out points of interest in your area." Reshaped
with the owner: the Explore tab removed, Explore a full-width sheet raised from the walk screen, ready or walking,
over the walk's own map.
Verb: earn (VISION: Earn is "Explore, Navigate", help the walker notice; the merge puts noticing where the walk is).
Touches: Always, "Capture is one tap away on every screen you walk or capture from"; Never, "A capture behind a menu,
a drawer or an extra tap"; Never, tallies, "No counts on Explore (NV14)"; Never, "A card or screen that lists what is
left to find" (0230) and "Who it is for": "not tourists working through a list"; Never, nagging; Always, "A route is
a suggestion", Shapes "Suggested routes" (0095, 0121); Always, "Restraint". Decisions amended: 0112, 0124, 0076's way
back; kept: 0076's one screen, NV4, NV10.
Verdict: aligned if reshaped
Shape: as asked, with: the sheet opens only on a tap; the captures stay one tap away at every height; "suggest a tour"
is the walk planner and Plan an outing, one way through areas by kinds of places, never a list of named sights or a
count of what is left; Explore's rules carried into the sheet.
Precedent: Apple Maps' card over its one map (verified); Google Maps' Explore sheet over the same map (unverified);
AllTrails' two tabs, the split this leaves (unverified).
Criteria: the sheet opens only from its control; mid-walk with the sheet at any height, camera, mic and note are one
tap and uncovered; no count; no list of places to find; a suggested walk is one way, its detour in words; Walk to
sets the destination in place or routes the open walk; one live map.
Open: none from the gate (the look went to the mock-up, approved).
```

**Size: L**, never queued whole. Its slices:

1. **G15 [M], queued:** the pill and the sheet on the walk screen, ready and walking: the row of area cards and an
   area's card, over the walk map, which draws the selected area; the captures riding; Walk to in place. The Explore
   tab is unchanged in this slice. About ten source files (below); native sheet code, unverified.
2. **Slice 2 [M]:** town pages and the Towns pill, search, Plan an outing and the walk planner from the sheet (each
   planner's own full-screen map with the walk's stepping aside, as Explore does today); the long press's What's
   here on the walk map with the sheet up.
3. **Slice 3 [M]:** the Explore tab removed: `TABS` to two, `/explore` to the walk screen with the sheet raised,
   `exitPlan`'s fallback to Chronicle, the e2e journeys moved off `tab-explore` and `exploreUrl`, `launch`'s check of
   the tabs, `docs/expectations/tabs.md`, the area rules and PRODUCT.

## Done when

On a walk in progress, at 390 px, the owner can see the areas around them, open one and set it as where the walk
goes, without minimizing the walk or leaving the walk screen; the walk's trace, the walker and the capture stack stay
in view the whole time. (After slice 3: the tab bar reads Chronicle · Navigate and nothing Explore did is lost.)

## What the slice will touch

- **Files (G15):** `src/app/(tabs)/explore.tsx` (its inline state lifted into a hook, e.g. `lib/atlas/useExplore.ts`,
  a view-layer hook over the existing shells), a new `components/walk/ExploreSheet.tsx` (the sheet, its two heights,
  the pull), `src/app/walk.tsx` and `components/walk/useReady.tsx` (the pill, the host, the map's area props),
  `components/walk/layout.ts` and `lib/stackSlots.ts` (the stack and Layers riding above the sheet's edge),
  `components/atlas/AtlasCarousel.tsx`, `components/atlas/AtlasCard.tsx` (no `hideTabs` inside the sheet), a core
  module for the sheet's state (height, selection, what Back closes) with its test first.
- **Layers:** core for the sheet's decisions; the hook is view; no new shell (the atlas read, look and storefront
  shells are reused); `ports`, the `db` and the recorder stay out of the views.
- **Journeys:** a new one for the sheet (ready and walking, 390 and 320 shots); `ready`, `walk`, `carousel` and
  `launch` as the smoke; `carousel` and `snap` keep the tab's behaviour in this slice.
- **Native paths:** the sheet's pull and snap over MapLibre RN, the riding stack against the home indicator, the
  walk map drawing area points (`AreaPoint` markers on native).
- **Checks first:** `npm run check:affected`; the one-live-map counts (`launch.js:169-186` and the canvas counts in
  22 journeys).

## Open for the owner

None. The look is approved; the gesture and the tab are answered.

## Engineering unknowns

- Lifting about 600 lines of hooks out of `explore.tsx` without changing Explore's behaviour (the tab stays until
  slice 3): `useFocusEffect` cleanups (`explore.tsx:219-235`) need an owner tied to the sheet's lowering.
- `useAtlas` runs only while the tab is focused; it must also run while the sheet is up, and never twice.
- The walk map taking Explore's area drawing (`areaPoints`, the ring, a town's lit border, `storefrontNamesOn`)
  without a second map and without remounting it (NR6), and the camera: ease to the area while up, follow again on
  lowering (walking), return to where it was (ready).
- 0124's map swipe (`onSwipe`, `snap.ts`) is not used inside the sheet (0258); the tab keeps it until slice 3.
- Never run on a phone: all of the above on native.
