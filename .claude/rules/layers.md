---
paths:
  - "src/lib/layers/**"
  - "src/components/LayersControl.tsx"
  - "src/lib/__tests__/layers/**"
---
# Map layers

A layer puts graphics on the base map; one Layers button opens a panel with a switch per layer (specs/map-layers, ML1-ML13, decision 0096).

## What it is

- **A layer is data** (`layers/registry.ts`, core): id, name, icon, default, legend rows (a swatch key, words, an optional tooltip and walkability band), one quiet note. The panel, the store and the defaults are built from the list, so a layer is one entry and its drawing.
- **Defaults:** all three layers start off (the owner, on the UI audit, 2026-11-05). The Layers button is outlined, never filled with the accent: while any layer is on its glyph is the filled one and its edge firmer.
- **One setting for every map** (`layers/shell.ts`, meta `map_layers`: every layer's boolean as one JSON value). `walk_layer` (the switch from before layers) is read once when no setting is stored. Views read it with `useLayers()`; `layers.set(id, on)` writes.
- **The panel's open state lives in the same store** so a screen's map press can close it (`layers.closePanel()`): the Explore map, the Navigate ready map and the live walk each call it from their map's press. Escape closes it too, and it closes when its button unmounts, so it never follows you to another screen.
- **The panel sits beside the button** (`layers/layout.ts` `panelBox`): to its left, from its top down, scrolling inside the room it has, so a short phone (the walk's button sits high) and a wide Explore (a narrow map pane) both fit. Its width follows `paneWidth`, never the window's. The panel holds switches and status lines only. The legend (`LayersKey`, in `LayersControl.tsx`) lives in the walk's settings drawers (`StartSettings` and the live `options-card`), never over the map (owner, Nov 5: the tooltip is intrusive). Each legend row is a 44 px target whose meaning opens in the flow beneath it (`Tooltip`), never floating: a floating tip was clipped by a scroll view and painted under later siblings.
- **Where a layer's drawing is gated:** Walkability by `useWalkability(centre, on)`; Busy streets by `useBusyLayer(centre, on)` (the remembered areas within 3 km, drawn on any walk; with none within 1.5 km it reads once, the same read What's good here does); Town borders by the screens handing `borders` to the map only while on (a town's own page keeps the border it frames, TB2).
- Nothing is read for a layer that is off. No number, count or percentage appears on the button, the panel or a legend (a test checks the words).

## Traps

- Explore mode no longer draws busy streets by itself; its chip, nudge and "?" marks are unchanged. An exploring walk's reads call `busy.reload()`. `useBusyLayer` keys its drawing by which areas are near (`nearKey`), never by the walker's fix: rebuilding it once a fix rebuilt every label.
- The Explore map is about 200 px tall on a phone: its Layers button is anchored from the top and the pane overflows (`overflow: visible`, `zIndex`) so the panel can run over the cards below; the walk's is anchored from the bottom, with the panel placed from the button's top.
- The e2e reads `data-borders`, `data-walk`, `data-busy` and `data-busy-sets` (how many times the busy drawing was sent) on the map's container. A journey that looks at a layer turns it on first (`switchLayer` in the harness): they all start off.
- `layerNotes` (`layers/notes.ts`) is the quiet line under a layer that cannot draw: waiting for a position, reading, not available.
