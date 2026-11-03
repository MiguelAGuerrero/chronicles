# 0045. The trace hides while navigating

Date: 2026-11-02 · Status: accepted · Area: navigation, map

## Context
The owner's call, Nov 2: an indoor jumble buried the route back.

## Decision
The trace hides while navigating. It is still recorded and comes back when navigation ends.

## Consequences
- Ride dashes hide with the trace (0040); the start and end markers share the trace's opacity and hide too (QL, 0063).
- The route (8 px, a 12 px white edge) is drawn only ahead of you.
- Walk me back still takes the shorter way along the recorded trace (0029).
