# Plan: drawing a gap's way, and a guess that fits the time

For the owner's review before any code. Spec: `specs/gap-drawing/spec.md` (GW1-GW8, GT1-GT3).

## Files

- `src/lib/gaps/infer.ts` (pure): `movingPace(tr)` (GT1); the k shortest ways within the time budget (Yen's algorithm on the existing `PieceGraph`, k = 8) and `fitWay` (GT2, GT3). `inferGap` takes the pace.
- `src/lib/gaps/draw.ts` (new, pure): the drawing's state (points, Undo) and `drawnWay(points, from, to, segments)`. It joins each pair of points along the paths over the same graph, or straight beyond 40 m (GW3-GW5), and checks the pace (GW6).
- `src/lib/gaps/index.ts`: `readAround(point)`. It reads the z14 tile under a tap and its neighbours in code, once per tile per session, and caches them like the gap reads (GW7).
- `src/components/GapCard.tsx`: Draw my way on every card, plus the card for a gap with no line ("Not recorded for N min") (GW1, GW2).
- `src/components/GapDraw.tsx` (new): the drawing bar ("Tap along the way you walked", Undo, Cancel, Done, the pace warning, the unread notice) (GW3-GW7).
- `src/components/map/WalkMap.{web,native}.tsx` and `types.ts`: two new line layers. `gapLinks` is the dotted grey join across a gap with no line (GW2). `drawing` is the dashed line being drawn (GW3).
- `src/lib/gaps/useLiveStretches.ts`: also returns the gaps, and `keepDrawn` (GW5).
- `src/lib/summary.ts` (`ReplayData.gaps`), `src/app/walk.tsx` and `src/app/replay/[id].tsx`: the dotted joins, the taps, the drawing mode, and on the walk screen no following and no capture row while drawing (GW8). The replay re-snaps after Done, as Keep does.

## Data

No new tables. A drawn way is a kept decision (`gap_fill`, `state: 'kept'`, its line), so it is truth, and the newest decision on a gap wins. That is also how drawing over a dismissed gap brings it back. No migration, no `SNAP_RULES` bump: GT changes only what is offered, which counts for nothing.

## Tests

| Criterion | Test |
|---|---|
| GW3, GW4, GW5 | `gapDraw.test.ts`: `GW3: taps join along the paths`, `GW3: a tap off the paths joins straight`, `GW4: Undo removes the last point`, `GW5: Done joins the fix after` |
| GW6 | `gapDraw.test.ts`: `GW6: faster than walking is flagged, not refused` |
| GW1, GW2, GW5, GW7 | e2e `gapsScenario` (`E2E_ONLY=gaps`): the dotted join on the dismissed Thayer gap opens its card; Draw my way, two taps, Done; the line is kept and the runs drop by one; Cancel leaves it as it was |
| GW8 | e2e: while drawing, the capture row is hidden and the map's centre doesn't follow a new fix |
| GT1 | `gaps.test.ts`: `GT1: the walk's own moving pace` |
| GT2, GT3 | `gaps.test.ts`: `GT2: a loop is offered over a shortcut when the time fits it`, `GT2: the shortcut stays when time is short`, `GT3: a way chosen for fit is never filled` |

## Two calls I'd like you to confirm

1. **The dotted join (GW2).** A gap with nothing across it gets a thin dotted grey line, so there is something to tap. Without it, an empty gap has nothing visible to tap. Recommended: yes.
2. **Taps off the paths (GW3).** A tap more than 40 m from any mapped path joins in a straight line, across grass or a plaza. The alternative is refusing such taps. Recommended: straight lines.

## Deferred

- Freehand finger drawing (not chosen).
- Editing a kept line point by point. Drawing again replaces it.
- Drawing past the gap's two ends, or over a ride or a pause.
- Showing that a kept line was drawn rather than guessed. The card says "kept" either way; a label would need a migration.

## Native, not run on a device

The drawing bar over MapLibre RN, map taps while drawing, the dotted and dashed layers, and reading tiles in code on Hermes.
