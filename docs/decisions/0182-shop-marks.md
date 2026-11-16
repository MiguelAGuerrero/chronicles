# 0182. Shop marks: the shops as data and as a layer, never as marks

Date: 2026-11-16 · Status: accepted · Area: explore, discovery, layers, vision

## Context
Shops have been a weight only: they make a street busy (decision 0080) and are never drawn as places (decision 0044, "Food, shops and
nightlife stay in the place cache only to feed the landing's density"). The owner wants a later slice, circuits: a journey across several
towns through the shops of a kind (thrift, antiques, books, records), saved and walked again another day for different wares. That
needs the shops themselves, for towns the walker has never opened, and a way to see them apart from Explore's presence. The vision gate
(Nov 14) found it **aligned if reshaped**: Earn, thinly; the layer is a directory, which is why it is a substrate and a layer, not a
feature of Explore. The steward's read (Nov 14) found one breach and six drifts, all taken into the spec (`specs/shop-marks`).

## Decision
The owner's calls, Nov 14:
- **Every named `shop=*` from OpenStreetMap is ingested** into regional packs by a new adapter in chronicles-data (decision 0108), as a
  separate pack family beside the places archive, with its own manifest and contract, never merged into it. Each place carries a shop
  type, a name, a position and a chain flag from `brand`/`operator` tags, and nothing else.
- **The layer draws only a stated list of shop types for now** (the shops presence already weights as `boutique`, kept in presence as
  `SHOP_MARK_TYPES`); errand shops stay in the pack, undrawn. No copy calls a drawn type worth going to or another an errand.
- **A "Shop marks" layer, off by default, on every map that has a Layers button** (Explore, Navigate ready, the live walk), offered only
  where a pack's address is set. No labels; the name on a tap. A tap on a lone mark opens a small card at the map's top; a merged mark
  zooms apart and opens none. The card says it is a chain only when the record says so, worded as what the map data records.
- **The walk kept** (the gate argued once for leaving it out; the owner kept it).
- **Circuits are a later slice.** This one plans, saves and revisits nothing.

## Consequences
- **Amends 0044:** a shop may be drawn as a layer, never as a mark or on a checklist. 0044's rule for marks stands.
- A shop is never marked visited, passed, found or done, in this slice or in any later layer or circuit, and a circuit shows no "n of m"
  (the steward's S7; the vision's "not tourists working through a list", "nothing is a score"). Whether a circuit may say "passed", and
  whether a moment may say "just after the bookshop", are the owner's open questions, neither decided here.
- Shop marks never enter presence, density, Busy streets, the atlas, checklists, kinds, marks, "?" pins or Explore's chip and nudge
  (SM17); `PRESENCE_CODE`, `ATLAS_CODE` and `LANDING_CODE` are untouched. Nothing is stored but the pack's manifest and when it was
  checked (SM6, SM18): no migration.
- The pack's address is `EXPO_PUBLIC_SHOP_MARKS_BASE`, empty in production until chronicles-data publishes a pack; the e2e build points it
  at the harness's `/shop-marks-e2e/`.
- A layer the walker switched on and sees nothing from is told why, in three states (no region, a failed read, zoom in), refining the
  gate's "failures are silent" (as the places archive's are): a covered area with none says nothing.
- The pack's contract is agreed here first (`src/lib/__tests__/shop marks/contract/`) and moves to chronicles-data's `contract/` when its
  adapter is built there.

## For the owner: the line this implies in VISION.md's Precedents
`| 0182 | Shop marks: every named shop as data and an off-by-default layer, never a mark or a checklist; no label, the name on a tap; no visited state (reshaped at the gate, Nov 14) |`
(Agents propose; only the owner edits VISION.md.)
