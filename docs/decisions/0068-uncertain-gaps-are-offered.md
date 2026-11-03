# 0068. An uncertain gap is offered, never left blank

Date: 2026-11-03 · Status: accepted · Area: trace, gaps · Supersedes part of [0060](0060-filling-gaps.md)

## Context
On a walk through Lehigh Parkway (Allentown), the GPS was out for 8 minutes along a creek path. Its ends were 300 m apart, and the owner had followed the path drawn on the map. Nothing was shown: there was time to go other ways, and the 50% floor (G7) left the gap blank whenever another way came within a quarter of the path's length. The GPS log (shared from the finished walk's More menu) showed no ride or pause between the two fixes.

## Decision
The owner's call: any gap with a walkable way is offered. Its likeliest way, the shortest over the streets, is drawn faint, to keep or dismiss. Only the obvious cases fill by themselves (90% certain in the time allowed, as before). The 50% floor is gone. A gap still shows nothing when there is no way to offer: no street near an end, no way between, more than 2.5 m/s, mostly joins, or streets not read.

## Consequences
- More offers, some of them wrong. Nothing counts until kept, and "Not this way" removes one.
- The shortest way can cut across where the walker followed a bend or a loop. Choosing the way by its length against the time is not done.
- `GAP_RULES.offer` is removed; `Inference.certainDirect` stays, for tests and the card.
