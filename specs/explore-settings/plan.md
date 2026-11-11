# Plan: Explore settings (ES1-ES9)

Run by the owner, so the plan waits for their go-ahead before any code.

## Files

| Criteria | Where |
|---|---|
| ES1, ES2 | `src/lib/explore/explore.ts` (core): `setKind(hidden, kind, on)`, the one rule the walk screen, the ready bar and Explore each wrote inline (`toggleKind` in `app/walk.tsx` and `components/walk/useReady.tsx`); both now call it |
| ES1, ES2 | `src/lib/explore/settings/shell.ts` (new shell, factory over `Pick<Ports,'db'>`; the app's instance is `settings/index.ts`, so every import of `explore/settings` stays): `load`, `save`, `onSettings`, and `toggleKind(kind, on)` that reads the saved settings first and writes the whole of them, so a change from Explore never writes a default range or pocket alert over the saved ones. The old `settings.ts` becomes that `@instance` with the same exports, so `useAtlas`, the walk and the ready bar change not at all |
| ES3-ES6 | `src/components/ExploreKindsControl.tsx` (view): the round button and the panel, the same card and button styles as `LayersControl`, a `KindSwitches` inside. `LayersControl`'s shared button and card styles move to `components/mapPanel.ts`, no change to Layers |
| ES3-ES6 | `src/app/(tabs)/explore.tsx`: the control under Layers (`top + 8 + 44 + 8`); the Layers panel and this one close each other; `pageBack` and `tapDoes` (`atlas/waitingPins.ts`, core) learn `kindsOpen`: Back and Escape close this panel first, a tap on the map closes it; `LayersControl` gets an `onToggle` so opening Layers closes this panel |
| ES4 | `src/lib/layers/layout.ts` (`panelBox`) is reused for the panel's size; it already fits a short phone |

## Data

None new. The setting stays in meta `explore_hidden` (and `explore_kinds_known`), as now: no migration, no IndexedDB version, no cache.

## Tests per criterion

- `src/lib/__tests__/explore/settings.test.ts` (core and shell over `fakePorts()`): `ES1` (a toggle from one subscriber is heard by another and read back after a reload; range and pocket alert unchanged), `ES2` (one kind only; a kind added since stays as it was; two toggles in one tick both saved; a failing save restores the switch and does not throw), `ES8`.
- `scripts/e2e/journeys/layers.js` (it already covers `explore.tsx` and starts on a fresh Explore): `ES3` (the button, its size, below Layers, no digits), `ES4` (a switch off hides that kind's "?"; on shows it; Layers and this panel never open together), `ES5` (button, Escape, a map tap), `ES6` (no hidden-count line anywhere on Explore), `ES7` (320x568 and landscape: no overlap, list scrolls), `ES9` (all kinds off: no extra text on Explore, mode unchanged). `ES8` is a scan test: the files that read the setting are a named list (Explore, the walk, the ready bar, the replay's passed line, the new panel); nothing about a moment, capture or Chronicle reads it. The journey also checks that the walk's drawer shows the same switch state (ES1).

## Per-action matrix (docs/research/ui-references.md, section 2)

- "Choose which kinds of place I care about", occasional, while browsing Explore: a button in the map's edge column opening a panel of switches. Switches are the matrix's control for a standalone binary option that takes effect at once; precedent: the Layers panel (ML3-ML5) and the walk's drawer (NV21).
- "Close the panel": the button, Escape, Back and a tap outside (ML4).

## Deferred

The "?" range and the pocket alert from Explore (the owner chose kinds only). A "reset" that switches every kind on: not asked for.

## Native paths that will not run on a device

The button and panel are views over the same React Native primitives as Layers; native has never run on a device. One item goes into `docs/NATIVE_UNVERIFIED.md`: open the panel from Explore on a phone, switch a kind off and see its "?" go, then open the walk's settings and see it off there.

## The steward (Nov 11): triage

- S1 (Vision cited the wrong ids): accepted; the section now names ES3 and ES7.
- S2 (panel may cover what Explore draws): accepted into ES7, the same `clearBottom` as Layers. Explore draws no capture stack (`captures={NONE}`), so the clause names the real controls.
- S3 (the button must not count by another name): accepted into ES3 (identical whether none or all are off).
- S4: accepted: render-bound for the atlas, restore on a failed save, two toggles in one tick (`toggleKind` serialises through one queue), switches disabled until loaded, labels and focus return, "at once" means the next open of the other door, and one panel closes the other (ES1, ES2, ES4, ES5). All-off becomes ES9: the owner chose no special state (Nov 11).
- S5 (view filter only): accepted as ES8, corrected: the replay's "Passed" line already follows the hidden kinds (`summary.ts`, E11), so ES8 keeps that as it is and says no moment or Chronicle context reads the filter.
- Silent: the button's and drawer's label match ("What I'm into").
