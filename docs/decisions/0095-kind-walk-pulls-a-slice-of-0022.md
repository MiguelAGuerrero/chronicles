# 0095. A kind-scoped suggested walk pulls one slice of 0022 forward

Date: 2026-11-05 · Status: accepted · Area: explore, navigation

## Context
Decision 0022 deferred suggested routes (routes to a destination with detours shaped by preferences, Explore's route preview and "Walk this way") to their own later slice. The owner, Nov 5, after the `/vision` gate: offer, from Explore, a suggested walk through a town's or neighbourhood's features. The gate's verdict was *aligned if reshaped* (`docs/VISION.md`, Shapes: "Suggested routes"). The broader suggested-routes work is on a separate worktree; this slice must not build a second route source.

## Decision
Pull this much of 0022 forward, and no more (`specs/kind-walk`):
- **Where:** only Explore's area card. Tapping a kind row under "What's here" (Green, History, ...) opens it in place, with one suggested walk through where that kind is dense.
- **One way**, never several, never "fastest", nothing compared or saved.
- **Its length is a distance** in the displayed unit (km or miles, QL13-QL16), never a time, an ETA or a pace. The owner: a distance lets the walker judge their own time, since a walker's speed changes when they stop to look. A distance budget is a setting.
- **Walkability is stated before the walker commits** (0093): in words, whether the way can be walked the whole way, and any stretch built around cars. A setting chooses to warn (the default) or not to suggest ways that need one.
- **Built around density, not named stops** (the owner, Nov 5): the way passes through where the kind is concentrated and names no place, so the "?" marks still appear only as you reach them (the owner, Nov 1: discoveries in the moment, not a planned list).
- **Accepting it opens the walk screen ready** (0076); the walk is an ordinary one: no tour mode, no progress, no stop tally, no off-route alarm.

## Consequences
- Still deferred (0022 stands for these): a route to a destination, quick actions from place to place, routing that avoids car-oriented streets, "walk this way instead", and Explore's route preview.
- The route comes through `RouteSource` (`lib/nav/types.ts`, 0017); nothing builds a second one. If the suggested-routes worktree lands first, this slice uses its source.
- Walk me back stays the shortest way (0029).
- Proposed for `docs/VISION.md` (the owner's to make): a Precedents row for this decision, and, if the owner wants it written down, that the length of a suggested walk is a distance, never a time.
- Built after the fact (2026-11-05): a suggestion reads the area's map tiles itself when the row is tapped and keeps nothing,
  because the atlas stores no ring's places or streets (explore-atlas audit 6). A destination may carry stops to pass (`via`)
  and `suggested`, which leaves the time left out of the walk screen and its announcements (the owner's option A, Nov 5).
