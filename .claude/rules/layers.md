---
paths:
  - "src/lib/layers/**"
  - "src/components/LayersControl.tsx"
  - "src/lib/__tests__/layers/**"
---
# Map layers

A layer puts graphics on the base map; one Layers button opens a panel with a switch per layer (specs/map-layers, ML1-ML13, decision 0095).

## What it is

- **A layer is data** (`layers/registry.ts`, core): id, name, icon, default, legend rows (a swatch key, words, an optional tooltip and walkability band), one quiet note. The panel, the store and the defaults are built from the list, so a layer is one entry and its drawing.
- **Defaults:** Walkability off, Busy streets off, Town borders on. The button fills only while a layer that starts off is on (borders on from the start would always say "on").
- **One setting for every map** (`layers/shell.ts`, meta `map_layers`: every layer's boolean as one JSON value). `walk_layer` (the switch from before layers) is read once when no setting is stored. Views read it with `useLayers()`; `layers.set(id, on)` writes.
- **The panel's open state lives in the same store** so a screen's map press can close it (`layers.closePanel()`): the Explore map, the Navigate ready map and the live walk each call it from their map's press. Escape closes it too.
- **Where a layer's drawing is gated:** Walkability by `useWalkability(centre, on)`; Busy streets by `useBusyLayer(centre, on)` (the remembered areas within 3 km, drawn on any walk; with none within 1.5 km it reads once, the same read What's good here does); Town borders by the screens handing `borders` to the map only while on (a town's own page keeps the border it frames, TB2).
- Nothing is read for a layer that is off. No number, count or percentage appears on the button, the panel or a legend (a test checks the words).

## Traps

- Explore mode no longer draws busy streets by itself; its chip, nudge and "?" marks are unchanged. An exploring walk's reads call `busy.reload()`.
- The Explore map is about 200 px tall on a phone: its Layers button is anchored from the top and the panel opens below it, left of the buttons beneath; the walk's anchors from the bottom and opens upward.
- The e2e reads `data-borders`, `data-walk` and `data-busy` on the map's container.
