---
paths:
  - "src/lib/nav/**"
  - "src/lib/__tests__/{handoff,bridges}.test.ts"
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
  - **Bridges and tunnels** (the concept doc's "Bridges and Open in Maps"
    tab, NB1-NB7; Nov 3, after a route turned the owner off a bridge onto
    the path under it): see "Bridges and tunnels" in `.claude/rules/streets-fog-snapping.md`.
- **Open in Maps** (NH1-NH8, the owner's calls, Nov 3): the destination
  goes to the phone's maps app for walking directions, a fallback when the
  open data is wrong.
  - `nav/handoff.ts` (pure) picks the app and the links: Apple Maps on iOS and
    iPhone or iPad browsers (an iPad asking for the desktop site reports a Mac
    with touch), Android's `geo:` chooser with Google's link after it, Google
    Maps in any other browser. `nav/openInMaps.ts` opens them with
    `Linking.openURL`, never `canOpenURL` first (Android 11+ says no for
    schemes not in `<queries>`).
  - Offered in the blue bar (`nav-handoff`), as the banner action of a route that can't be found
    (`onError(message, dest)`), on the long-press card (`spot-handoff`) and in
    the walk's viewer's More menu (`viewer-handoff`).
  - Called straight from the tap: a browser opens a window only from one.
    Navigation and the walk go on (on the web, tracing pauses while the page
    is hidden, as always). Only the destination leaves the device, on a tap.
  - The hint (`HANDOFF_HINT`) says recording pauses on the web: a hidden
    page takes no fixes. A failed route's banner stays until dismissed or a
    new Go here (`goTo` in `walk.tsx`), its action 44 pt.
  - The e2e replaces `window.open` and reads `window.__opened`.
  - **Not on "Off your route"** (the owner's call, Nov 3, retiring NH4): the
    first re-route clears the chip at once, so its button was rarely there;
    the bar's button covers it.
  - **Android is not a priority** (the owner, Nov 3): its `geo:` chooser
    opens a pin, not walking directions, and stays as it is.
  - **Deferred:** the Explore mark card, the dead-zone nudge, the home's
    Walk here.
  - **Native** (unverified on a device): Apple Maps from the app, the Android
    chooser, and an iPhone Home Screen app's `window.open` reaching Apple Maps.
- **UI.**
  - A blue top bar shows the distance left and where to, an Open in Maps
    button, and a white End pill. It is centered in the 640 column. The route (8 px, a 12 px white
    edge) is drawn only ahead of you, under the trace.
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
- **Time left** (QL17, QL18; `lib/nav/eta.ts`, pure): the walk's own pace (walked
  metres over moving time) once 100 m and 60 s are walked, clamped to 0.7–2.0 m/s,
  else 1.3 m/s. The bar says "450 m · 6 min · Your spot"; its label and the stepped
  announcements say "about 6 minutes left to"; the arrival line is unchanged.
  `useNavigation` takes a `pace` getter from the walk screen for the announcements.
