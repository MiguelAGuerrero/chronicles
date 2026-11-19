# 0230. Places are a layer, not a list: the card says only the kinds

Date: 2026-11-19 · Status: accepted · Area: explore, layers · Amends: 0132 (every place still to find is on the map, always), WT8 (the card's "Waiting to be found")

## Context
West Catasauqua's card read Art "none" while its "Waiting to be found" showed an Art "?": the dots weigh a small place ¼ or ½ (SP12, 0183) and the chips listed every place. The owner: "points of interest might just have to be their own data layer on top of the map" (Nov 19), "to favor simplicity". The `/vision` gate said aligned if reshaped.

## Decision
The owner's calls, Nov 19:
- **Places are a layer.** "Places", a switch in Explore's Layers panel, **on by default**; it governs every "?" and dot (the selected area's, and out of town) and the card's small picture.
- **The card says only the kinds.** It lists no places waiting and no kinds-only line about them: "I want to move away from this collector's attitude into just local information that elicits interest."
- Presence does not change (no weight, step or `ATLAS_CODE`).

## Consequences
- The map's "?" stay, as local information; the card's chips go. The kinds-only account of what waits lives on the map (a screen reader hears its one button, WT11, while the layer is on).
- Proposed for VISION.md (the owner decides): Never, a card or screen that lists what is left to find; "what's waiting" is the map's "?", never a list.
