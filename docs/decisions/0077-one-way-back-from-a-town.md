# 0077. A town's page has one way back: the pill low on the screen

Date: 2026-11-04 · Status: accepted · Area: explore, atlas · Amends AT2 in [0066](0066-explore-is-an-atlas.md)

## Context
On the owner's iPhone (Nov 3), a town's page had two back buttons: an arrow in the title card over the map, and a pill low on the screen (round 3), both saying where they went. With your own town's page open, the pill read "Phillipsburg" on Phillipsburg's page.

## Decision
The owner's call: keep one. The pill stays, since it is where a thumb reaches; the title card loses its arrow. Back (Android) and Escape (web) still return.

## Consequences
- `atlas-back` is gone; the e2e checks there is none on a town's page.
- The pill's label is unchanged (your town's name, or "Near you").
