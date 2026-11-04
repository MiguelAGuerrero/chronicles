# 0030. The map stays north-up; a soft cone shows the way you're going

Date: 2026-11-01 · Status: accepted · Area: navigation, map · Amended by [0081](0081-compass-and-rotation.md)

## Context
A phone's course once pointed east-north-east while the owner walked south (Nov 1). The owner's call against rotating the map.

## Decision
The map stays north-up. A soft 60° cone on the walker shows the way they're going.

## Consequences
- `headingOf`: the last 8 m (20 m since [0075](0075-the-cone-is-checked-by-the-trace.md)) or more of the trace, once moving at 0.5 m/s or faster; the device's course only when it agrees with the trace within 45°, or when there is no trace yet and it isn't Android's 0.
- Following keeps on zoom; only a pan or a turn stops it (web; native can't tell zoom from pan yet).
