# 0096. Map layers: one button, a switch per layer, off unless wanted

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
