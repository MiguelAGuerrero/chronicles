# 0024. GPS wander is settled when a trace is read

Date: 2026-11-01 · Status: accepted · Area: trace

## Context
The owner's go-ahead, Nov 1, after a phone's screenshot of a scribble while standing still: the live map drew every gated fix, and wander of 20-40 m passes the accuracy and speed gates.

## Decision
Fixes within their reported accuracy of a spot's running centre are one spot. The reach widens up to 2x once a spot has held for 15 s, so drift doesn't move someone standing. A spot walked through (its halves' centres more than half its reach apart) is drawn from one half's centre to the other's. A spot stood in is drawn as its centre. A lone fix away and straight back is dropped. A lone first fix that the next two leave is dropped. Fixes without accuracy pass as before.

## Consequences
- `settleJitter` in `geo.ts`; the live map draws `liveRuns` (standstills held still, as the replay does).
- Corners can round by a few metres at poor accuracy. Tests count ground covered, never exact fix counts.
- `SNAP_RULES` 4.
