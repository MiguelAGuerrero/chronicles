<!-- Mirror of the Claude Docs tab "Quality of life (spec draft)" (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). The doc is the owner's authoring surface; this file is the greppable copy. When they differ, the doc wins and this file needs a re-export. Last exported: 2026-11-03. -->

# Quality of life: map staples

Nov 3, 2026 · @Miguel Guerrero

Three things every walking map has and ours didn't: a mark where the walk began and ended, a scale bar, and a button that centres the map on you. Small, spec-first, test-first, on every map at once.

## The owner's calls (Nov 3)

- From the quality-of-life list, this round takes the map staples only. Walk basics (km or miles, time left, a Settings link), Chronicle basics (rename later, edit a note, photo thumbnails on pins, month headers) and the larger four (keep awake, GPX, the street you're on, dark mode) wait.
- Nothing is a score: the markers say where, never how far or how well.
- The map stays north-up; no compass.
- Round 2 (Nov 3): the walk basics. A units setting in the drawer, time left in the navigation bar, and a way to Settings from the "Not recording" chip. Rename later, note editing, pin thumbnails and month headers are round 3.

## Criteria

Start and end markers

1. **QL1** Every map that draws a trace (the walk screen, Navigate's live view of a minimized walk, the replay, the day replay) marks where the walk began: a white disc with a thick ring in the trace's green, at the first point of the trace's first run. Chronicle draws stars and no trace, so it shows none. A walk that began on a ride is marked where the walking began (accepted).
2. **QL2** Once a walk has ended (the replay, the day replay), a second marker sits at the last point of the trace's last run: a white disc with a thick ring in the walked orange. A live walk has no end marker; the dot is its end.
3. **QL3** The markers sit above the trace and under the capture pins and the walker, and never take a tap: a pin at the start still opens. They go with the trace: hidden while navigating, faint with it in the replay's first beats. With no fix yet there is neither.
4. **QL4** `traceEnds(runs, ended)` in `lib/traceEnds.ts` is pure: the start is the first point of the first non-empty run, the end the last point of the last non-empty run when `ended`, else null; both null with no points. Unit-tested. On web the map's container carries `data-ends="lon,lat|lon,lat"` (the end half empty when there is none) for the e2e.

Scale bar

5. **QL5** Every map shows a scale bar in its bottom-left corner: a line with end ticks and a label for a round length (1, 2 or 5 times a power of ten metres; from 1,000 m said in km, "1 km", "2 km"), the longest that fits in 100 px at the map's zoom and the view's latitude.
6. **QL6** `scaleBar(metersPerPixel, maxPx)` in `lib/scaleBar.ts` is pure and returns the metres, the width in px and the label; the width never exceeds `maxPx` and the metres are the largest round value that fits. Unit-tested at z16, z12 and z2, at the equator and at 60°.
7. **QL7** The bar follows the zoom: the map's own view updates (every 0.05 of a zoom level) redraw it, and at any settled zoom its width is within 5% of metres divided by metres per pixel. On web it is `[data-testid=scale-bar]` with `data-m` (the metres), and its line is `[data-testid=scale-line]`, whose measured width is the bar's.
8. **QL8** Each screen keeps the bar clear of its own bottom UI through the map's `scaleInset` prop (`{ bottom, left }`): the walk screen above its bottom strip, Navigate above the drawer and the capture row at their resting height, Explore and Chronicle above the sheet at its resting height, the replay and the day replay above the card. It is never pressable (pointer events off), hidden from screen readers (decorative), and reads at AA: ink text on a white pill, like the status chips.

Locate me

9. **QL9** Navigate (with no walk open) and Explore each show a Locate button: a 44 pt round edge button with the `locate-outline` icon at the map's right edge, inside the 640 column on wide screens, above the drawer or sheet and the capture row, `accessibilityLabel` "Center on your position", `testID` `locate`. Navigate hides it while a walk is open: the live view follows the walk, and the walk screen has Recenter.
10. **QL10** A tap reads one fresh fix through `locateOnce` (never a cached position, however recent: a tap asks where you are now; a fix within 50 m, or 10 s, then the watch is cleared; nothing tracks after), keeps it as the last fix, shows the dot there (Explore gains the walker dot Navigate has) and fits 250 m around it, as Navigate does on focus, whatever the distance from the last fix. The fit centres the fix in the view above the drawer or sheet, so the canvas's own middle sits a little off it; the e2e checks the fix lies within the 250 m framed.
11. **QL11** While the fix is read the button shows busy (a spinner in the icon's place, disabled); a second tap does nothing. Denied location shows the error banner a moment's placement shows, with Open Settings where the platform has it. A timeout or no location at all says "Couldn't find your position" in a dismissable banner.
12. **QL12** The fix is a one-off: on web every `watchPosition` the tap began is cleared once it resolves, and the map keeps later pans (no follow). On web the map's container carries `data-center="lon,lat"` beside `data-zoom`, and `data-walker="lon,lat"` when a dot is drawn, for the e2e.

Round 2: walk basics (the owner's call, Nov 3). Distances in km or miles

13. **QL13** One units setting, km or miles, kept in meta `units`. Until it is set, the default follows the device's locale region (through `Intl`): US, GB, LR and MM get miles, everyone else km. `lib/units.ts` is pure: `unitsForLocale(locale)`, and a module store (`getUnits`, `setUnits`, `onUnits`) that every formatter reads synchronously. It is loaded from meta at launch (`_layout.tsx`); until then the locale default shows.
14. **QL14** `formatDistance` honours the units: metric as today ("450 m", "1.2 km"); imperial says whole feet under 0.1 mi ("450 ft") and miles with one decimal from there ("0.1 mi", "1.2 mi"). Every distance the app shows goes through it: the walk strip, the recording bar, the replay card, the walks list rows, the navigation bar and its announcements, Navigate's destination line, the quiet lines. Unit-tested.
15. **QL15** The scale bar follows the units: imperial shows feet in 1, 2 or 5 × 10^n up to 2,000 ft, then miles in 1, 2 or 5 × 10^n ("500 ft", "1 mi"), the longest that fits; `scaleBar(mpp, maxPx, units)`. Unit-tested.
16. **QL16** The setting is a "Distances" section in Navigate's drawer at full, after Reminders and alerts: a two-way segment like Mode (radios `units-km` "km" and `units-mi` "miles"), saved as it changes. Every screen showing a distance redraws on a change without a reload (`useUnits()` in the components that format).

Time left while navigating

17. **QL17** The blue bar shows the time left beside the distance: "450 m · 6 min · Your spot"; under a minute, "< 1 min". `timeLeftMs(leftM, walkedM, movingMs)` in `lib/nav/eta.ts` is pure: the walk's own pace (walked metres over moving time, pauses left out) once at least 100 m and 60 s have been walked, clamped to 0.7–2.0 m/s; before that 1.3 m/s. Unit-tested.
18. **QL18** The bar's accessibility label and the stepped announcements say it too ("450 m, about 6 minutes left to Your spot"); the arrival line is unchanged. The `nav-left` text carries it for the e2e and refreshes at least every 5 s (the screen's `now`).

Location denied on the walk

19. **QL19** While the recorder reports an error, the "Not recording" chip is a button (`status-chip`, role button, label "Not recording. Why?") that brings back the recorder's sticky notice: on a phone with Open Settings, on the web the message saying where to allow it. The notice shows on its own when the error first arrives (as today) and again on every tap after a dismissal.
20. **QL20** When the app comes back to the front while the recorder is in error and the walk is not paused (the screen's `resumed` counter), the walk screen tries to start the recorder again, once per return, the way Resume does: a permission granted in Settings takes effect without restarting the walk. A failed retry keeps the error and shows no second notice.
21. **QL21** Navigate's own fix on focus stays quiet when denied (Locate is the loud path), unchanged.

Round 2 tests: `units.test.ts` (QL13–QL15), `eta.test.ts` (QL17); the `qol` e2e grows: the drawer's Distances segment switches the scale bar and the destination line to feet or miles and back (QL14–QL16), a destination set by a long press before Start gives a bar with minutes (QL17, QL18), and a fresh context with no geolocation permission gets the tappable chip and its notice (QL19). QL20 is covered by typecheck and the unit of its guard only; on native it is unverified.

## Routes and data

No new storage, routes or dependencies. Two new pure modules (`lib/traceEnds.ts`, `lib/scaleBar.ts`), three new map props (`ended`, `scaleInset`, and the start and end drawn from `trace`), and one button per tab.

## Tests

- Unit: `traceEnds.test.ts` (QL4), `scaleBar.test.ts` (QL6).
- E2E: `E2E_ONLY=qol` in `scripts/e2e-web.js`, a short fresh-browser scenario: Locate on Navigate and Explore (QL9-QL12), a walk of a few fixes (QL1, QL3, QL5, QL7), its replay (QL2), and the bar on every tab (QL8). It runs alone during the work and with the whole e2e at the end.

## Deferred

- Everything else on the quality-of-life list (above).
- Scale bar units follow the km or miles setting once there is one.
- A tap on the end marker opening the card's "what happened here".

## Native (unverified on a device)

The two circle layers and the scale overlay on MapLibre RN, `locateOnce` on expo-location, and the edge button over the native sheet.
