# 0141. The section bar's Walks zooms out as the sheet's Walks does

Date: 2026-11-11 · Status: accepted · Area: chronicle, map · Extends: 0054, 0136 · From: `/tend` inbox T6

## Context
The walks list zooms out to every place walked when one is out of view (0054, `lib/zoomOut.ts`). Once the section bar and the sheet named the same lists (0136, `specs/section-bar`), the sheet's Walks and a drag up ran that zoom-out and the bar's Walks did not: the same word moved the map two ways (NN/g H4). The section-bar slice kept each as it was (SB3) and asked the owner (T6).

## Decision
The owner's yes to T6, Nov 11: the bar's Walks zooms out too, by the same rule: from the sheet at rest, only when a place walked is out of view, never closer than now, framed above the half sheet.

## Consequences
- SB3's "the bar's Walks still does not, as before" no longer holds; the spec's line waits for the owner's amendment (the loop edits no spec).
- From Memories or Media the map mounts with its kept view and no fit; whether the bar's Walks should zoom out there too is T7.
