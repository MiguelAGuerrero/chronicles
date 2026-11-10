---
paths:
  - "src/lib/kindWalk/**"
  - "src/lib/__tests__/kind-walk/**"
---
# Kind walk

What is left of the kind walk (KW1-KW17, decisions 0101, 0102) after the walk planner replaced its in-card panel: the cells of a kind (`density.ts`), the limits and how a path's retracing is measured (`plan.ts`), its words (`words.ts`), and the planner's four settings (`prefs.ts`, `settings.ts`). The page, the routes and the rest are `.claude/rules/walk-planner.md`.

## What it is

- **Density, not places.** `density.ts` bins every place of the kind (found or not) into the pockets' 400 m cells and moves each centre onto the nearest street (`onStreets`). Nothing names a place and a find never moves the way (KW5, KW5b, KW6).
- **A distance, never a time.** `lengthLine` says "About 2.0 km" (or miles); no sentence may hold minutes, hours, ETA, pace or a rank (`words.test.ts` greps the file). A walk started from a kind says distance only on the walk screen and in announcements (KW7b): the destination carries `suggested: true` (`nav/types.ts`), and `useNavigation` and the walk's `NavBar` (`components/walking/`) leave the time left out for it.
- **Limits.** `FAR_START_M` (5 km), `MIN_CELLS` (2), `MAX_RETRACE` (10%, KW16) and `retracedM`.
- **Settings** (meta `kindwalk_budget` in metres, `kindwalk_pref` warn or skip, `kindwalk_mode` loop or oneway, `kindwalk_density` anywhere, some or plenty): one Store, `kindWalkPrefs`; they live on the planner page, not the Start dialog (WP27).
- **Retired** by the planner (decision 0102): KW1 (the row opens the kind in place), KW4 (one way), KW8 (Shorter and Longer), KW9 (the start said apart).

## Traps

- The kind row's button opens the planner; the row is a button only where the kind has something (KW2, KW15).
- Native, unverified: the button in the full-screen drawer's scroll.
