# 0067. Atlas round 3: presence as dots, explained in words; "Quiet" stays the walk mode's

Date: 2026-11-03 · Status: accepted · Area: explore

## Context
An adversarial UI/UX review of the shipped atlas (decision 0066) found three things that undercut the owner's "presence, not quality" rule:
- Rising bars read as signal meters, so as ratings.
- "How bars count" printed thresholds ("Food 4 · 15 · 50"), which are counts of places by another name.
- "Quiet" described a sparse area, but it is already the name of the walk mode on Navigate.

## Decision
The owner said "proceed with all of it" (Nov 3):
- **Dots.** Presence is shown as one to three dots. Empty dots are drawn at a readable edge; a kind with none keeps full ink, with the word "none", and is never faded. Tiles show only the kinds an area has; the card shows all eight.
- **Words only.** "How the marks work" explains the scale without numbers (`MARKS_EXPLAINED`). The fixed steps stay in code (`STEPS`) and still decide the marks.
- **No "Quiet".** An area with nothing on the map reads "Not much on the map here", and a light one "A little <kind>".

The same round also took the review's other fixes:
- Walk to is a footer that stays in sight.
- The card is a sheet with two heights.
- The long press's choices sit over the map.
- Your town is the title, never listed again.
- Town tiles have a "See its neighborhoods" footer.
- Areas are named on the map.
- Wide screens get three columns, then side-by-side panes.

## Consequences
- This supersedes 0066's default of naming the steps in the explanation.
- The e2e checks that the explanation holds no digits.
