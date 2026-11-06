# 0097. Map layers: one button, a switch per layer, off unless wanted

Date: 2026-11-05 · Status: accepted (the build waits on the owner's review of the plan) · Area: map, explore, navigation

## Context
Map overlays arrived one at a time with their own rules: town borders always, busy streets only on an exploring walk, walkability behind its own button. The owner found the map crowded and the walkability button unclear, and asked for the idea of layers: each a graphic imposed on the base map, switchable, off by default.

## Decision
- One Layers button, where the walkability button was, opens a small panel of switches with each layer's legend.
- Walkability and Busy streets start off; Town borders start on (to confirm).
- One setting per layer, shared by every map. Busy streets draw independently of Explore mode. Only these three layers join now; the unwalked-streets toggle, fog, marks and routes stay.

## Consequences
- The walkability switch and its `walk_layer` setting are read once into the new per-layer setting, then replaced.
- An exploring walk no longer draws busy streets by itself; Explore's chip, nudge and marks are unchanged.
- Turning Busy streets on where nothing is remembered reads the area once, like What's good here.
- On the UI audit (2026-11-05): all three layers start off, Town borders included, and the Layers button is outlined, not filled with the accent.
- On the owner's call (Nov 5, "The tooltip is intrusive. Remove it and instead place it in the settings drawer"): the legend, its row tips and the layer's credit no longer float over the map. The panel beside the button keeps the switches and a quiet status line; each layer that is on shows its legend under "On the map" in the walk's settings (the ready bar pulled up, and the live walk's options card). Explore has no settings drawer, so it has no legend; its area card already says what the ground is in words.
