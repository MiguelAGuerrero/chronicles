# 0061. Filled stretches stay styled as trace

Date: 2026-11-03 · Status: accepted · Area: trace, gaps, map

## Context
The filling-gaps audit (Nov 3) asked whether a self-filled or kept stretch should look different from recorded trace.

## Decision
The owner's call: filled stretches stay styled as trace. Only an uncertain stretch (an offer) is drawn faint (`FAINT_OPACITY`, the trace's green and edge, see-through).

## Consequences
- Follows 0060: a kept or self-filled stretch is walked trace in every way.
- The web map writes `data-runs` and `data-faint` for the e2e.
