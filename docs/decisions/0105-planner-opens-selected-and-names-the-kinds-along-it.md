# 0105. The planner opens with the first route selected, and names the other kinds along it

Date: 2026-11-09 · Status: accepted · Area: explore, navigation

## Context
The owner, after seeing the planner (Nov 9): it should present itself the way Apple Maps or Google Maps present routes: every route overlaid on the map, one selected from the start, and the selected one previewing what lies along it, so a walker can judge whether it is worth their time. 0102 had opened with nothing selected so no row reads as the recommended one, and gave only the opened kind's density along the route.

## Decision
The owner's calls, Nov 9, after the vision gate:
- **The first route is selected when the page opens** (through the middle, the first in the fixed order), with Start ready. Tapping another selects it. This amends 0102's "no row highlighted when it opens" (WP4, WP18). The order stays by preset, never by length or quality, and nothing is labelled recommended or fastest.
- **The selected route previews what lies along it in words that name kinds, never places:** besides how much of the opened kind it passes, "also passes some history and some art" for any other kind with a presence along it, at the cells' resolution (400 m) and counting every place found or not, as the shading does.
- **Pins stay as 0102 set them:** places already found, and no place not yet found, on the planner only. Features the map itself draws (parks, water) are left to the map; the planner adds no pin for them.
- **Distance only** (0095, 0101, 0102 stand): no time. The owner chose to keep it, since a walker's speed changes when they stop to look.
- **There is no "direct route" in the planner:** it has no destination of the walker's, so no route is the shortest way to somewhere; Go here's scenic routes (0095) keep Direct.

## Consequences
- Amends WP4, WP18 and WP14 of `specs/walk-planner`; adds WP28 (the other kinds along a route).
- Nothing here names or locates a place not yet found, so 0102's and 0095's rule and the Nov 1 call hold.
