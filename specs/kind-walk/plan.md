# Kind walk: plan (KW1-KW14)

Written 2026-11-05 for the owner's review. No code is written until they say go. Unverified: I read `AtlasCard.tsx`,
`KindStrip.tsx`, `atlas.ts`, `pockets.ts`, `nav/types.ts`, `walk/ahead.ts` and `units.ts`; I have not read `useNavigation`,
`walkNav`, the settings stores or `index.tsx` beyond the `onWalkAt` call, so file names below are proposals to confirm.

## The shape in one paragraph

A kind row under "What's here" becomes a button. It expands to a small panel: one sentence of what the walk is, its distance,
the walkability sentence, a shorter and a longer step, and a "Walk this way" button. The walk is made from the area's cached
atlas profile (its `marks` and places already carry category and position, `AtlasProfile.marks`): the kind's positions are
binned and smoothed the way `findPockets` does (TP4), the way is a chain of `RouteSource` legs from the walker (or the area's
point if they are far) through the densest cells until the budget is spent, then walkability is read along it. It names no
place. Accepting saves it as the navigation destination and calls `showWalk()`; from there it is a normal navigated walk.

## Files

New, in `src/lib/kindWalk/` (feature `kind-walk` in `scripts/features.js`; rule file `.claude/rules/kind-walk.md`):

| File | Layer | What |
|---|---|---|
| `density.ts` | core | KW5, KW6: the cells of a kind from places (the `findPockets` shape, for one category), densest first; no names |
| `plan.ts` | core | KW4, KW7-KW9: the chain of waypoints within a budget from a start; the distance in the number of `Route`s' `lengthM` summed; `startWords` (KW9) |
| `words.ts` | core | KW2, KW3, KW7, KW10, KW11: every sentence, no digit except the distance, never minutes (a test greps for `min`, `h`, `ETA`, `pace`) |
| `settings.ts` | core | the two settings' types, defaults (2000 m, `warn`), steps (1, 1.5, 2, 3, 5 km; miles from the unit) |
| `settingsStore.ts` | shell | meta keys `kindwalk_budget_m` and `kindwalk_walkability`; same shape as `unitsStore` (SH1-SH9 factory over `fakePorts()`) |
| `suggest.ts` | shell | reads the profile, the streets (`collect`, as navigation does) and the walkability tiles (`walkApp`), returns a `Suggestion`; the app instance the card calls |
| `useKindWalk.ts` | view | the hook for the panel: loading, thin, offline, a suggestion |

Touched: `src/components/atlas/KindStrip.tsx` (`KindRow` becomes a `Pressable`, KW1), `AtlasCard.tsx` (the open panel, one at a
time), a new `src/components/atlas/KindWalkPanel.tsx`, `src/app/(tabs)/index.tsx` (the accept handler, beside `onWalkAt`),
`src/components/StartSettings.tsx` (the budget stepper and the warn / don't-suggest toggle, in the units it already shows),
`docs/PRODUCT.md`, `docs/STATUS.md`, `docs/DEFERRED.md`, `docs/NATIVE_UNVERIFIED.md`, `docs/decisions/README.md`.

## Route source (KW5, KW13, and the other worktree)

Use `RouteSource` (`lib/nav/types.ts`) through `routeTo`, never a second router. Waypoints are the density cells' centres; the
chain stops when the next leg would pass the budget (a tolerance of 25%, no search for the "best" loop). Whatever the
suggested-routes worktree adds plugs into the same seam; I will not touch `lib/nav` beyond importing it. Before code I will
check that worktree's branch for anything that already does this.

## Data

No truth, no cache table, no migration, no IndexedDB bump. The suggestion is derived on open from the cached profile and the
streets and recomputed each time (KW14). Two settings go in `meta` (typed, `lib/meta.ts` has the key registry; the
`arch/meta.test.ts` direct-call trap applies: call `getMeta`/`setMeta` from the store file, not through a wrapper).
Changing nothing about how places are snapped, so no `SNAP_RULES`, `STREET_CODE` or `LANDING_CODE` bump.

## Tests (one per criterion, written first, named by id)

Unit, `src/lib/__tests__/kind-walk/`:

| Id | Test |
|---|---|
| KW2 | `words.test.ts`: a thin profile and a kind of step 0 give the "none" words and no suggestion |
| KW3 | `suggest.test.ts` (shell over `fakePorts()`): no routable streets gives the "can't here" sentence, not a route |
| KW4 | `plan.test.ts`: the result type holds one route; a property test that the plan never returns an array of alternatives |
| KW5 | `density.test.ts`: cells ordered by density; ties by a fixed rule; no input field for rating or popularity |
| KW6 | `plan.test.ts`: the suggestion has no place name or key; the map overlay carries the path only |
| KW7 | `words.test.ts`: for km and miles, the line is "about N km/mi"; a grep over every sentence for minutes, ETA, pace and "fast" finds none |
| KW8 | `plan.test.ts`: the length is within 25% of the budget; a step changes the one suggestion |
| KW9 | `words.test.ts`: far start says the distance; near start says nothing |
| KW10 | `words.test.ts`: the sentence for foot only, for a car-oriented stretch (street named, no digit), and for no data (says unknown) |
| KW11 | `suggest.test.ts`: warn offers it with the stretch; don't suggest leaves it out; none left gives the sentence |
| KW14 | `settingsStore.test.ts` over `fakePorts()`: only the two keys are written; nothing else touches `ports` |

E2E, a new journey `scripts/e2e/journeys/kindwalk.ts` (screens): KW1 (tap opens, tap closes, no new screen), KW12 (the button
opens the walk screen ready with a route, nothing about a tour on it), KW13 (move the fake GPS off the way: only the quiet
re-route happens, no banner or notification), KW7 (no minute on the screen). The journey runs against the fake street grid.
The settings controls get a check in the existing `qol` journey's settings step.

## Folded in from the vision gate

All 14 criteria carry the gate's block. `npm run check:vision` should pass with the spec's `Verdict:` line; the words test is
the mechanical guard for KW7 and for nothing in the app being a tally.

## Deferred (and why)

See the spec's "Out": destination routes, place-to-place quick actions, avoiding car-oriented streets, alternatives, previews
elsewhere. All still 0022's. Also deferred: a sketch of the way in the panel (the card's small map keeps its own picture); the
panel says it in words only for this iteration.

## Native paths that will not run on a device

The pressable row's touch and accessibility, the panel's expansion inside the full-screen drawer, `showWalk()` with a route
saved from the card, and the walkability reads are all web-verified at most. Listed in `docs/NATIVE_UNVERIFIED.md`.

## Risks I want your eye on

1. **Does the profile hold enough?** `AtlasProfile.marks` are the *markable* places only, so "Food", "Shops" and "Nightlife"
   (not marks) are not in it; for those the plan reads the place cache instead (`candidatesFrom`). I will confirm that read is
   cheap and in range of the area before relying on it.
2. **The budget in settings** goes in the Start dialog beside the units; if you want it on the panel instead, say so.

## Steward triage (2026-11-05)

Accepted into the spec: S2 (KW5, KW5b: cells count found and unfound, 400 m like the pockets, never a place's spot; test over
two profiles that differ only in `found`), S3 (KW14 says what is true: the pending destination is stored as for every walk; reads
only after the tap, on allowed hosts; tests with `fakePorts()` that meta holds no kind-walk record after the walk, and
`check:vision` passes unchanged), S4 (KW11b: one chain; test a first chain over a car stretch gives the "none" sentence although a
second would be clean), S5 (KW9b: 5 km; "needs running" dropped because the app knows no pace), S6 (KW8, KW8b: a step writes the
budget setting; the panel shows only the current length; test that no prior length or difference is rendered), S7 (25% in KW8;
mile and km steps stated; the overlay clause removed from KW6 since the panel is words only, and the route's end pin carries no
name; KW12 test that no field marks a kind walk; the thin-ring path for KW2 gets a test; the words test uses word boundaries,
`\bminutes?\b`, `\bmins?\b`, `\bhours?\b`, `\bETA\b`, `\bpace\b`, `\bfast(est)?\b`, `\b(best|finest|top|most)\b`, scoped to
`kindWalk/words.ts` so the existing "ten-minute walk" atlas copy needs no exception), S8 (KW1b; the button reads "Start this walk" in
the neutral card style, not "Walk this way").

Waits on the owner: S1 (spec Open 1). Not changed: steward's questions 2-4. I keep the same suggestion on every open (no
variation, which would look like a ranking), density from open data only (the walker's own notes and finds never bend it), and the
panel adds no count beyond the distance.

Changed in the plan: the density source is the place cache for every kind, found and unfound, at 400 m cells (risk 1 above is now
this, not `AtlasProfile.marks`); the budget is stored by the panel's step as well as the Start dialog.

## Changes found while building (2026-11-05)

- **No cached places or streets for an unwalked area.** The atlas keeps only a ring's profile (explore-atlas audit 6), so the
  suggestion reads the area's tiles itself when the row is tapped (`app.ts`, `fetchTiles`, 1.5 km around the point) and keeps
  nothing. The risk 1 above is resolved this way; `AtlasProfile.marks` and `placesIn` are not used.
- **Cell centres move onto streets** (`onStreets`, 300 m), and a cell with no street that near is dropped.
- **Navigation changed in three small places** (`Waypoint.via` and `suggested`, `routeVia` and `viaAhead` in `navigator.ts`,
  `useNavigation`, `walk.tsx`'s bar): this is the seam the other worktree may also touch; expect a merge to settle by hand.
- **A web e2e fixture** (`Green Row`, 12 km west of Fox Point, six parks in three clumps) in `scripts/e2e/harness.js`.
