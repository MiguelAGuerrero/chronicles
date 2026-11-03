# 0029. Walk me back takes the shorter way

Date: 2026-11-01 · Status: accepted · Area: navigation

## Context
The owner's call, Nov 1, after a screenshot of a 513 m retrace around a block where a straight street ran ~300 m.

## Decision
The trace route and the streets already cached around you are both tried (`routeTo(..., 'shortest')`), and the trace is kept unless the streets are at least 10% shorter. Re-routes pick the same way.

## Consequences
- Walk me back never cuts a corner: a trace shortcut joins two points within 30 m only if they are at least 100 m apart along the walk (the first version cut corners through buildings; a screenshot showed it).
- After the audit: joins happen per query (`WalkGraph.withExtra`); the trace join is capped at 150 m; a failed re-route reads the streets again at most once a minute.
- Walk me back (`arrow-undo`) is the top edge button, shown once you are more than 50 m from the start. Suggested routes stay deferred (0022).
