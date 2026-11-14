# 0178. Storefronts: only places you walk into, and the code says storefronts too

Date: 2026-11-14 · Status: accepted · Area: explore, layers, landing, presence, scenic routes · Amends: decisions 0080 (density weights), 0127 (the leaning and the card's list), 0140 (storefronts is presence's)

## Context
"Busy" says traffic, which depends on the time of day; the data says what stands along a street. The owner reshaped T4
into G2 on Nov 11 ("busy" becomes "storefronts", listed nearest first) and asked for it again on Nov 14, unable to find
where the earlier work stood: it had been filed, never built. Presence (0140) was its prerequisite and had shipped.
Building it showed presence's density still weighed parks (half), and monuments, memorials and public art (full): a
layer named Storefronts would have lit a park.

## Decision
The owner's calls, Nov 14:
1. **Full G2** (all nine points as filed): the word storefronts everywhere the concept shows, nearest first, no superlative.
2. **Storefronts count only places you walk into** (over the recommended "same as today"): each presence class says whether
   it is a storefront; parks and green, monuments and memorials, public art, viewpoints, curiosities, listed structures and
   cemeteries are not, and weigh nothing toward the layer, What's good here?, a town's pockets and the route leaning.
   Offices, lodging, sport and civic places stay, as the owner's list of what stops counting left them.
3. **The code says storefronts too** (over the recommended "copy only"): the layer's id, the leaning's value, modules,
   hooks, props, test ids, map layer ids and perf counters. A choice saved under `busy` is read as `storefronts`.
4. **Straight through**, with no stop at the plan.
5. **"What's good here?" becomes "What's here?"** (the steward's S3, first filed for the owner since G2 kept the title): "Go with what's here, that's better for me." The long press says what is here, never whether it is good (SF15).

## Consequences
- `PRESENCE_CODE` p3 with nothing carried, `ATLAS_CODE` a13.p3: every remembered area and atlas row is read again.
- A complex's "shopping" word keeps `densityWeight`: a mall's art is still its own.
- The meta values `map_layers` and `route_leanings`, and a navigation in progress (`nav`), are JSON read through
  `decodeLayers` and `leaningsIn`, which map the old word; no schema change, and the next save writes the new word.
- Spec: `specs/storefronts/spec.md` (SF1-SF14). Walk to's start and a tile's street are still the densest strip (AT8),
  never said.
