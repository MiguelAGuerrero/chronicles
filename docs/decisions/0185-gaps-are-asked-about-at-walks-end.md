# 0185. Offered gaps are asked about once, at the walk's end

Date: 2026-11-16 · Status: accepted · Area: trace, gaps, replay · Amends: [0060](0060-filling-gaps.md) and [0068](0068-uncertain-gaps-are-offered.md) (when an offer is decided, not whether)

## Context
The owner (Nov 16): offered gaps were not settled at a walk's end, so a walk's distance, streets and replay kept changing as a gap was kept later, on whichever open it happened. They asked for a prompt, or a silent roll-in.

## Decision
The owner's calls:
- A prompt, not a silent roll-in: an uncertain stretch stays opt-in (0060). The first replay after a walk asks once, in words and never a count, "Keep the likely way?", when gaps are offered. Keep keeps every offer; Leave stores nothing, and each gap is still decided from its card.
- The two answers are the same weight, so Name it stays the one primary on the card.
- Asked once per walk: stored (`gaps_asked:<walk>`) when shown, so a reload, Back or a stale link never asks again; a re-watch never asks.

## Consequences
- G15 in `specs/filling-gaps/spec.md`; `gaps/keep.ts`, `components/KeepGapsCard.tsx`, the replay's card beat.
- Kept offers are kept decisions like any other: Not this way still undoes one from its card.
- Not decided here: undoing all of them at once, and the walk screen asking at Stop (the replay is where the gaps are read).
