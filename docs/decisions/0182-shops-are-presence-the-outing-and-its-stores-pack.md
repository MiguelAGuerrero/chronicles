# 0182. Shops are presence, not points of interest; the outing plans over facets; the stores pack ships

Date: 2026-11-16 · Status: accepted · Area: explore, discovery, walk-planner, vision · Amends: decisions 0115 and 0044 for the stores layer and `outing/` only

## Context
The owner asked for a quick start that proposes a circuit for what the walker wants to see (antiques first), then reframed it: no per-intent
button, a page where you describe what you want from a vocabulary, with antiques as the example of how a rich dataset of stores makes a
route that points of interest alone cannot. The gate (`/vision`, Nov 16) found it aligned if reshaped and the steward (S1-S8, R1-R8) shaped it
(`specs/quick-circuit/`, QC1-QC42). 0115 keeps ordinary shops out of the places archive and 0044 keeps them out of marks.

## Decision
The owner's calls, Nov 16:
- **Shops are presence, not points of interest.** They help understand a place and are already in presence (0140); a shop is a mark only when
  something particular (a listing, a history) makes it one, by the gates that already decide that. The stores layer feeds outings only and never
  makes a store a mark, a find, a landing item or part of the atlas (QC31).
- **The stores pack ships**, built and published by chronicles-data (contract and sources in `specs/quick-circuit/handoff.md`); until it covers
  an area the tiles' shop subtypes serve the vocabulary.
- **Books is the second vocabulary entry** (Antiques the first).
- **Extensible to dimensions, with no assumption about what is displayed**: the engine plans over candidates carrying facets by dimension and
  an entry is a predicate over them; what a shop sells is the first dimension, how it trades (vintage, thrift) a likely second; granularity
  grows without a heavier first screen (QC37-QC40).
- A shop enters the layer by what it sells and by nothing a crowd says: no rating, review count, price, popularity or hours as an ordering.
- **Second-hand and antiques are separate values of what a shop sells** (`second_hand`, `antiques`, `vintage`); a Thrifting entry of the vocabulary matches all three, Antiques only its own.
- **Chains are in the layer; whether they are stops is a setting, off by default** ("Include chains", meta `outing_chains`): a thrifting trip across several Goodwills is a legitimate outing. A chain is never a mark or a point of interest, whatever the setting says.

## Consequences
- 0115's "ordinary shops stay out" and 0044's "food, shops and nightlife stay in the place cache" are unchanged for the archive and for marks;
  this layer is a third thing, read only by `outing/`.
- The vision's Shapes table gains a line for outings (proposed in the owner's review of this record; the page is the owner's to edit).
- A second dimension, other kinds of candidate and opening hours each need their own slice and, for hours, a decision.
