# 0112. The app opens on Chronicle, and Memories keeps a moment in one tap

Date: 2026-11-09 · Status: accepted · Area: tabs, chronicle, capture, vision

## Context
The owner, Nov 9: "sometimes I want to capture a moment outside the context of a map, a walk", but the app opened on Explore (0070), which has no capture; the camera, mic and note were on Navigate, two taps from launch. "To capture a moment, I would have expected that to be like the first thing I see." The Navigation & tabs spec had kept quick capture off Chronicle ("Navigate and the walk screen have it, Chronicle doesn't", NV11), before VISION.md made Chronicle first (Nov 5).

The gate (`/vision`, decision 0094) found it aligned if reshaped. It serves Honour and Return, and fixes a drift against "Capture is one tap away" and "Chronicle first". It is reshaped only in register: the owner's "three large buttons" become the stack's three kinds, in plain ink, fixed low, never a hero block (Restraint).

## Decision
The owner's calls, Nov 9:
- **The app opens on Chronicle's Memories** when no walk is open. This supersedes 0070's opening tab. With a walk open, the walk screen still comes straight up (0076). 0070's stale-link and replay-error rules carry over to the new root.
- **The tabs read Chronicle · Explore · Navigate**: the home is the leftmost tab.
- **Explore stays as it is.** Capture does not belong on it; "Explore doesn't make too much thematic sense" meant capture there, not the tab.
- **Quick capture is on Chronicle, on Memories only.** This amends Navigation & tabs' "Chronicle doesn't" and NV11. Walks, Days and Map keep their map and sheet.
- **With a walk open and minimized, Chronicle's capture row files into that walk**, as the recording bar's camera does (NV9).

Taken as defaults in the plan and confirmed by the owner's go-ahead ("Proceed", Nov 9):
- **The recording bar shows no camera while Memories is in front**; the band's camera files into the walk (steward S4). Elsewhere the bar keeps its camera.
- **Memories' empty state is "Nothing kept yet." and the band**, without its accent Navigate button (steward S3).
- **A launch still leads with a resurfaced moment** (0098, unchanged), with the band first for a screen reader.
- **Chronicle is the root path `/`**, Explore moves to `/explore`, and `/chronicle` redirects to `/`.

## Consequences
- The spec is `specs/capture-from-chronicle/spec.md` (HC1-HC15), and the plan is `specs/capture-from-chronicle/plan.md`.
- Explore's one fix per launch (NV16) moves to Explore's first focus. Opening the app reads no location.
- Amends `specs/navigation-and-tabs/spec.md` NV1, NV2, NV5, NV11 and NV16, and `specs/navigate-ready/spec.md` NR3.
- VISION.md's Precedents gains this row. No rule on the page changes.
