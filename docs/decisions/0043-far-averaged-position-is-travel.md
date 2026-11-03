# 0043. An averaged position more than 75 m away is travel, not a jump

Date: 2026-11-02 · Status: accepted · Area: trace

## Context
Nov 2. The tabs e2e walked 200 m out and straight back along one street; the two passes of one spot, two minutes apart, read as a stay, and the walk lost its middle (and its "passed" place). A stay survived two bins outside it as GPS jumps (0010), however far.

## Decision
An averaged position more than 75 m away is travel, not a jump (`DWELL_JUMP_M`): it ends the stay.

## Consequences
- Amends 0010 (`dwellsOf` / `smoothDwells`).
- `outAndBack.json` is that walk, as a fixture.
- `SNAP_RULES` 6 re-snaps every walk when its replay next opens.
