<!-- Mirror of the "Drawing a gap's way" section of the Claude Docs tab "Filling gaps (spec draft)" (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). The doc is the owner's authoring surface; this file is the greppable copy. When they differ, the doc wins. Last exported: 2026-11-03. -->

# Drawing a gap's way, and a guess that fits the time

A follow-up to Filling gaps (G1-G14). On a walk through Lehigh Parkway (Nov 3), the GPS was out for 8 minutes, and the owner had followed a path that looped, while the app's guess, the shortest way, would have cut across. This slice lets you draw the way you walked across any gap, and makes the guess prefer a way whose length fits the time.

## Decisions

- 2026-11-03, the owner: both drawing and better guessing.
- 2026-11-03, the owner: drawing is taps snapped to the mapped paths (not freehand).
- 2026-11-03, the owner: drawing is on the replay and on the walk screen, from the gap's card.
- 2026-11-03, the owner: drawing works on any gap: one offered, filled by itself, kept, dismissed, or with nothing to offer.

## Criteria

### Drawing (GW)

1. **GW1 · Draw my way.** Every gap's card has Draw my way: offered, filled by itself, kept, dismissed, and a gap with nothing to offer.
2. **GW2 · A gap with no line.** A gap with nothing drawn across it (nothing to offer, or dismissed) is joined by a thin dotted grey line between its two ends. Tapping it opens the card: "Not recorded for N min", with Draw my way.
3. **GW3 · Tapping the way.** Drawing starts at the fix before the gap. Each tap on the map adds a point, and the line runs from the previous point to it along the mapped paths. A tap more than 40 m from any path joins in a straight line. The line so far is drawn dashed in the trace's green, over the map, which still pans and zooms.
4. **GW4 · Undo and Cancel.** Undo removes the last point. Cancel, Back or Escape leaves the gap as it was.
5. **GW5 · Done.** Done joins the last point to the fix after the gap the same way, and keeps the line: it is walked trace from then on (the line, distance, streets, places, the replay), replacing any earlier decision on that gap.
6. **GW6 · Faster than walking.** If the drawn line needs more than 2.5 m/s over the gap's time, the bar says so ("Faster than walking in N min"), and Done still keeps it.
7. **GW7 · Paths read.** The paths around each tap are read from the map tiles in code, once per tile. If they can't be read, taps join in straight lines and the bar says so.
8. **GW8 · While walking.** On the walk screen, drawing stops the map following you and hides the capture row; new fixes don't move the map. Recording goes on.

### A guess that fits the time (GT)

9. **GT1 · The walk's own pace.** Your pace is the median speed of this walk's walked fixes at 0.5 m/s or more, else 1.3 m/s.
10. **GT2 · A way that fits.** The expected distance across a gap is your pace times its time. Among the shortest ways (up to 8) that fit the time allowed, the guess takes the one closest to the expected distance. It keeps the shortest unless another is at least 25% closer. A way that turns at junctions more than two times more than the shortest is never taken: a loop off the way, not a zig-zag round blocks (spare time in town is mostly time stopped).
11. **GT3 · Offered, never filled.** A way chosen for its fit is offered faint, never filled by itself. A gap certain enough to fill by itself (G5) keeps its shortest way.

## Tests

- Unit: snapping taps along paths, straight joins off the paths, Undo, the join to the fix after (GW3-GW5); the faster-than-walking check (GW6); the pace (GT1); a loop chosen over a shortcut when there is time, the shortcut when there isn't, and never filled by itself (GT2, GT3).
- E2E: the dotted line across a dismissed gap opens its card; Draw my way, two taps, Done: the line is kept and joins the trace; Cancel changes nothing (GW1-GW5).
- Native (the drawing bar and taps on MapLibre RN, the dotted layer) has not run on a device.

## Audit (2026-11-03)

14 findings: 11 fixed, 3 deferred, 0 rejected (one, the k-shortest cost, fixed in part).

1. GT2 offered the park drive in the owner's own case: accept. A way that fits keeps to the kinds of way the shortest uses (path or road, at most 25% else). `gap-drawing audit 1`; the park test is back at 8 min and `offer`.
2. Taps spiked out to the raw tap point: accept. A tap near a path is taken onto it. `gap-drawing audit 2`.
3. Join variants used up the 8 ways, and turns counted joins: accept. Searched between the likely way's first and last street points, deduped by the pieces walked, joins left out of turns. `gap-drawing audit 3`.
4. Done before the paths were read kept a straight line: accept. Done waits, "Reading the paths…". `gap-drawing audit 4` (e2e, tiles delayed).
5. A short gap's dots couldn't be tapped: accept. The end zone is at most a quarter of the gap. `gap-drawing audit 5`.
6. The pace read ~45% low from 1 Hz fixes without speed: accept. Measured over a minute with no break. `gap-drawing audit 6`.
7. Drawing hid a memo's Undo pill: accept. Only the capture row hides. Covered by review and typecheck (the gaps e2e has no microphone).
8. Pins took taps while drawing: accept. Pin, memory and mark taps are off while drawing. Covered by review and typecheck.
9. Each tap re-derived and re-routed twice: accept in part. One routing pass gives both lines (`gap-drawing audit 9`); deriving per tile and caching each pair's way: defer.
10. A save's end could reset a new drawing: accept. Cancel is off while saving, and a save's end checks its session. Covered by review.
11. Tile reads: accept in part. A failed read is caught and retried, and "unread" clears on a later success. Reusing tiles across drawings, and the cache offline: defer.
12. The dots ignored the trace's opacity (navigating): accept. Covered by review.
13. The offer depends on when and where it was read (the pace): defer.
14. A gap that changes under a drawing keeps a line that meets no gap: defer.
- UI: the bar sits low (where the capture row or the card's sheet was); its note says the length in words, never a count of points; the "faster than walking" note is amber, not red; following comes back after Done or Cancel; the dots are the bold fog grey. Screen readers can't draw (map taps): defer, with the parent slice's screen-reader item.
