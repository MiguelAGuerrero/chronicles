<!-- Mirror of the Claude Docs tab "v1.5: landing" (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). The doc is the owner's authoring surface; this file is the greppable copy. When they differ, the doc wins and this file needs a re-export. Last exported: 2026-11-03. -->

# v1.5: landing

Arrive somewhere new and know where to start. The app reads the area around a spot and finds its hotspots: pockets where shops, food, culture and nightlife cluster, and the strips (named streets lined with them) inside those pockets. It drops one "Start here" landing pin on a street at the best pocket. Everything is worked out on the device from the map tiles; nothing is looked up online.

## Status and decisions

Slices 1 (the analysis) and 2 (the home map) are built test-first, audited, fixed and deployed (Nov 1). Slice 3 (the walk) is built, audited, fixed and deployed (Nov 2): the loop's next leg is saved before it is routed and waits for the landing's scan; a leg too far is skipped; the loop's budget allows for streets (straight lines x 1.3). L17 is a non-goal for this slice: scan and ambient keep their rules. Decided: the trace hides while navigating (owner, Nov 2). Changes from the audits: strips link places along a street (bends, loops and same-named streets work) and pockets link dense places, so a gap splits them; the centre moves only to a town or city within 1.5 km, so the pressed spot stays inside the read (L1 said 3 km); areas within 1 km are one. Decided: hotspots are magenta, not green, because the walk trace is now green (owner, Nov 1). Open for the owner: a dense downtown can read as one big pocket holding many strips; its strips are all drawn and named.

- Decided: the area is picked with a map gesture: a long press on the home map, "What's good here?". There is no typed search, because a place-name lookup would be the first thing to leave the device (owner, Oct 31).
- Decided: pockets are shaded, strips drawn and named, and one landing pin is placed. No scores or rankings are shown (owner, Oct 31).
- Decided: the signal is a fixed activity mix, the same for everyone, not the scan preferences (owner, Oct 31).
- Decided: all four add-ons are in (owner, Oct 31):
  - a loop through the pockets
  - "in the strip" and dead-zone hints during a walk
  - a scan when you reach the landing
  - remembering analyzed places
- Unchanged rules: local-only; native first; no badges or totals; datasets behind interfaces; spec-first and test-first.

## What the tiles can and can't say

- No popularity, ratings, footfall or opening hours. Hotspots are a heuristic from density and street shape, and the app says so ("a best guess from the map").
- Points of interest, with class and subclass, come through the v1 category adapter (tilePois.ts).
- Street class from transportation: primary, secondary and tertiary roads usually carry a town's main streets.
- Transit: railway stations and bus stations sit in the poi layer, and make good landing points.
- Reads: the v1 tile decoder (tileDecode.ts) reads z14 tiles in code, without moving the map, on both platforms. A 1.5 km radius is at most 16 z14 tiles.

## The heuristic

The numbers live in LANDING\_RULES; the street-name list is data, not code.

1. What counts: only the places a scan recognizes, its eight categories through the v1 adapter. Supermarkets, convenience stores and bodegas, offices, transit stops, schools and the like are not counted at all (owner, Oct 31). **Activity weight per place:**
   - food, shops, nightlife, culture: 1
   - history, art, viewpoints: 0.5
   - parks: 0.25
2. **Density:** weights are spread over 50 m cells with a 100 m kernel.
3. **Pockets:** connected cells above max(a floor, 40% of the area's peak), holding at least 8 weighted places and spanning more than two blocks (at least 200 m end to end, LANDING\_RULES.minSpanM). There is no cap: every pocket the density finds is shown, and two strips in one town can be two pockets.
4. **Strips:** a named street lined with recognized places along more than two blocks: at least 5 places, at least 1 weighted place per 40 m of frontage (places within 30 m of it), over at least 200 m, with no gap longer than one block (80 m). A block is STREET\_MIN\_M, the same 80 m the snapper uses. All of these live in LANDING\_RULES and can be tuned. So a lone café, or a cluster at one corner of an otherwise residential street, is never a strip, and a corner bodega isn't even counted. A town can have many: every street that meets the rule is a strip, wherever it is. Main streets are found by the density of what lines them, never by their name or class (owner, Oct 31). A strip is named by its street ("Thayer Street"). A pocket is named by its heaviest strip, else by the neighbourhood it sits in (place points at z10, as v0.5 reads them), else "A busy pocket".
5. **Fallbacks, only for an area where the density finds nothing at all (a village, sparse map data),** in order, when no pocket qualifies:
   - (a) the crossing of the two highest-class named streets nearest the town's centre point
   - (b) a street whose name is on the main-street list. The list starts US-leaning, with Main, Broad, Market, High, Front, Water, State, Church, Center/Centre, Commercial and Congress, and is labelled as such.
   - (c) the town's centre point itself
6. **Landing point:** on a named street at the heaviest pocket. A transit station within 150 m of the pocket comes first; else the strip's densest point; else the pocket's densest cell, moved onto its nearest street.

## Slice 1: the analysis

Acceptance criteria:

- **L1.** A long press on the home map at z10 or closer offers "What's good here?" beside Walk here and Scan here. It centres on the nearest town or city point within 3 km, else on the pressed spot, and reads a 1.5 km radius.
- **L2.** The read uses the tile decoder at z14, behind "Looking around…" with Cancel. It caches streets and places with the tile build, like any read. A failed read changes nothing: "Couldn't read the map here".
- **L3.** The weights, cell size, kernel, thresholds, frontage rule and radius live in LANDING\_RULES. The main-street list is a data file.
- **L4.** Pockets are found as in the heuristic, all of them (no cap), each at least 8 weighted places. A pocket can hold many strips, or none.
- **L5.** Every street meeting the frontage rule over 200 m is a strip, however many there are, and carries its street's name. A name on the main-street list or a road's class never makes a strip, and never ranks one.
- **L6.** With no pocket, the fallbacks run in order. The result says which applied: "Busiest area", "Main roads: Broad & Market", "A Main Street" or "Town centre".
- **L7.** The landing point is always on a named street, chosen as in the heuristic.
- **L8.** Analysis of a dense downtown (about 16 tiles, 5,000 places) runs in under a second on the device.

## Slice 2: on the home map

Acceptance criteria:

- **L9.** Pockets are shaded softly in magenta, strips drawn bold in the same magenta (#d6268c, at least 3:1 on the base map) with their names in a dark magenta, and the landing pin reads "Start here" (#a3166a, white text at AA). Magenta is the one hue no other layer uses: the trace is green, walked streets orange, a route blue, the fog grey, photos teal, video red, memos purple and notes amber (owner, Nov 1). No score, rank or count is shown. A line says "A best guess from the map".
- **L10.** The landing pin's sheet has Walk here (navigates there), Scan here and Walk the loop.
- **L11.** Analyzed areas are remembered (Landing rows: a cache tagged with the tile build and LANDING\_RULES). The home map shows them later, offline, at z12 or closer. A new build or rules version re-analyzes them on the next long press, never silently.
- **L12.** Analyzing the same area again replaces its rows.

## Slice 3: on the walk

Acceptance criteria:

- **L13.** Walk the loop: a route from the landing pin through each pocket's centre, nearest first, and back, taking pockets in that order while the loop stays within the 10 km navigation limit (the rest are left for another walk), over the on-device street router. The navigator gains legs: arriving at one moves to the next, and the bar reads "1 of 3 · Thayer Street". If a leg can't be routed, that pocket is skipped and the walker is told.
- **L14.** In the strip: within 30 m of a remembered strip, a quiet chip reads "On Thayer Street". It is not a notification and not a hint.
- **L15.** Dead zone: more than 400 m from every remembered pocket for 10 minutes, with one within 1.5 km, an in-app pill reads "Thayer Street strip, 600 m north", with Go here. Once a walk. Silenced by a quiet walk.
- **L16.** Reaching the landing pin (within 30 m) on a walk started from it runs a scan there, once, if scanning has preferences.
- **L17.** Remembered pockets and strips feed the v1 scan and ambient as context only: nothing changes their rules in this slice.
- **L18.** Nothing leaves the device beyond tile reads.

## Planned tests

- Unit tests (pure, in-memory places and streets):
  - L3–L8: weights; only scan-recognized places count; a lone café, a corner bodega and a three-shop corner on a residential street are not strips, while two and a half blocks of shops are; pockets span more than two blocks; strips, fallbacks in order, the landing on a named street, a transit station preferred, and performance
  - L11, L12: the cache key and replacement
  - L13: leg order and skipping; L14, L15: the chip and pill rules
- e2e, with a fake grid holding a dense block and a sparse edge:
  - L1, L2, L9, L10: the long press, the read, the drawing and the pin's sheet
  - L13, L16: the loop's legs and the scan on arrival

## Open questions

- Decided: a pocket with no strip takes the name of the neighbourhood it sits in ("Fox Point"), else "A busy pocket" (owner, Oct 31).
- Should the main-street list grow per country (High Street in the UK, Hauptstraße in Germany)? Recommended: yes, as data, when a walk first happens there.
- Could landing pins be shared later, for example to a friend arriving in town? Out of scope while v0 stays local-only.
