# 0202. A hairline between a tile's two groups

Date: 2026-11-18 · Status: accepted · Area: explore, atlas · Amends: decision 0201 ("space alone")

## Context
After Sights and Local life, phase 1 was built, the cold find (pictures and the owner's tasks only) could tell a tile's
findable kinds from its places to go into only by guessing, and the UI review saw the 16 px between the groups read as a
missing kind (`specs/sights-and-local-life/spec.md`, "UI review and cold find").

## Decision
The owner, Nov 18: "Add the line." A 1 px vertical line in the ink of the app's hairlines stands in the space between a
tile's Sights and Local life, only when both are present. Still no word on the tile.

## Consequences
- Criterion SG14; the strip still fits a selected tile at 320 px (216 of 222 px: the line sits inside the 16 px).
