# Compass: plan

For the owner to review before any code.

## Files

- `src/lib/compass.ts` (`@layer core`): `showsCompass(bearing)`, `compassRotation(bearing)` (CP3, CP6).
- `src/components/CompassButton.tsx` (new, `@layer view`): the 44 pt round button, same style as `LocateButton`; takes `bearing`, `onPress`, `bottom`, `right`; returns null at north-up (CP2, CP5).
- `src/components/map/types.ts`: `WalkMapProps.onBearingChange?(bearing)`; `WalkMapHandle.resetNorth()` (CP4).
- `src/components/map/WalkMap.web.tsx`: allow `touchZoomRotate` rotation, keep `dragRotate` off (a right-drag rotate would surprise desktop), report `map.getBearing()` on `rotate`/`rotateend`, throttled with the existing view rule; `resetNorth` = `easeTo({bearing: 0, duration})`; follow moves never pass a bearing.
- `src/components/map/WalkMap.native.tsx`: report bearing from `onRegionDidChange`; `resetNorth` through the Camera ref. Native enables rotation, which may already be on by default. **I will read MapLibre RN's `.d.ts` first** (the package isn't installed in this container; `npm ci` is needed before code).
- `src/components/walk/layout.ts`: add an edge slot above the others so the compass sits over Locate/Recenter. On the walk the slots are locate, unwalked, back; the compass would otherwise collide with "unwalked". Proposal: it takes the **top** of the column (above "back"), so existing buttons never move. On Navigate/Explore it sits directly above Locate. This is a small deviation from "directly above Locate" on the walk.
- `src/app/walk.tsx`, `src/components/walk/useReady.tsx`, `src/app/(tabs)/index.tsx`: hold `bearing` state from the map callback; render `CompassButton`.
- `docs/decisions/0082-compass-and-rotation.md` (amends 0030), `docs/PRODUCT.md`, `docs/STATUS.md`, `.claude/rules/map.md`, `.claude/rules/walk-screen.md`.

## Data

None. No migration, no IndexedDB bump.

## Tests per criterion

| Id | Test |
|---|---|
| CP1 | e2e: rotate via the map hook; a Recenter/Locate afterwards leaves the bearing unchanged |
| CP2 | e2e: `compass` present above `locate` when turned, absent at 0° |
| CP3 | `compass.test.ts`: `CP3: rotation is minus the bearing` |
| CP4 | e2e: tap returns `data-bearing` to 0, centre and zoom unchanged |
| CP5 | e2e: label and role; buttons below do not move |
| CP6 | `compass.test.ts`: `CP6: hides within 1 degree of north, either side` |
| CP7 | e2e: a rotate stops following; Locate resumes it |
| CP8 | e2e: reload starts at bearing 0 |

## Open question for the owner

On the walk screen the column is Recenter, unwalked streets, walk me back. Put the compass **at the top** of that column (nothing moves), or **directly above Recenter** (matches your "above Locate", but shifts the other two buttons up while turned)?

## Native (never run on a device)

Rotate gesture, bearing callback and the reset through the Camera ref. Goes into `docs/NATIVE_UNVERIFIED.md`.
