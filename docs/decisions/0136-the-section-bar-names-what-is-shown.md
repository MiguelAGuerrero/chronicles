# 0136. The section bar names what Chronicle shows: the sheet's Walks, Days and Map move it

Date: 2026-11-11 · Status: accepted · Area: chronicle, navigation · Extends: 0098 · From: `/tend` inbox T3

## Context
Chronicle is one screen with four sections, Memories | Walks | Days | Map (0098), chosen from the section bar at the
top. Walks, Days and Map share one map and its sheet, and the sheet has its own Walks | Days switch and a Map button
(U8). Changing the list from the sheet left the bar where it was: the first `/tend chronicle` sweep pictured the bar on
Map while the sheet showed Walks (`10-home-walks`, `qol-04-chronicle-renamed`). Two controls on one screen naming the
same thing disagreed, against NN/g H4: "Users should not have to wonder whether different words, situations, or
actions mean the same thing" (`docs/research/ui-references.md`).

## Decision
The owner's yes to T3, Nov 11:
- **The bar always names what is shown.** The sheet's Walks, Days and Map also set Chronicle's section
  (`chronicleSection.set`), so the bar follows the sheet as the sheet follows the bar.
- **The sheet keeps its switch.** It is the control within reach of the thumb at every height (U8); nothing is removed.
- Moving between Walks, Days and Map is a change of what the sheet lists, not of screen: the map stays up, where it
  was (0098's later call, NV3), whichever control made the change.

## Consequences
- `ChronicleMap` is keyed by section today (`(tabs)/index.tsx`), so a section set from the sheet would remount the map;
  the build keeps one map across Walks, Days and Map and passes the section in, so no canvas is made again.
- A place's walks and a day's timeline keep the section they were opened from; a replay or a day opened from a section
  still returns to it (0098).
- The work is shaped as `G1` in `docs/STATUS.md`, "Next evolutions", for a yes of its own (0128, 0130).
