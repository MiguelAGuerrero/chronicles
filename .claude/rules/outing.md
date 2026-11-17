---
paths:
  - "src/lib/outing/**"
  - "src/components/outing/**"
  - "src/lib/__tests__/outing/**"
---
# Plan an outing

One page from Explore: pick what you want to see from a vocabulary, get one proposed circuit (QC1-QC40, decision 0187, the spec is `specs/quick-circuit/spec.md`, its plan `plan.md`, the data side's contract `handoff.md`). It reuses the walk planner's routing (`fitOrder`, the legs, the ceiling and retrace rules, `PlannerCapture`) and adds no second planner.

## What it is

- **The core knows no kind of place** (QC37). It plans over a `Candidate` (id, position, facets by dimension, a name held for a tap or arrival only) and a `Want` (a match over facets): within a dimension any value, across dimensions all (`mergeFacets`, `matches`). `candidates.ts`, `pick.ts`, `plan.ts`, `swap.ts`, `dest.ts` and `arrival.ts` hold no word of a dimension or a shop (a test greps them); `wants.ts` is the vocabulary and the only place an entry is spelled.
- **Shops are presence, never points of interest** (the owner, Nov 16): the stores layer (`stores.ts`, `storesRead.ts`, `storesMerge.ts`) is read only by `outing/`; no store reaches the places archive, marks, the atlas or a checklist (QC31, held by a grep test). A shop enters by what it sells and by nothing a crowd says (QC11, QC12): `isStore` rejects any field beyond id, name, position, facets, src.
- **The pack is chronicles-data's** (`handoff.md`): tile features with flat properties `name`, `id`, `src` and one property per dimension, its values joined by a comma; an unknown dimension or value is dropped, never an error (QC40). Until a pack covers an area the tiles' shops serve the same table (`TILE_FACETS`); a failed pack read leaves nothing and says nothing (`readStores`).
- **Stops are never named before a tap or arrival** (QC17, QC24): a slot says its entry's word and a distance in words (`words.ts`); the destination holds positions only (`outingDest`); a name is resolved from the data at that moment and is never stored. Swap is the nearest other of the picked entries to the stop it replaces, not held, not offered for that slot before, no wrap (QC21).
- **Words** are held to the planner's banned-word grep, whole words, and no digit, ordinal or "of N" (QC25, QC28, QC33).

## Traps

- Presence's guard (`presence-readers audit 1`) forbids spelling a poi tag outside presence; `antiques` and `books` are values of the pack's `what` dimension and are allowed under `outing/` only (`PLAIN_IN`).
- `fitOrder` is exported from `walkPlanner/planner.ts` for the outing's ordering; nothing else of the planner changes.
- Native, unverified: the page over Explore's map, the arrival chip on a followed route, the basemap's labels near a stop, the pack's tile read on a device.
