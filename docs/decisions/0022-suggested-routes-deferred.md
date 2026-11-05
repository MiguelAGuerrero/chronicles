# 0022. Suggested routes are deferred to their own later slice

Date: 2026-11-01 · Status: accepted; superseded in part by 0095 (scenic routes shipped Nov 4) · Area: navigation

## Context
The positioning principle is the interesting way, not only the fastest. The owner's call, Nov 1, on when that ships.

## Decision
Routes to a destination with detours shaped by preferences (streets with life, things worth seeing), Explore's route preview and "Walk this way" are their own later slice.

## Consequences
- Walk me back stays shortest (0029).
- `RouteSource` (0017) is the seam a preference-shaped source plugs into.
- Listed in `docs/DEFERRED.md`.
