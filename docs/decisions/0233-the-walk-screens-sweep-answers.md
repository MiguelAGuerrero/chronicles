# 0233. The walk screen's sweep: the owner's answers to T42-T48

Date: 2026-11-19 · Status: accepted · Area: walk-screen, navigation, captures, notifications · Amends: 0008 (a discarded memo "undoable for 5 s"), NR10 (Discard in the camera's slot mid-memo)

## Context
The first whole sweep of the walk screen (`/tend walk-screen`, Nov 19, decision 0229) filed seven entries for the owner:
T42 (the navigation bar at 320 px), T43 (a web video over 15 s thrown away), T44 (the camera mid-memo), T45 (the raised
settings' way down), T46 (navigation's blue beside the rust), T47 (the pause reminder on by default) and T48 (a
discarded memo's Undo that goes after 5 s with no Close). The owner answered each in person the same day.

## Decision
The owner's answers, verbatim:

- **T42:** "Two rows inside (Recommended)". The navigation bar keeps its place in the top row beside Minimize and takes
  two rows inside it: the arrow and the line, full width, up to two lines; then "Open in Maps" and "End", both labelled.
- **T43:** "Keep it whole (Recommended)". A web video over 15 s is stored whole as a moment with its place and time, and
  its length is said; no trimming.
- **T44:** "Camera stays (Recommended)". While a memo records, the camera keeps its slot and a photo taken then joins the
  memo's moment; Discard moves beside the timer. This amends NR10.
- **T45:** "Done + map tap (Recommended)". The raised settings have a labelled "Done", and a tap on the map above them
  lowers them, both as Escape does.
- **T46:** "Keep the blue (Recommended)". Navigation keeps its own colour: the route line, the navigation bar and the
  range ring stay blue, the colour that means the way on every map, beside the app's rust.
- **T47:** "Keep it on (Recommended)". The pause reminder stays on by default: it reports on a walk you started and
  left paused, never a call back to the app.
- **T48:** "Undo + Close, stays (Recommended)". A discarded memo's pill has Undo and Close and stays until it is used,
  closed, or replaced by the next capture. This amends 0008's 5 s.

## Consequences
- T42, T43, T44, T45 and T48 are the owner's direction for their builds; each waits in the inbox, its answer noted on
  it, for a `/tend inbox` that builds it (one build per run).
- T46 and T47 leave the inbox: what ships today stands, and a sweep does not raise either again.
- `specs/navigate-ready/spec.md` NR10 and `.claude/rules/walk-screen.md` ("Discard is smaller (48) and in the camera's
  slot, and it is undoable for 5 s") change with the builds of T44 and T48.
