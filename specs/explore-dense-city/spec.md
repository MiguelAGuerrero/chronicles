<!-- Repo first: written from the owner's report in a session (Nov 12, 2026), not a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Explore in a dense city: names the map can place, and a page that keeps up

Nov 12, 2026 · @Miguel Guerrero

## Vision

Idea: The owner, Nov 12, in Downtown Baltimore on an iPhone: "the performance is awful. It's not smooth to move between neighborhoods, and the screen is cluttered with street names." The busy-street names drawn by the map, overlaps hidden, one per street, the busiest placed first, more as you zoom in; the busy read off the drawing thread and only once the map settles; fewer re-renders; no pre-rendered image.
Verb: earn (where there is a lot stays legible in a dense city: names you can read, and a map that keeps up while you look between neighborhoods)
Touches: Always, "Restraint in motion, colour and copy: the content is the novelty, not the chrome" (served: fewer names, none stacked); Always, "Guidance is structural: where there is a lot, ... never whether it is good" and Never, "Ratings, ... 'best of', rankings of places" (the placement order is the density grade AD already draws; it must never be said or shown as an order); Never, "Popularity, trending, foot traffic" (busy stays a density of places, AD1); decision 0124 / EC7 (names only near the selected area and from zoom 13: kept, collision works inside it); 0034 (busy areas are information only: no tap, no card on a name); EC18 (every area's busiest street stays named on its card, whether or not the map draws it). The performance half (worker, settle, re-renders) is no surface.
Verdict: aligned
Shape: as asked. Which names survive a crowd follows the grade the lines already show; the map never numbers, orders or highlights a name as "top", and a name dropped for room returns when zooming in gives it room.
Criteria: DC2 (no two names overlap), DC3 (a street named once), DC4 (no rank, count or "busiest" on the map), DC6 (EC7's limits kept; EC18 holds).
Open: none

## What it is

Explore's Busy layer names its streets with the map's own text, the way the base map names its roads: a name that has no room is left out, a street is named once, and zooming in gives room to more. When names compete, the heavier street keeps its name; nothing says so. Moving between neighborhoods stays smooth: reading a part of town not yet read happens off the page's thread on the web, starts only once the map has stopped moving, and the screen re-renders less per move.

## Decisions (the owner's calls, Nov 12; decision 0151)

- **Measure, then fix** (`scripts/perf-explore.js`, `docs/TESTING.md`): at 4x CPU, a first read of an unread area froze the page for one 4.4 s task (street derivation 1.7 s, the store write 1.7 s, decoding 0.5 s, the density pass 0.4 s); every switch lost about 1 s to long tasks (the map's own camera move about 320 ms, React about 350 ms, Explore rendered 3 to 5 times). Drags were smooth in Chromium, which does not model WebKit's compositing of DOM markers.
- **Names drawn by the map** (a symbol layer with collision, on web and native), not as DOM markers.
- **The read in a web worker on the web**, started only once the map settles on both platforms; on native it stays on the JS thread, yielding between stages.
- **On the walk screen and in Navigate the base map's names keep their room**, and the trace and route draw over the busy names; only Explore gives busy names priority (DC16).
- **The base map's own name of a busy street stays**; only one that would overlap a busy name gives way (steward S3).
- **The "?" pins and the area points stay DOM markers this round.** If a drag still stutters on the phone, they move to map layers next (DEFERRED).
- **No pre-rendered image of the area:** at street zoom a city is several times iOS Safari's canvas limit, baked text can't avoid overlaps or be tapped, and it must be redrawn whenever an area is read again. Raster tiles for the magenta lines alone stay an option for later.

## Criteria

### The names

1. **DC1** The Busy layer's street and pocket names are drawn by the map itself, on web and native: no busy name is a DOM element over the map, and where the map shows a busy street near the selected area from zoom 13, its name is on the map when there is room for it.
2. **DC2** No two busy names overlap each other on screen, and a busy name never overlaps a base-map label: a name with no room is not drawn.
3. **DC3** A street is named at most once in its area: one name per busy street (or pocket), never one per block, and never twice for one street read by two remembered areas (fix street-label-double holds).
4. **DC4** Where names compete for room, a heavier busy street's name is placed before a lighter one's. The map shows each name exactly as the street is called: no rank, number, count or "busiest" in any label, and every busy name has the same font, size, colour and halo whatever its street's grade; only staleness changes its look (DC6) (steward S2).
5. **DC5** Zooming in never takes a busy name away that had room: a name left out for room at one zoom is drawn once zooming in gives it room.
6. **DC6** EC7 and EC18 hold: names only near the selected area (a neighborhood's ring, a town's own reach) and only from zoom 13; every area's busiest street stays named on its card whether or not the map draws it. Stale areas' names are drawn as their lines are, dimmed.

14. **DC14** No busy name is drawn under the selected area's name on the map (steward S4; 0124: nothing near the selection drawn over its text).
15. **DC15** A tap on a busy name does what a tap on the bare map there does: no card, no selection, nothing of its own (0034, steward S5).
16. **DC16** On the walk screen and in Navigate (the same Busy layer), the names follow DC2-DC5 too; there the base map's own street names keep their room and the walker's trace and route draw over the busy names (steward S1; the owner's call, Nov 12).

### Moving between neighborhoods

7. **DC7** On the web, while the Busy layer reads an area, the page keeps drawing: decoding, deriving the streets and measuring density run off the page's thread, and no single task on the page's thread during the read is longer than 250 ms at the e2e's speed.
8. **DC8** If the background reader can't start or fails (a page left open across a deploy, a browser without workers), the read runs on the page as before and still finishes with the same result.
9. **DC9** A read the Busy layer needs (no remembered area within 1.5 km, ML9) starts only once the map has stopped moving: never during a switch's ease or a drag; a further move before it starts waits for that one to settle.
10. **DC10** Storing an area's street pieces never holds the page in one long write: on the web they are written in batches, the page drawing between them, and a read that is cancelled or replaced writes no further batch.
11. **DC11** On native the read yields between tiles and between its stages, so a read never holds the JS thread for the whole read at once (device: unverified).
12. **DC12** A switch to the next neighborhood renders Explore at most twice, and a Move map drag renders it at most once, at the drag's end.
13. **DC13** A busy read off the page gives the same busy streets, pockets, names and stored pieces as one on the page (one function computes both).

## Steward (Nov 12, on the spec and plan)

Five drifts, no breaches. S1 (the walk screen and Navigate change too, unreviewed): accepted as DC16, with the base map's names and the trace keeping priority there (the owner's call). S2 (a heavier name could later be made bigger): accepted into DC4. S3 (a street named by the busy layer and by the base map): the owner kept the base names (collision already hides those that would overlap a busy name; hiding them by name leaves a street nameless wherever its busy name has no room). S4 (a busy name under the selected area's DOM name): accepted as DC14, the area's name reserving its room in the names' layer. S5 (no tap on a name): accepted as DC15. Its silent questions: screen readers lose nothing (today's strip names are `aria-hidden` DOM labels, read by no one; EC18's card says the busiest street); the map's own label fades are off on the web (`fadeDuration: 0`, map rules); MapLibre Native has no setting for them (only `rasterFadeDuration`), so a native name fades in and out on the library's timing, outside reduced motion (DEFERRED; unverified on a device).

## Record

(Filled in as the slice is built.)
