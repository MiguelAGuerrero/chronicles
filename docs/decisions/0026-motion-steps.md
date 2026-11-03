# 0026. Motion: steps from DeviceMotion decide still from walking, on every platform

Date: 2026-11-01 · Status: accepted · Area: sensors, trace

## Context
The concept doc's "Motion" tab, MO1-MO10; the owner's calls, Nov 1, after research: GPS can't tell 10 m of drift from a walk; steps can. Expo's Pedometer has no web build.

## Decision
`expo-sensors` DeviceMotion on every platform; `steps.ts` (pure) finds steps in the acceleration's size (gravity removed): peaks of 0.6 m/s² or more, 0.3-1.3 s apart, with a dip below rest between. Walking: 3 evenly spaced steps in 3 s; still: none for 3 s. Permission is asked first thing in the Start, Walk here and Resume taps (`askMotion`); declined or unavailable, the walk runs on the GPS filters, and the options say so. Read only while a walk is open, on screen and not paused (`useWalkMotion`). Still spells are kept truth beside pauses.

## Consequences
- `setMotion` on the dot: still holds it unless five far fixes sit together; walking follows at once and turns away fixes over 4 m/s; net travel of 4.5 m/s over 10 s hands it back to the GPS (a bus reads still).
- `Still` (SQLite migration 13, IndexedDB v11), `readTrace(..., stills)`, `holdStill`, `SNAP_RULES` 5; `restoreMotion` after a reload.
- Web samples come from the browser's `devicemotion` event (`motionSource/index.web.ts`), a listed exception (0006).
- Audit: 11 findings, 9 fixed (`motion audit N`). Deferred: the backup bundle leaves spells out. Native unverified: units and interval, the iOS permission text, migration 13, AppState `inactive`.
