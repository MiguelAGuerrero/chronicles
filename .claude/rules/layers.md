---
paths:
  - "src/lib/layers/**"
  - "src/components/LayersControl.tsx"
  - "src/lib/__tests__/layers/**"
---
# Map layers

A layer puts graphics on the base map; one Layers button opens a panel with a switch per layer (specs/map-layers, ML1-ML13, decision 0097).

## What it is

- **A layer is data** (`layers/registry.ts`, core): id, name, icon, default, legend rows (a swatch key, words, an optional tooltip and walkability band), one quiet note. The panel, the store and the defaults are built from the list, so a layer is one entry and its drawing.
- **Defaults:** every layer starts off (the owner, on the UI audit, 2026-11-05). The Layers button is outlined, never filled with the accent: while any layer is on its glyph is the filled one and its edge firmer.
- **One setting for every map** (`layers/shell.ts`, meta `map_layers`: every layer's boolean as one JSON value). `walk_layer` (the switch from before layers) is read once when no setting is stored. Views read it with `useLayers()`; `layers.set(id, on)` writes.
- **The panel's open state lives in the same store** so a screen's map press can close it (`layers.closePanel()`): the Explore map, the Navigate ready map and the live walk each call it from their map's press. Escape closes it too, and it closes when its button unmounts, so it never follows you to another screen.
- **The panel sits beside the button** (`layers/layout.ts` `panelBox`): to its left, from its top down, scrolling inside the room it has, so a short phone (the walk's button sits high) and a wide Explore (a narrow map pane) both fit. Its width follows `paneWidth`, never the window's. The panel holds switches and status lines only. The legend (`LayersKey`, in `LayersControl.tsx`) lives in the walk's settings drawers (`StartSettings` and the live `options-card`), never over the map (owner, Nov 5: the tooltip is intrusive). Each legend row is a 44 px target whose meaning opens in the flow beneath it (`Tooltip`), never floating: a floating tip was clipped by a scroll view and painted under later siblings.
- **Where a layer's drawing is gated:** Walkability by `useWalkability(centre, on)`; Storefronts by `useStorefrontsLayer(centre, on, stillness?)` (the remembered areas within 3 km, drawn on any walk; with none within 1.5 km it reads once, the same read What's here does, and on Explore only once the map has settled: `storefrontsReadDue`, Explore's `stillness` from the map's `onMoveState`, kept in a ref so a move never renders, DC9; it sets rows, build and reading only when they change, DC12; it lists the remembered areas only when the layer comes on, after a read or a reload, or where none covers the centre, never for a switch alone, SS8; a read a switch cuts short leaves its place untried, SS7; on a town's page Explore passes `hold` (`storefrontsHold`), and `drawnAreas` keeps every area within the town's reach drawn while its neighborhoods are switched, SS4); Town borders by the screens handing `borders` to the map only while on (a town's own page keeps the border it frames, TB2).
- Nothing is read for a layer that is off. No number, count or percentage appears on the button, the panel or a legend (a test checks the words).

## Where I've been (WB1-WB17, decision 0219)

- **A cache of each walk's line** (`pastLines/`): `core` builds it from the trace read with pauses, stills and kept gaps only
  (an inferred fill needs tiles and is never stored: a break), simplified within 5 m, indexed by its z12 tiles; `LINE_CODE`
  rebuilds every line. `shell` builds (Stop), drops (a gap decision, `gaps/index.ts`) and prepares stale lines one walk at a
  time, nearest the centre first, telling its store only at the start and the end. Never tied to the tile build: `purgeDerived`
  keeps it, `deleteWalk` takes it.
- **`usePastLines(centre, on, openWalkId)`** reads within 5 km (`reachTiles`, then `nearLines`) when the centre's area key or the
  store's version changes, never per fix; until its own first read a hook draws the last lines read (`lastRead`), so the walk
  screen's Start never blinks them off. The map sends them only when `PastView.key` changes (`perfCount` `past:send`).
- **Only the Navigate map (ready and live) and Explore's main map draw it** (steward S1): never a tile, a card's ring, Chronicle,
  the replay or a day. The ready screen reads only while `active`, the live walk only while a walk is open.
- **One even tone** (`COLORS.past` `#588a78`, 3:1 on the land and under the trace's 4.5:1, `where-ive-been ui 1`; `PAST_STYLE`: opaque, 3 px, no edge), between `fog` and `walked` in `LINE_SOURCE_IDS`. Its
  legend row's key is `earlier`, not `past`: `LayersKey` already gives the layer's block `layer-legend-past`.
- The e2e (`where`) reads `data-past` (the walks drawn), `data-fog-paint` and `data-veil` on the map's container.

## Traps

- Explore mode no longer draws storefront streets by itself; its chip, nudge and "?" marks are unchanged. An exploring walk's reads call `storefronts.reload()`. `useStorefrontsLayer` keys its drawing by which areas are near (`nearKey`), never by the walker's fix: rebuilding it once a fix rebuilt every label.
- The Explore map is about 200 px tall on a phone: its Layers button is anchored from the top and the pane overflows (`overflow: visible`, `zIndex`) so the panel can run over the cards below; the walk's is anchored from the bottom, with the panel placed from the button's top.
- The e2e reads `data-borders`, `data-walk`, `data-storefronts` and `data-storefronts-sets` (how many times the storefronts drawing was sent) on the map's container. A journey that looks at a layer turns it on first (`switchLayer` in the harness): they all start off.
- `layerNotes` (`layers/notes.ts`) is the quiet line under a layer that cannot draw: waiting for a position, reading, not available.
- **Explore's map pane is `zIndex: 5`** so the panel can overlay the cards; anything that must cover it (the area card, `AtlasCard`'s wrapper, `zIndex: 6`) needs a higher one, or the map takes the card's handle when it is full height.
