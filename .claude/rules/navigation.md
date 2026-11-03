---
paths:
  - "src/lib/nav/**"
  - "src/lib/here.ts"
  - "src/lib/__tests__/nav.test.ts"
---
# Navigation

Routing inside a walk (`lib/nav`): walk me back, Go here, the route sources, rules and the navigation UI. The codemap is in `docs/ARCHITECTURE.md`; the decisions and their history are in `docs/decisions/`.

- **Navigation runs inside a walk**, which keeps recording. The routes are
  computed on the device; nothing is sent anywhere.
  - Sources sit behind `RouteSource` (`lib/nav/types.ts`), so suggested spots
    or downloaded regions can add one without touching the navigator.
  - `traceRouteSource` routes along this walk's trace: walk me back, or back
    to a pin.
  - `streetRouteSource` routes over the streets derived from tiles. Before
    routing, `useNavigation` reads the streets between the two ends with
    `collect` (z14, behind the cover), then adds the cached ones.
  - `routeTo` tries the sources in order, and says why when none can.
- **Rules** (`lib/nav/rules.ts`):
  - a street must be within 150 m of each end
  - over 10 km is too far
  - off route means more than 50 m away for 2 fixes; it re-routes at once,
    then at most every 15 s
  - arrival is within 30 m
- **Walk me back takes the shorter way** (the owner's call, Nov 1, after a
  screenshot of a 513 m retrace around a block where a straight street ran
  ~300 m): the trace route and the streets already cached around you are both
  tried (`routeTo(..., 'shortest')`), and the trace is kept unless the streets
  are at least 10% shorter. Re-routes pick the same way.
- **Walk me back never cuts a corner.** A trace shortcut joins two points
  within 30 m only if they are at least 100 m apart along the walk: a loop,
  not the two sides of a corner. The first version cut corners through
  buildings; a screenshot showed it.
- **The destination is kept with the open walk** (meta `nav`), so a reload
  resumes, routing again. From the home, Go here or Walk here saves the
  destination before opening the walk screen. Stop clears it.
- **After the audit.**
  - **Routing:** joins happen per query (`WalkGraph.withExtra`), so the graph
    never grows. Both ends on one street piece link directly. The trace join
    is capped at 150 m; beyond that, the streets take over.
  - **Re-routing:** a failed re-route reads the streets again, at most once a
    minute.
  - **Arrival:** reaching the end of the streets counts as arriving, for a
    spot in a park or a block.
  - **The street read:** its time scales with the views (5 s each, 15–90 s),
    and Cancel stops it between views (`collect(centers, shouldStop)`).
    Following pauses while it runs, so `follow` doesn't fight the camera.
  - **The destination:** it waits for the first fix (a walk just started from
    the home has none). Every error clears it, so a reload doesn't repeat the
    failure, and it is only saved while the walk is still open. One route is
    found at a time.
  - **Screen readers:** the bar is not a live region. The distance is
    announced at 100 m steps (50 m under 200 m), at start and on a new route.
  - **Deferred:** bridges and tunnels still join the streets they cross. The
    fix changes how pieces are cut, and so their ids. It needs its own change,
    with a street-cache purge and a `SNAP_RULES` bump.
- **UI.**
  - A blue top bar shows the distance left and where to, with a white End
    pill. It is centered in the 640 column. The route (8 px, a 12 px white
    edge) is drawn only ahead of you, under the trace.
  - A ring marks the destination, and a long press's spot.
  - A soft 60° cone on the walker shows the way they're going (`headingOf`:
    the last 8 m or more of the trace, once moving at 0.5 m/s or faster; the
    device's course only when it agrees with the trace within 45°, or when
    there is no trace yet and it isn't Android's 0). A phone's course once
    pointed east-north-east while the owner walked south (Nov 1). The map
    stays north-up (the owner's call).
  - Errors are 6 s banners. "Finding a route" is a spinner pill with Cancel.
    Walk me back (`arrow-undo`) shows once you are more than 50 m from the
    start.
  - The spot card sits above the capture row, hiding the pills. A map tap,
    walking 30 m, Back or Escape closes it.
  - A one-time hint after the first 100 m tells you about the long press.
  - From the home, "Walk here" (a star's sheet, or a long press at z12 or
    closer) opens the walk with "Walk started · recording".
  - A click within 1 s of a long press is ignored as its end. The e2e waits
    1.1 s before tapping the map after one.
  - "Off your route" shows as a chip.
  - Arrival shows "You're here: <name>" for 4 s, with a success haptic.
  - The long press on the walk map opens a small sheet: Go here, plus "What
    happened here (N)" when captures are near.
  - Walk me back is the top edge button.
  - A pin's viewer has Go here.
