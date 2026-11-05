---
paths:
  - "src/lib/kindWalk/**"
  - "src/components/atlas/KindWalkPanel.tsx"
  - "src/lib/__tests__/kind-walk/**"
---
# Kind walk

A kind (Green, History, ...) opened in place on an area's card offers one suggested walk through where the kind is dense (KW1-KW14, decision 0100). The spec is `specs/kind-walk/spec.md`; it pulls one slice of 0022 forward, and the rest of suggested routes stays deferred.

## What it is

- **One way, a distance, never a time.** `lengthLine` says "About 2.0 km" (or miles). No sentence in `kindWalk/words.ts` may hold minutes, hours, ETA, pace, a rank or a superlative: `words.test.ts` greps the file for them. A walk started from a kind says distance only on the walk screen and in announcements (KW7b): the destination carries `suggested: true` (`nav/types.ts`), and `useNavigation` and `walk.tsx` leave the time left out for it. Every other walk keeps its time left.
- **Density, not places.** `density.ts` bins every place of the kind (found or not) into the pockets' 400 m cells, moves each centre onto the nearest street (`onStreets`), and `plan.ts` chains them in density order. Nothing names a place and a find never moves the way (KW5b, KW6). `placesIn` is the only read of places.
- **One chain.** `planKindWalk` takes cells in density order and skips one that would overshoot the budget by more than 25%. With "don't suggest" a chain over a stretch built around cars is not offered; it is not re-planned (KW11b).
- **The route** is made leg by leg through `Waypoint.via` (`routeVia`, `lib/nav/navigator.ts`) and the destination is the last stop. A re-route goes on through the stops not yet passed (`viaAhead`, `viaPassed` in `useNavigation`). It is an ordinary navigated walk: no alarm, nothing marks the Walk (KW12, KW13).
- **Walkability** comes from `carStretches` over the way's tiles (`app.ts`); nothing read says "not known", never "fine" (KW10). The setting `kindwalk_pref` is `warn` (default) or `skip`; the budget `kindwalk_budget` is metres, default 2000, set by steps in the displayed unit (`settings.ts`).
- **Stored:** the two settings, and the ordinary pending destination every navigated walk has. Nothing is read until the row is tapped (KW14).

## Traps

- A kind with step 0 is said without reading anything; a thin ring shows no kind rows at all (AG3).
- `suggest.ts` is a shell over injected reads, so the tests need no db; `app.ts` is the instance and imports the walkability reader.
- Native, unverified: the pressable kind row inside the drawer, the panel's expansion, `showWalk()` with a destination that has `via`, the walkability reads for a route's tiles.
