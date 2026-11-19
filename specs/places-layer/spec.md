<!-- Repo first: from the owner's request in a session (Nov 19, with a screenshot of West Catasauqua on Explore: Art "none", an Art "?" waiting), not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). The doc wins once it exists. DRAFT: waits on the owner's review of plan.md. -->

# Places layer: the "?" are their own layer, apart from an area's presence

Nov 19, 2026 · @Miguel Guerrero

## Vision

Idea: "In order to favor simplicity, points of interest might just have to be their own data layer on top of the map" (the owner, Nov 19), after a card read Art "none" while its "Waiting to be found" showed an Art "?".
Verb: earn (the dots say how much an area holds; the "?" say where something waits)
Touches: Never, "Tallies such as '12 of 87' ... of places" (nearest fit, "'what's waiting' as kinds only"); Never, "Scores, ... completion, coverage"; Always, "Guidance is structural"; Always, "Counts are words"; Always, "Restraint"; decision 0115 (kinds filter what you see, never what exists; "?" named only on a tap, never listed or counted); decision 0132 and WT7, WT10, WT11 (every place still to find is on the map, none found, one accessible element); AT7 (a "?" is never named); decision 0067 (presence is dots; "none" keeps full ink); decisions 0127, 0183, SP12 (small places weigh ¼ and ½ toward a dot).
Verdict: aligned if reshaped
Shape: the "?" become a switch in the Layers panel ("Places", on by default) that governs every "?" and waiting dot (the selected area's; out of town's stars when built). The card drops its "Waiting to be found" chips and keeps the kind rows as its one voice about presence. "How the marks work" says once, in words, that a light place can wait where a kind reads none. Nothing counts places, and no presence rule changes.
Precedent: Google Maps (a category chip draws pins over the same map that carries the place summary); Pikmin Bloom (places are map points, with no area summary); Atlas Obscura (curiosities only, no summary: a counter-example for its editorial list); AllTrails (a filter page switches categories over a map).
Criteria: PL1-PL13 (the gate's are PL2, PL3, PL4, PL5, PL6, PL7, PL10 and PL13).
Open: the owner's calls in the plan (on by default; whether the card keeps a kinds-only line).

## What it is

Today an area's "?" appear twice: as pins and dots over the map (WT7, WT12) and as one chip per kind under "Waiting to be found" on the card. The card's kind rows, above them, show presence as dots, and a small place (a sign, ¼; a fountain, ½) is a place waiting but too light to light a dot: "Art none" beside an Art "?" (West Catasauqua, Nov 19). The two are different things: how much an area holds, and which places wait. This slice names the second as a layer.

## Decisions

- **Places is a layer** (the owner, Nov 19, "points of interest ... their own data layer on top of the map"): an entry of the registry (`id: 'places'`), a switch in the panel.
- **Named for what it draws, not a task** (the steward's S4): "Places", never "Places to find", "left" or "remaining".
- **The row says nothing new** (the steward's S1, S2): the card's wording never follows a map switch and never carries a plural or a hint of a count. "None" beside a "?" is explained once, in "How the marks work".
- **The owner's answers, Nov 19** (decision 0230): on by default; the card keeps only the kinds, with no waiting chips and no kinds-only line ("I want to move away from this collector's attitude into just local information that elicits interest"); the card's picture follows the switch.
- **On by default** (a default taken by the plan, the owner may overrule): the "?" are the invitation to explore, and today they are always drawn. The saved setting reads missing parts as defaults (ML7), so nobody's setting moves.
- **The card says nothing of waiting kinds** (the reshaping): "Waiting to be found" is gone. The map's "?" and the screen reader's one button remain.
- **Presence does not change**: no weight, step, `ATLAS_OWN` or `ATLAS_CODE` change, no migration.

## How adjacent apps do it

- **Google Maps** (iOS, Android): a category chip (Restaurants, Things to do) draws pins over the map, apart from any place summary. Source: from memory, unverified. **Unverified**.
- **Pikmin Bloom** (iOS, Android): places are points on the map; there is no area summary. Source: docs/research/small-places-wayspots.md (Nov 14). **Verified**.
- **Atlas Obscura** (iOS): a curated list of odd places near you, with no presence summary. A counter-example for its editorial guidance. Source: from memory, unverified. **Unverified**.
- **AllTrails** (iOS): Filters opens a page of categories switched on and off over a map. Source: from memory, unverified. **Unverified**.

## Acceptance criteria

1. **PL1** The owner's task: "show or hide the places waiting to be found on the map". A switch named "Places" is in the Layers panel of Explore's map, in ink with a word and the panel's own icon, where Walkability, Storefronts and the others are. Found by someone not told where it is: the Layers button, the panel, the switch (a finding criterion, checked in the journey by the button's name and the row's text, never by a test id alone).
2. **PL2** With "Places" on, the selected area's unfound places are on the map as "?" and dots exactly as WT7, WT12 and WT14 say, nothing about their drawing changes. (Places out of town, 0115, is queued and not built: its stars join this layer when they exist.)
3. **PL3** With it off, no "?" or waiting dot is drawn, for any selected area, on a neighborhood or a town's page. A tap on the map where one was does nothing for it (`tapDoes`: no dot to zoom to).
4. **PL4** The area card's picture (`MiniMap`) follows the switch: with it off it draws the ring, the streets and your trace, and no "?".
5. **PL5** With it on, a screen reader hears one button for the selected area (WT11: "Waiting in X: art, green. Opens its card"); with it off, none.
6. **PL6** A kind row's text is the same with the switch on and off, "none" in full ink in both; nothing on a row mentions a waiting place. "How the marks work" says, once and in words with no number, that a place too small to light a dot can still wait on the map where a kind reads none (`MARKS_EXPLAINED`, no digit, no "find").
7. **PL7** The card has no "Waiting to be found" section, and no text on the card, the row, the map or the panel counts places waiting, in digits or in words (WT8). The switch's name and legend hold none of "find", "left", "remaining", "unfound" (the steward's S4), and the journey checks no remaining-places text is on the page with the switch on or off.
8. **PL8** The choice is saved as part of the Layers setting and survives a restart; a setting saved before this slice (no `places` entry) reads as on, and no other layer's choice moves (ML7).
9. **PL9** The panel's rows are chosen per map: "Places" is listed on Explore's map only, never on Navigate's ready map or the walk's map, where there is no "?" to switch; the other layers are listed on every map as before. The one saved setting is still one setting for every map.
10. **PL10** The panel's legend row for the layer is a "?" swatch and "A place worth the stop": in words, no number, no name (AT7, ML6).
11. **PL11** The layer reads and writes nothing new: no new tile read, no new store, no migration, no change to `ATLAS_CODE`, and a map with the switch off computes no waiting pins or dots.
13. **PL13** The layer sits above the kinds (the steward's S6): with it on, a kind switched off in "What I'm into", or "Other places" off, still hides its "?" and dots (0115); with it off, no "?" of any kind shows. "Other places" is unchanged.
12. **PL12** Every host of the panel is accounted for: Explore's map lists the layer (PL1); Navigate's ready map and the walk's map do not (PL9); the layers' legend key (`LayersKey`, in the start settings and the walk's settings) lists only the layers that map has, so it never shows a "Places" legend, whatever the saved setting.

## Surfaces, from the code

`grep -rn "<LayersControl" src`: `app/(tabs)/explore.tsx` (lists Places), `components/walk/useReady.tsx` (Navigate's ready map: not listed), `app/walk.tsx` (the walk's map: not listed). `LayersKey` (hosted by `components/StartSettings.tsx` and `app/walk.tsx`) lists the layers that are on: it filters the same way (PL12). The "?" are drawn by `explore.tsx` (`split`, `waitingDots`, `discoveries`), `components/atlas/MiniMap.tsx` (PL4) and the out-of-town stars in the same screen.

## Amended

By the owner's reshaping (a layer, not a card section), named so none drifts silently (the steward's S3): WT8 (the card's "Waiting to be found" shows one per kind: gone; its no-count half stands), WT7 (every place still to find is on the map: now while "Places" is on, as the layer's own rule), WT11 (the one accessible element: only while it is on) and **decision 0132**'s "every place still to find is on the map" (same). The kinds-only account of what waits now lives in the map's "?" and the screen reader's one button; the owner chose no kinds-only line on the card (decision 0230).

## Out of scope

- Reweighing small places or changing any dot (SP12, 0183): the owner's calls stand.
- Listing the places waiting anywhere in words, or counting them (Never).
- A "Found" layer: the card's "Found" list stays; a find is a memory.

## Record

- **Built** on `claude/presence-things-found-discrepancy-1kmhu5`: PL1-PL13, test first (`850c070`). Unit tests: `src/lib/__tests__/layers/placesLayer.test.ts` (PL1, PL8-PL10, PL12, PL13) and `explore/placesLayerGate.test.ts` (PL2-PL7, PL11, source scans shown to fail on a snippet); the `carousel` journey's `wholeTowns` checks PL1-PL7 on the web build (the panel, off and on again, the card, the picture).
- **Changed from the plan:** the row phrase and `smallFinds` were dropped (the steward's S1, S2); the layer is last in the registry (not first) so existing tests' indexes held; out-of-town stars are not built yet, so PL3 covers the selected area's "?" and dots only; nine source files, three of them one-line `map=` props.
- **Not run:** the layers journey ran green before the final carousel edits (journey-only changes). Native has never run on a device: one item in `docs/NATIVE_UNVERIFIED.md`.
