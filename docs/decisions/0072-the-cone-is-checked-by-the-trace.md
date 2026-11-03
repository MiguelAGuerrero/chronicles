# 0072. The cone is checked by the trace, over 20 m

Date: 2026-11-03 · Status: accepted · Area: navigation, map · Amends [0030](0030-map-stays-north-up.md)

## Context
The owner walked north on the web build (an iPhone, Nov 3) and the cone pointed east: the regression of Nov 1's. The Nov 1 fix lived in `headingOf`, but the cone had since been turned by the live dot's own heading (`liveDot.ts`, its filter's velocity), which checked neither the trace nor the course. Told walking by the motion sensors, the filter loosens, and a few metres of sideways wander pointed it sideways. `headingOf`'s 8 m window was too short for that wander too. No test read the heading the map draws.

## Decision
The owner's call: one rule for the cone (`coneHeading`, `nav/navigator.ts`).
- The trace's direction over the last 20 m (`HEADING_WINDOW_M`) decides. A device course is still kept within 45° of it (0030).
- The live dot's direction is shown only within 20° of the trace's (`DOT_AGREE_DEG`), so gentle curves turn sooner; otherwise the trace's. 45° let 5% of cones through more than 45° off in the simulation; 20°, under 1%.
- Hidden while the dot holds still or before there are 20 m of trace.

## Consequences
- Simulated at 5 m of wander walking north: the cone more than 45° off on under 3% of fixes, from 16% (`heading N` in `heading.test.ts`; the e2e's `heading 5` reads the drawn cone's angle).
- The cone shows about 15 s later at a walk's start, and after a sharp corner it swings once the trace has 20 m of the new street.
- `RouteHint.heading` (a route starts on the street you walk along) reads the same 20 m window.
- Tested on simulated wander only; the owner chose not to share this walk's log.
