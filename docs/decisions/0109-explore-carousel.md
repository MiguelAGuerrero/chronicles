# 0109. Explore is a map with a row of area cards

Date: 2026-11-10 · Status: accepted · Area: explore, map

## Context
Explore's map was a short strip above a grid of tiles (0066, 0067), and a swipe on it stepped to the nearest area in that direction (0092). On Nov 10 the owner sent a screenshot of the strip: the Busy layer's magenta street names stacked on each other when zoomed out, and area names crowded it. The owner asked for the Atlas Obscura shape: most of the screen the map, a single row of cards at the bottom, whatever is selected highlighted on the map and nothing near it drawn with its text.

## Decision
The owner's calls, Nov 10:
- **A carousel for any selection.** Browsing is one horizontal row of area cards docked above the tabs; the map fills the rest of the screen. Neighborhoods first, nearest first (the one you are in leading), then the other towns in the same row; on a town's page, the town's own card, then its neighborhoods.
- **The map shows what is selected.** The selected area is highlighted (a neighborhood by its ring, a town by its border) and is the only area named. Other areas of its level are unnamed dots; areas of another level are not drawn. The Busy layer's lines draw at any zoom; its street names draw only inside the selected area's ring and only from zoom 13. Every area's busiest street stays named on its card.
- **A swipe on the map steps the row** (left next, right previous, by what is on screen), and the first area is selected on arrival, so something is always highlighted.
- **A tap on the selected card opens its card (a town's, its page); a tap on another card selects it.**
- **One layout at every width.** From 1000 px the area's card is a side panel over the map, as now.
- **The row's card has no mini-map picture** (so the map keeps over half a phone's screen); the area's own card keeps it.
- **One-finger panning stays off on Explore's map.** To look beside the selected area you pinch out, use the wheel or long-press.

## What this supersedes and amends
- **Supersedes 0066's grid** and **0067's round-3 layout** (the grid under a small map, the section headings, the wide panes). Kept from them: presence as dots, familiarity in words, rings read by themselves, the area's card with Walk to as its footer, and no count anywhere.
- **Supersedes 0092's directional swipe** (DN2-DN4, DN6's tile in a grid, DN7-DN9, DN11's four arrows). Kept: DN1, DN10, DN12, DN13.
- **Keeps 0077:** a town's page has one way back, the pill, above the row and never under a banner.
- **Amends 0034 for names on the map only:** busy areas are still information only, and their streets still draw; the names near an unselected area leave the map and stay on its card.

## Consequences
- The spec is `specs/explore-carousel/spec.md` (EC1-EC20); the plan is `specs/explore-carousel/plan.md`.
- No data, storage, migration or derivation change. No new dependency: the row is a horizontal `ScrollView` with snapping.
- The nearest-area swipe (`nextArea`, `landing`, `swipeHeading`, `snapScope`) is deleted with its tests; `swipeOf`, `arrowSwipe` and the swipe report in `WalkMap` stay.
- VISION.md's Precedents lists this record, by the owner's say: the vision's page is theirs to edit.
