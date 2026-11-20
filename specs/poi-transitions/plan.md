# Plan: places come and go with a settle on a walk (PI1-PI14)

## The rule, in one place

A new core module, `src/lib/markMotion.ts` (`// @layer core`):

- `markContext(inputs)`: one string for everything that decides the walk's "?" list **except where you are**:
  Places on, the range (a preview included), the kinds hidden, which places are read (their keys), the route and
  whether you are riding. `useExplore` returns it beside `pins`, memoized on those inputs.
- `markMoves({ prev, next, sameContext, riding, recentlyLeft, inView })` takes the ids shown before (`null` on the
  screen's first sight), the ids now, whether the context is the same as at the last sync, the ids that left within
  `MARK_MOTION.backStillMs` and a test for "on screen". It returns `{ arriving, leaving }`, the ids that move. Every
  other mark comes or goes at once. A change moves a mark only when the context is the same (so the position caused
  it, PI12), not riding (PI13), on screen (PI4), not first sight (PI5) and, for an arrival, not recently left (PI13).
  A mark in both sets stays, whatever changed in its look (PI7). A mark that comes back while still leaving is shown
  once (PI6).
- `MARK_MOTION`: `fromScale: 0.8`, opacity 1 throughout the arrival, a spring of its own with a damping ratio of 0.5
  or more, `leaveMs: MOTION.lift` (scale to 0.8, opacity to 0), `backStillMs: 30_000`.
- `springPeak(spring)` and `springSettleMs(spring)` work these out from the spring's own physics, so PI9 is tested
  on the token rather than on a stopwatch.

`EnterKind` gains `grow`. `Enter` plays it as `Animated.spring` on scale from `fromScale`, on the native driver
(`nativeDriver`), and renders still with Reduce Motion on (PI10), as M9-M12 already do. A new `Leave` (in
`components/Enter.tsx`) scales and fades out over `leaveMs`, then calls `onDone`. With Reduce Motion on it calls
`onDone` at once.

The map passes the context through as a prop, `marksContext`, and compares it at each mark sync, in its effect,
where refs are allowed. No screen state is needed to say why the marks changed.

## Files to touch

- `src/lib/markMotion.ts` (new, core): the rule and tokens above.
- `src/lib/enter.ts`: `EnterKind` adds `grow`; `ENTER.grow` reads `MARK_MOTION`.
- `src/components/Enter.tsx`: `grow` in `Enter`; the new `Leave`.
- `src/components/MarkPinView.tsx`: takes `enter: 'grow'` and `leaving` (the body wrapped in `Leave`).
- `src/components/map/WalkMap.web.tsx`: the mark sync (`markMarkers`) asks `markMoves`, with `inView` from
  `map.getBounds()`.
  - A leaving mark's element gets `pointer-events: none`, `aria-hidden`, `tabindex=-1` and `data-leaving` at once.
    If it held the focus, the map's canvas takes it (PI6). It is re-rendered with `leaving` and removed in `onDone`.
  - The unmount cleanup keeps removing everything at once (PI8).
  - `perfCount('mark:in')` and `perfCount('mark:out')` are added.
- `src/components/map/WalkMap.native.tsx`: `MarkMarkers` keeps leaving marks in state until their `Leave` ends (a
  `leaving` map beside `seenMarks`, changed only on a real change, `sameSeen`). A leaving `Marker` has no `onPress`
  and is hidden from accessibility. On screen is read from the map's visible bounds.
- `src/components/map/types.ts`: `marksContext?: string` on the map's props. With none (Explore), nothing moves (PI11).
- `src/lib/explore/useExplore.ts`: returns `context` from `markContext`.
- `src/app/walk.tsx`: passes `marksContext={explore.context}`.
- `scripts/e2e/journeys/arrivals.js` (new journey) and its row in `scripts/features.js`. The harness's `__enters`
  recorder learns `leave-shrink`.
- Docs:
  - `docs/decisions/<next>`: the second spring (a slight overshoot beside `MOTION.spring`) and the app's first leave
    animation, both the owner's calls (steward S4). Numbered by `npm run book:next-decision`.
  - `.claude/rules/motion-polish.md`: the fifth entrance and its leave, and `marksContext`.
  - `docs/PRODUCT.md`: one line under the walk's Places.
  - `docs/NATIVE_UNVERIFIED.md`.

## Data

None. No truth or cache, no migration, no IndexedDB version.

## Tests per criterion

Unit tests are in `src/lib/__tests__/motion/markMotion.test.ts`. The feature is `motion`, whose source glob gains
`markMotion`. Journey checks are in a new journey, `arrivals` (`scripts/e2e/journeys/arrivals.js`), on the harness's
street grid. It walks past places with Places on, reusing `marks`' walking steps.

| Id | Test |
|---|---|
| PI1 | journey: `PI1: walking into range a "?" expands in, and it leaves as it falls out of range` |
| PI2 | journey: `PI2: a "?" coming within range grows from 80% and settles` (a `grow` recorded, its scale under 1 a frame in, 1 at rest) |
| PI3 | journey: `PI3: a "?" leaving range shrinks before it goes` (a `leave-shrink` moving, the marker gone after `leaveMs`) |
| PI4 | unit: `PI4: off screen, a mark comes and goes at once` |
| PI5 | unit: `PI5: first sight moves nothing`; journey: `PI5: opening the walk and reloading plays no grow` |
| PI6 | unit: `PI6: a mark back while leaving is shown once`; journey: `PI6: a leaving "?" takes no tap or focus, is hidden from a screen reader, and hands a held focus to the map` |
| PI7 | unit: `PI7: a mark that stays never arrives again` (spread, name hidden, revealed, found, faint to full), `PI7: a reveal or find mid-arrival turns or pulses`; journey: `PI7: a reveal still turns and a find still pulses, with no grow` |
| PI8 | journey: `PI8: leaving the walk screen takes the marks away at once` |
| PI9 | unit: `PI9: from 80%, opaque, damping ratio 0.5 or more, peak 1.03 or less, settled within 400 ms`, `PI9: leaving takes no longer than MOTION.lift`, `PI9: a change's arrivals are one set` |
| PI10 | journey: `PI10: with Reduce Motion, marks come and go still` (`emulateMedia({ reducedMotion: 'reduce' })`) |
| PI11 | unit: `PI11: with no context nothing moves`; journey: `PI11: Explore's "?" and the pins and stars play no grow or leave` |
| PI12 | unit: `PI12: the context holds Places, range, kinds, places read, route and riding, never the position`, `PI12: a changed context moves nothing`; journey: `PI12: switching Places on draws its "?" still` |
| PI13 | unit: `PI13: a mark back within 30 s arrives still`, `PI13: riding moves nothing` |
| PI14 | journey: `PI14: a fix that brings marks in renders the walk no more than before and makes each marker once` (`perfCount` `marker:mark` against `mark:in`, the walk's render count against the same walk with no marks moving) |

## Testing's size

**small**: one look on one screen, with no wiring between screens and no storage. The journeys are:

- `arrivals` (new): about 3 minutes. It runs alone until green.
- `marks`: about 3 minutes. It walks past marks and reads `[data-testid=mark-pin]`, so a leaving mark still in the DOM
  could change its counts. It needs a `:not([data-leaving])` filter if so.

That is about 6 minutes. Grep for `mark-pin` also names `atlas`, `carousel`, `curiosities`, `dense`, `into`, `memories`,
`modes`, `nudge` and `small-places`. Explore's are unchanged (no context, PI11), and the walk's read marks at rest,
after their own waits, so they are not run. A failure there would not be chased (0223).

## Deferred

- Explore's "?" (the owner's call, Nov 20: walking range only).
- The Places dots, capture pins, walk stars and storefront names: not asked for.

## Native paths that will not run on a device

These have never run on a phone:

- `Enter`'s `grow` and `Leave` on the native driver inside a MapLibre RN `Marker`;
- `MarkMarkers` keeping leaving marks;
- a leaving `Marker` without `onPress`;
- the visible-bounds test.

Each becomes a `**Do:** … **Expect:** …` item in `docs/NATIVE_UNVERIFIED.md` (PI2, PI3, PI6, PI10).

## Cost

- **Reads and writes:** none.
- **n at scale:** `visibleMarks` keeps the nearest 8 within range, plus the faint ones on a route. A 4-hour walk
  brings a few arrivals a minute at most, and PI13 holds the edge's flicker still.
- **Per fix:** one string compare and one set difference over a dozen ids. The context string is memoized on its
  inputs, never on the position.
- **Per frame:** only the running springs. Each arrival is one spring for at most 400 ms. On the web, `Animated`
  without the native driver writes the element's style per frame without a React render. Each leave is one 180 ms
  timing.
- **Harness:** `scripts/perf-walk.js` before the first code commit and again at the end, and PI14's `perfCount` keys
  in the journey. Native is device only, as an item in `docs/NATIVE_UNVERIFIED.md`.

## Goal to control

No control is added, moved or changed. The goal ("notice a place to find as it comes within reach") has no row in
the goal-to-control matrix: it is a look, not an action. The finding criterion has nothing to find (PI1).

## Against precedent

- maplibre fades labels; we scale, because the owner asked for a scale. markercluster and MapKit scale or move too.
- None of the three overshoots by default. We do, on the owner's pick of a spring settle, kept slight (peak 1.03) so
  it reads as a settle rather than a bounce (restraint).
- Like maplibre and markercluster, we do not animate a first load or a set added at once.

## Where the owner will look first

On a walk with Places on, the "?" ahead grow in as they come within range, and shrink away behind. Defaults that make
it quieter, any of which the owner can overrule:

- the overshoot slight (the owner agreed);
- no stagger;
- no haptic;
- the leave shorter than the arrival;
- a mark back within 30 s, and anything while riding, still;
- nothing at all with Reduce Motion.

## Steward (Nov 20): no breaches, five drifts, one tone; all accepted

- S1 (a catch-all moved far more than the owner's triggers): accepted. Only a new position moves a mark (PI12). The
  owner then narrowed the slice to the walk.
- S2 (marks flickering at the range's edge): accepted, PI13.
- S3 (a 0.6 to 1.06 scale reads as a bounce): accepted. From 80%, peak 1.03, damping ratio 0.5 or more (PI9). The
  owner agreed.
- S4 (no decision record): accepted, under Files to touch. The precedent is in `docs/research/adjacent-apps.md`.
- S5 (a held focus stranded): accepted, PI6.
- S6 (the Verb overclaimed): accepted. The spec says it is a look.
