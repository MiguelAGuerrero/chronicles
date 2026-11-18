# 0199. Town borders in cocoa, apart from the accent, drawn above the replay's veil

Date: 2026-11-17 · Status: accepted · Area: map, replay, places · Amends the borders' colour of [0088](0088-town-borders.md) and TB8's "under everything else" for the veil; follows [0153](0153-replay-cards-accent-and-the-day-card.md) and [0188](0188-earth-and-ink.md)

## Context
Inbox entry T33 (filed by the map-palette slice): the replay and a day drew the walk's towns in `BORDER.color`, `#c2410c`, the accent's own hex, while 0153 says "The replay never lights anything in the accent". Swatches of three candidates beside today's were shown on the replay's beat one and card, a day's replay and card, Chronicle's map, Explore and a town's page, with a swatch sheet in normal vision, deuteranopia and protanopia. The comparison also found that on the replay and a day the borders sat under the world's veil (`COLORS.veil` at 0.45, added after the border layers on the web), so no colour could meet TB8 or TB10 there: the edge read 2.2 to 2.3:1 and the tint 1.09 to 1.11 whatever its hue.

## Decision
The owner's answers to T33, Nov 17:
- **"Cocoa #6e4f3f"**: `BORDER.color` becomes `#6e4f3f`, apart from the accent, and every map that draws borders follows (Explore, a town's page, Chronicle, the walk screen, the replay and a day). The firm edge reads 5.24:1 on Positron's land and the tint 1.19; it is 20.2 from the accent (CIEDE2000) and 15 or more from every map colour in normal vision. Only the hue changes: the 12% fill (but over the veil, below), the 3 px edge at 0.9, the grey neighbour lines and the borders' shapes are as they were.
- **"Borders above the veil"**: on the replay and a day's replay the town borders draw above the veil, so the edge meets TB8 (3.5:1 or more) and the tint TB10 there too. The two screens ask for it (`bordersOverVeil`). On the web the veil effect moves the layers (`borderMoves` in `components/map/types.ts`): with the veil on and the screen asking, the veil goes just under the borders' lines and the fill between them; on every other map the lines go back under the veil and the fill under the base map's first street (TB8). On native, layer order is mount order: on those two screens the borders mount after the veil, elsewhere before it. The walk screen's "unwalked" veil stays over its firm edge, as before: the answer named the replay and a day only, and over that veil a solid dark edge would match an unwalked street's line (tend map audit 39, from the review).

## Measured
- On the e2e's replay card (the `palette` journey, its town-border step), before (the accent, under the veil): edge 2.21:1, tint 1.09; after (cocoa, over the veil, the fill at 12%): edge 5.24:1, tint 1.18. Computed over the veil on Positron's land: edge 4.82:1, tint 1.18.
- Cocoa's limits, known when it was chosen: under deuteranopia it is 8.6 from the video's madder, under the palette's 9.5 colour-blind floor (no twelfth colour clears 9.5 from all eleven); its hue (54°, chroma 18) is in the accent's family by MP7's measure, and it stays 20.2 from the accent by lightness and chroma (14.8 at worst under protanopia).
- Over the veil at 12%, a base-map label (`#666666`) on the town's tint read 3.96:1 on Positron's land, under TB10's 4:1 by 0.04 (4.23 when the tint was under the veil). The owner answered in person, Nov 17: **"Lighten the fill on veiled maps"**. While the borders are over the veil (the replay and a day) the fill is 0.11 (`borderFillOpacity`): labels 4.00:1, tint 1.17 on Positron's land (tend map audit 38).

## Precedent
How adjacent map apps draw administrative borders (from the T33 comparison, read Nov 17, 2026; not yet recorded in `docs/research/adjacent-apps.md`):
- **OpenStreetMap Carto** draws borders as lines only, in a muted purple (`#8d618b`), a town's 1.4 to 1.6 px dash-dot over a white backing line from zoom 12 (gravitystorm/openstreetmap-carto `style/admin.mss`). Verified.
- **Positron** (our base map) draws only state and country borders, in a pale pink, no fill and no town borders (openmaptiles/positron-gl-style `style.json`). Verified.
- **Organic Maps** draws country and region borders only, in warm greys `#63635C` and `#73726B` at 0.7, no fill (organicmaps `data/styles/default/include/Basemap.mapcss`, `light/colors.mapcss`). Verified.

A border there is a quiet line in a hue the map's other layers do not use; none tints the region. The tinted, firm-edged town is our own (TB10), which is why the tint stays faint and the edge carries the shape. Cocoa sits with Organic Maps' warm greys.

## Consequences
- `map/palette.test.ts` pins `BORDER.color` to `#6e4f3f` and holds its distances and its contrast over the veil (`tend map T33`); the `palette` journey reads the edge and the tint on the replay's card from the screen.
- Native: the new mount order has never run on a device (`docs/NATIVE_UNVERIFIED.md`).
