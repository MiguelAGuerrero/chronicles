# Plan: Explore settings (ES1-ES6)

Run by the owner, so the plan waits for their go-ahead before any code.

## Files

| Criteria | Where |
|---|---|
| ES1, ES2 | `src/lib/explore/explore.ts` (core): `setKind(hidden, kind, on)`, the one rule the walk screen, the ready bar and Explore each wrote inline (`toggleKind` in `app/walk.tsx` and `components/walk/useReady.tsx`); both now call it |
| ES1, ES2 | `src/lib/explore/settingsShell.ts` (new shell, factory over `Pick<Ports,'db'>`): `load`, `save`, `onSettings`, and `toggleKind(kind, on)` that reads the saved settings first and writes the whole of them, so a change from Explore never writes a default range or pocket alert over the saved ones. `src/lib/explore/settings.ts` becomes its `@instance` with the same exports, so `useAtlas`, the walk and the ready bar change not at all |
| ES3-ES6 | `src/components/ExploreKindsControl.tsx` (view): the round button and the panel, the same card and button styles as `LayersControl`, a `KindSwitches` inside. `LayersControl`'s shared button and card styles move to `components/mapPanel.ts`, no change to Layers |
| ES3-ES6 | `src/app/(tabs)/explore.tsx`: the control under Layers (`top + 8 + 44 + 8`); the Layers panel and this one close each other; the Back and Escape handling (`pageBack`) closes this panel first; a tap on the map closes it with the Layers panel |
| ES4 | `src/lib/layers/layout.ts` (`panelBox`) is reused for the panel's size; it already fits a short phone |

## Data

None new. The setting stays in meta `explore_hidden` (and `explore_kinds_known`), as now: no migration, no IndexedDB version, no cache.

## Tests per criterion

- `src/lib/__tests__/explore/settings.test.ts` (core and shell over `fakePorts()`): `ES1` (a toggle from one subscriber is heard by another and read back after a reload; range and pocket alert unchanged), `ES2` (one kind only; a kind added since stays as it was; a failing save keeps the heard value and does not throw).
- `scripts/e2e/journeys/atlas.js`: `ES3` (the button, its size, below Layers, no digits), `ES4` (a switch off hides that kind's "?"; on shows it; Layers and this panel never open together), `ES5` (button, Escape, a map tap), `ES6` (no hidden-count line anywhere on Explore). The journey also checks that the walk's drawer shows the same switch state (ES1).

## Per-action matrix (docs/research/ui-references.md, section 2)

- "Choose which kinds of place I care about", occasional, while browsing Explore: a button in the map's edge column opening a panel of switches. Switches are the matrix's control for a standalone binary option that takes effect at once; precedent: the Layers panel (ML3-ML5) and the walk's drawer (NV21).
- "Close the panel": the button, Escape, Back and a tap outside (ML4).

## Deferred

The "?" range and the pocket alert from Explore (the owner chose kinds only). A "reset" that switches every kind on: not asked for.

## Native paths that will not run on a device

The button and panel are views over the same React Native primitives as Layers; native has never run on a device. One item goes into `docs/NATIVE_UNVERIFIED.md`: open the panel from Explore on a phone, switch a kind off and see its "?" go, then open the walk's settings and see it off there.
