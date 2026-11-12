# Plan: tap to capture a place, and a quiet pass-by

## Files to touch (about 12, a slice, not a fix)

- `src/lib/explore/explore.ts` (core): add `EXPLORE_RULES.passDefault/passMin/passMax/passStep`, `clampPass`; `passedPlaces` / `passedAlong` take `passM` and use it instead of `revealM`. `findFor` / `findCandidates` stay (used by the armed find's 60 m check) but no caller finds on its own.
- `src/lib/explore/settings.ts` (shell) + `src/lib/meta.ts`: `explore_pass` key, `passM` in `ExploreSettings`, saved and loaded like `explore_range`.
- `src/lib/explore/useExplore.ts`: drop the capture-driven find and the `asked`/`choice`/`choose` question; add `armed` (a place key, per walk), `arm(item)`, `disarm()`; the next fresh capture finds the armed place via `record`.
- `src/lib/explore/momentFind/{shell,index}.ts` and `src/components/walk/useReady.tsx`: a loose moment stops finding (TC2); `findForMoment` is removed with its caller.
- `src/app/walk.tsx`: "Capture here" on the `mark-card` (testID `mark-capture`), a quiet armed line (`armed-line`, with Cancel), the `find-choice` chip removed.
- `src/components/ExploreSettings.tsx`: the pass-by distance row (a stepper like the range), copy in words.
- Callers of `passedPlaces`/`passedAlong`: `src/lib/ceremony/rhythm.ts` and the walk card, pass `passM`.
- Docs: `.claude/rules/explore-and-discovery.md` (Finding, Settings), `docs/PRODUCT.md` (Explore mode), `docs/DEFERRED.md`, a decision `0155`, `docs/STATUS.md`, `docs/NATIVE_UNVERIFIED.md`.

## Data

No new truth or cache, no migration (one meta key). `SNAP_RULES` is not touched: finds and passes are read at view time from the trace, not derived and cached. The walk's pass-by distance is written to meta (`walk_pass:<id>`) when it starts, and its card and replay read that, so a later setting change never rewrites an old walk (TC9, steward S1). A walk without it reads at the default.

## Tests per criterion (new feature folder: none; existing `explore`)

- `src/lib/__tests__/explore/tapToCapture.test.ts`: TC1 (core + the `useExplore` decision seam, a shell test over `fakePorts()`), TC2 (`createMomentFind` removed or returns null: test the port), TC4 (arm, first capture finds, disarm; replace and clear), TC6, TC7 (`clampPass`, `loadSettings` round trip), TC8 (`visibleMarks` unchanged).
- `scripts/e2e/journeys/marks.js` (existing journey): TC3 (card shows "Capture here"; armed line shows; a plain capture near a place finds nothing; a capture after arming finds), TC5.
- Spec ids go in `scripts/features.js` (`explore` specs list).

## Deferred, and why

- Walks recorded before this slice read the default 8 m, not the 60 m they were shown with: noted in DEFERRED.
- Arming only from the walk's place card; the Explore tab's cards and a pin's viewer keep no capture button (not asked).

## Native

None new; the haptics and capture stack are reused. Armed state is a React state on the walk screen; add one NATIVE_UNVERIFIED line (tap "Capture here", take a photo, see it found).

## Screens: goal to control

- **Tie this moment to that place on purpose.** Rare, when standing at a place that was marked; a button in the place card's action row beside Go here (matrix: primary action on an item's card; precedent: the card already holds Go here and Open in Maps). The armed line is a quiet status, not a modal, with Cancel (44 pt).
- **Say how close counts as passing.** Set once; a stepper in the Explore settings beside the range (the same row pattern).
- **Plain capture** keeps its place at the edge, one tap, nothing added.

## Steward (triaged)

- S1 replay drifts with the setting: accepted, TC9.
- S2 armed line register: accepted, in TC3 (plain ink, above the stack, never moves it).
- S3 stale arming: accepted, TC4 (clears on capture, walk end, 60 m away).
- S4 words only: accepted, TC7.

Open for you: arming is a state on the walk screen, not a new capture screen. Say if you would rather the card carry Photo/Voice/Note buttons itself.
