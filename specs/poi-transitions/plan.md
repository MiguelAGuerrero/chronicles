# Plan: places come and go with a settle (PI1-PI14)

## The rule, in one place

A new core module, `src/lib/markMotion.ts` (`// @layer core`), decides for each sync of the "?" marks:

- `markMoves(prev, next, cause, recent)` takes the ids shown before (`null` on the screen's first sight), the ids
  now, the cause of the change (`'zoom'`, `'fix'` or `'other'`) and the ids that left within `MARK_MOTION.backStillMs`.
  It returns `{ arriving, leaving, staying }`. Only `'zoom'` and `'fix'` move anything (PI13); `prev` null moves
  nothing (PI5); a mark back within `backStillMs` arrives still (PI14). A mark in both sets stays, whatever changed in
  its look (PI7). A mark that comes back while leaving is taken out of `leaving` and shown once (PI6).
- `MARK_MOTION` holds the tokens: `fromScale: 0.8`, opacity 1 from the first frame, a spring of its own with a
  damping ratio of 0.7 or more, `leaveMs: MOTION.lift` (scale to 0.8 and opacity to 0), `backStillMs: 30_000`.
- `springPeak(spring)` and `springSettleMs(spring)` work these out from the spring's own physics, so PI9's limits are
  tested on the token rather than on a stopwatch.

`EnterKind` gains `grow`. `Enter` plays it as `Animated.spring` on scale from `fromScale` with the opacity from 0,
on the native driver (`nativeDriver`), and renders still with Reduce Motion on (PI10), as M9-M12 already do. A new
`Leave` (in `components/Enter.tsx`) scales and fades out over `leaveMs`, then calls `onDone`. With Reduce Motion on
it calls `onDone` at once.

## What caused a change (PI5, PI13, PI14)

The map cannot tell a zoom from a first load or a kind switched on by itself, so the screen says why its marks
changed, through a new prop on `WalkMap`, `marksCause: 'zoom' | 'fix' | 'other'`, set in the same render as the new
marks:

- **Explore** says `'zoom'` when the settled camera's `zoomHalf` changed since the last marks and the selected area,
  Places, kinds and found set did not. Anything else is `'other'`. Its first marks after the map mounts (open, back
  from blur) are first sight.
- **The walk screen** says `'fix'` when the change came from a new position (the range's centre moved) and the walk is
  not riding. The range preview, a route, a kind or Places switched are `'other'`.

Whether a settled **pan** on Explore counts as a zoom is the owner's question below. Until it is answered, a pan is
`'other'`.

## Files to touch

- `src/lib/markMotion.ts` (new, core): the rule and tokens above.
- `src/lib/enter.ts`: `EnterKind` adds `grow`; `ENTER.grow` reads `MARK_MOTION`.
- `src/components/Enter.tsx`: `grow` in `Enter`; the new `Leave`.
- `src/components/MarkPinView.tsx`: takes `enter: 'grow'` and `leaving` (wraps the body in `Leave`).
- `src/components/map/WalkMap.web.tsx`: the mark sync (`markMarkers`). It asks `markMoves` with the ids it showed. A
  leaving mark's element gets `pointer-events: none`, `aria-hidden`, `tabindex=-1` and `data-leaving` at once
  (PI6). It is re-rendered with `leaving` and removed in `onDone`. The unmount cleanup keeps removing everything at
  once (PI8). `perfCount('mark:in')` and `perfCount('mark:out')` are added.
- `src/components/map/WalkMap.native.tsx`: `MarkMarkers` keeps leaving marks in state until their `Leave` ends (a
  `leaving` map beside `seenMarks`, changed only on a real change, `sameSeen`). A leaving `Marker` has no `onPress`
  and is hidden from accessibility. `marksCause` is read the same way.
- `src/components/map/types.ts`: `marksCause?: 'zoom' | 'fix' | 'other'` on the map's props.
- `src/app/(tabs)/explore.tsx`, `src/app/walk.tsx`: work out and pass `marksCause` (the cause rule itself in `markMotion.ts`, `marksCauseOf`, tested).
- `docs/decisions/<next>`: the second spring (a slight overshoot beside `MOTION.spring`) and the app's first leave animation (steward S4), numbered by `npm run book:next-decision`.
- `scripts/e2e/journeys/arrivals.js` (new journey) and its row in `scripts/features.js`.
- Docs: `.claude/rules/motion-polish.md` (the fifth entrance and its leave, `marksCause`), `docs/PRODUCT.md` (one
  line under Explore's Places and the walk's Places), `docs/NATIVE_UNVERIFIED.md`.

## Data

None. No truth or cache, no migration, no IndexedDB version.

## Tests per criterion

Unit tests in `src/lib/__tests__/motion/markMotion.test.ts` (feature `motion`, whose source glob gains
`markMotion`). Journey checks in a new journey, `arrivals` (`scripts/e2e/journeys/arrivals.js`). It covers Explore
on the harness's street grid, zooming between a neighbourhood's dots and its "?", then a walk past marks, reusing
`marks`' walking steps. The harness's `__enters` recorder already reads every `enter-*` test id. `Leave` gets
`leave-shrink` and the recorder learns it.

| Id | Test |
|---|---|
| PI1 | journey: `PI1: a "?" scales in and out on Explore and on the walk` (both screens' arrivals and leaves seen moving) |
| PI2 | journey: `PI2: zooming in, each "?" grows from smaller and settles` (a `grow` recorded per new mark, its scale under 1 a frame in, 1 at rest) |
| PI3 | journey: `PI3: zooming out, each "?" shrinks before it goes` (a `leave-shrink` moving, the marker gone after `leaveMs`) |
| PI4 | journey: `PI4: walking into and out of range, the "?" grow and shrink` |
| PI5 | unit: `PI5: first sight moves nothing`; journey: `PI5: opening Explore and the walk, and coming back to the tab, plays no grow` |
| PI6 | unit: `PI6: a mark back while leaving is shown once`; journey: `PI6: a leaving "?" takes no tap or focus, is hidden from a screen reader, and hands a held focus to the map` |
| PI7 | unit: `PI7: a mark that stays never arrives again` (spread, name hidden, revealed, found, faint to full), `PI7: a reveal or find mid-arrival turns or pulses`; journey: `PI7: a reveal still turns and a find still pulses, with no grow` |
| PI8 | journey: `PI8: leaving the screen takes the marks away at once` |
| PI9 | unit: `PI9: from 80%, opaque, damping ratio 0.7 or more, peak 1.03 or less, settled within 400 ms`, `PI9: leaving takes no longer than MOTION.lift`, `PI9: a change's arrivals are one set` |
| PI10 | journey: `PI10: with Reduce Motion, marks come and go still` (`emulateMedia({ reducedMotion: 'reduce' })`) |
| PI11 | journey: `PI11: dots, pins, stars and the find's pulse are as before` (no `grow` or `leave-shrink` on any but `mark-pin`; the dots' paint unchanged) |
| PI13 | unit: `PI13: only a zoom or a fix moves a mark` (`markMoves` with `'other'`; `marksCauseOf` for kinds, Places, area, route, range preview); journey: `PI13: switching Places on draws its "?" still` |
| PI14 | unit: `PI14: a mark back within 30 s arrives still`, `PI14: riding is never a fix cause` |
| PI12 | journey: `PI12: a zoom to "?" renders Explore no more than before and makes each marker once` (`perfCount` `marker:mark` against `mark:in`, Explore's render count against the `dense` journey's budget) |

## Testing's size

**small** (one look on two screens, no wiring between screens, no storage). The journeys are:

- `arrivals` (new): about 4 minutes. It runs alone until green.
- `marks`: about 3 minutes. It walks past marks and reads `[data-testid=mark-pin]`, so a leaving mark still in the DOM
  could change its counts. It needs the `:not([data-leaving])` filter if so.
- `dense` and `atlas`: about 4 minutes each. They count "?" pins on Explore after zooms, which leaving marks could
  inflate for 180 ms.

That is about 15 minutes in all. Grep for `mark-pin` also names `carousel`, `curiosities`, `into`, `memories`,
`modes`, `nudge` and `small-places`. They read marks at rest, after their own waits, so they are not run. A failure
there would not be chased (0223).

## Deferred

- The Places dots (a GL circle layer): animating each dot means a data-driven radius per feature over time. That is
  per-frame `setData` work, which the owner did not ask for and the render budget would pay for. They stay as they
  are (the owner's answer, Nov 20).
- Capture pins, walk stars and storefront names: not asked for.

## Native paths that will not run on a device

`Enter`'s `grow` and `Leave` on the native driver inside a MapLibre RN `Marker`; `MarkMarkers` keeping leaving
marks; a leaving `Marker` without `onPress`; `marksCause` on both screens. Each becomes a `**Do:** … **Expect:** …`
item in `docs/NATIVE_UNVERIFIED.md` (PI2, PI4, PI6, PI10).

## Cost

- **Reads and writes:** none.
- **n at scale:** Explore shows "?" only in view and only where they have room (`areaMapMarks`), so a dense
  neighbourhood's zoom brings a few dozen at most. On a walk, the "?" within 300 m number a handful, and a 4-hour
  outing adds a few per minute. Each arrival is one spring for about 400 ms. On the web, `Animated` without the
  native driver writes the element's style per frame without a React render. Each leave is one 180 ms timing.
- **Per frame:** only the running springs. Nothing runs per fix or on a tab's focus beyond today's sync.
- **Harness:** `scripts/perf-explore.js` before the first code commit and again at the end (long tasks and worst frame
  over a zoom from dots to "?"), and PI12's `perfCount` keys in the journey. The native cost is device only, as an
  item in `docs/NATIVE_UNVERIFIED.md`.

## Goal to control

No control is added, moved or changed. The goal ("notice a place to find as it comes within reach") has no row in
the goal-to-control matrix: it is a look, not an action. The finding criterion has nothing to find (PI1).

## Against precedent

- maplibre fades labels; we scale, because the owner asked for a scale. markercluster and MapKit scale or move too.
- None of the three overshoots by default. We do, on the owner's pick of a spring settle, kept slight (peak 1.03) so
  it reads as a settle rather than a bounce (restraint).
- Like maplibre and markercluster, we do not animate a first load.

## Where the owner will look first

On Explore, select a neighbourhood at town scale and pinch in: the dots give way to "?" that grow in and settle;
pinch out and they shrink away. On a walk with Places on, the "?" ahead grow in as they come within range. Defaults
that make it quieter, any of which the owner can overrule: the overshoot slight (peak 1.03, from 80%; the steward's S3, which the owner can widen); no stagger; no haptic; the
leave shorter than the arrival; nothing at all with Reduce Motion.

## Steward (Nov 20): no breaches, five drifts, one tone; all accepted

- S1 (the catch-all moved far more than the owner's two triggers): accepted. `marksCause` replaces `marksLive`;
  PI13 holds that Places, kinds, an area, a route and the range preview draw marks still. A pan is the owner's call.
- S2 (marks flickering at the range's edge on a walk): accepted, PI14 (back within 30 s still; nothing while riding).
- S3 (a 0.6 to 1.06 scale reads as a bounce): accepted. From 80%, damping ratio 0.7 or more, peak 1.03 (PI9).
- S4 (no decision record): accepted, under Files to touch. The precedent is in `docs/research/adjacent-apps.md`.
- S5 (a held focus stranded): accepted, PI6.
- S6 (the Verb overclaimed): accepted; the spec says it is a look.
- Silent 2 (a gap between dot and "?"): the arrival is opaque from its first frame (PI9).
- Silent 3 (reveal or find mid-arrival): the turn or pulse wins (PI7).
