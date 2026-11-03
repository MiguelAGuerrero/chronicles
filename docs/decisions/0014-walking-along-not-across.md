# 0014. Walking along, not across: a street counts once about a block of it was walked in its direction

Date: 2026-10 (v0) · Status: accepted · Area: streets, snapping

## Context
Crossing a street at a corner credited it. The owner's call on what "walked" means.

## Decision
A sample only counts where the trace runs within 35° of the street's direction, using the trace's heading over 10 m either side, so crossing at a corner credits nothing. A named street counts only once about a block of it was walked (`STREET_MIN_M` 80 m, or 80% of a shorter street). Until then its pieces stay fog.

## Consequences
- Snapping ignores the 20 m at each end of a piece, and credits pieces of 40 m or less only if the trace ran down their middle.
- Changing these rules means bumping `SNAP_RULES` in `tiles.ts`, which marks every walk to re-snap when its replay next opens.
- `WALKED_THRESHOLD` (0.5) is still an open product decision (`docs/DEFERRED.md`).
