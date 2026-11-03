# 0010. Standstills: a stay is two minutes within 25 m, never a slow drift or circling

Date: 2026-10 (v0) · Status: accepted · Area: trace

## Context
Round 3 (the owner's calls). A stay should hold the trace still rather than scribble.

## Decision
Fixes are averaged into 30 s bins. A stay grows while each bin is within 25 m of the stay's running center, and it survives two bins outside (GPS jumps). It must last 2 min, its first and last thirds must sit within 15 m of each other (so slow drifting walks aren't stays), and when speed is reported its median must be ≤ 0.3 m/s (so circling a fountain isn't a stay). Neighboring stays at one spot merge.

## Consequences
- `dwellsOf` / `smoothDwells`; the live distance uses the same smoothing as the card; walks summarized before this keep their old distance until they re-snap.
- Without reported speed, slow circling inside 25 m can still read as a stay.
- Amended by 0043 (`DWELL_JUMP_M`: a far averaged position is travel). Never `smoothDwells(keptFixes(tr))` on a trace with rides (0040).
