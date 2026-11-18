# 0198. The Sights bars follow the switches; a tile's line leads with Sights; the tile's groups apart by space alone

Date: 2026-11-18 · Status: accepted · Area: explore, atlas · Amends: decision 0127 (the bars ignore "What I'm into"), 0197 ("Life" on a tight tile)

## Context
The plan of Sights and Local life, phase 1 (`specs/sights-and-local-life/plan.md`), went through the steward, the auditor
and the UX reviewer before any code. Three findings were the owner's to answer:
- A tile has no room for a word between its groups: eight kinds use 218 of 224 px on a 320 px phone.
- A tile's first line ("Plenty of food and shops") ranks all eight kinds, so it repeats the claim that began the slice.
- With every History kind switched off in "What I'm into", History still read "plenty" under Sights while no "?" could
  appear: the bars group the kinds, and the switches never changed them (0127).

## Decision
The owner's answers, Nov 18:
- **The tile sets the two groups apart by space alone**, no word; "Life" (0197) is not drawn.
- **A tile's line leads with Sights**: the strongest Sights kinds when any is present, Local life only when none is.
- **The Sights bars follow the switches now**: a kind switched off no longer counts toward its bar, on the card, the tile
  and the spoken line, at once. Local life has no switches. Chosen over leaving it for phase 2, though it makes phase 1 a
  change to what a bar counts.

## Consequences
- The cached tally keeps Sights places by kind; `ATLAS_OWN` a15, nothing carried: every area is read once more.
- With the switches at their defaults every bar is as before.
- Criteria SG12 and SG13 of `specs/sights-and-local-life/spec.md`.
