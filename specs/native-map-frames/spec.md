# Native map frames (NF1-NF5, NF7, NF8)

Last exported: not from the concept doc. The source is the performance investigation of Nov 16 (four reviewers and a
fresh-eyes review, findings v2 #1) and the owner's calls in that session.

## Vision

Idea: The native walk map and the replay stop re-rendering every map source and pin on each glide frame or clock tick; nothing a person sees changes, only how smoothly it moves and how long the battery lasts.
Verb: none (engineering, no visible change)
Touches: none; precedent 0160 ("measure on the dense downtown before tuning") and 0025 (the live dot's glide stays as it is)
Verdict: no surface
Shape: as asked
Criteria: none
Open: none

## What it is

On the phone the live dot glides through React state: `useGlidingWalker` sets state every 66 ms, and that re-renders
the whole `WalkMap.native.tsx`. The replay and the day's replay do the same at 30 fps through `useCeremonyClock`,
handing the map a new walker and camera every tick. Each such render re-renders about 25 `GeoJSONSource`s written inline
under the map. MapLibre RN's `GeoJSONSource` is a plain `memo` (checked in v11.5), but its inline `<Layer>` children are
new elements on every render, so the memo never holds and `JSON.stringify(data)` runs again for every source: the fog,
the walked streets and the strips can each be thousands of features. Every pin, memory pin, "?" mark, star, area point
and complex label is a `<Marker>` re-rendered too, with `declutterMarks` (O(n²) over the marks) and `pinReactions`
(three or four times a pin) run again in the render.

The React Compiler is **not** enabled (`app.json` has no `experiments.reactCompiler`; babel-preset-expo 58 turns it on
only from that flag), and it would skip `WalkMap` anyway (nine `eslint-disable` lines): nothing memoizes this today
but what the code says. The web build is not affected (it glides outside React, `applyFrame`), and the reactivity budget
(`map-reactivity.md`) measures only the web.

## Decisions (the owner's calls, Nov 16)

- **Explicit split and `memo`**, not the React Compiler: works whether or not the compiler is ever turned on.
- **The React Compiler is its own slice**, measured before and after, with a decision record; not part of this one.
- Native-only claims are device checks (`docs/NATIVE_UNVERIFIED.md`); no device has run the app.
- **NF6 retired, NF8 in its place** (the owner, Nov 17, at the deploy's test-first check): a criterion must be able
  to fail before its code.
- **NF5 is the one change a person may see** (audit 5, Nov 17): the phone's lines are simplified as the web's have been
  since Nov 1; "nothing a person sees changes" in the gate holds for everything else. On the device list.

## Criteria

1. **NF1** During a live walk on the phone, a glide frame re-renders only the walker's dot, its cone and the camera's
   follow: no other map source is serialized again and no pin, mark, star or label re-renders.
2. **NF2** In a walk's replay and a day's replay, a clock tick that moves only the walker and the camera re-renders
   only those, as in NF1; the trace still grows by its 66 ms buckets (unchanged).
3. **NF3** A map source is sent again only when its own data changes, whatever else about the map changed (the view's
   zoom bucket, a pin added, a beat's opacity on another source).
4. **NF4** Pins, memory pins, "?" marks, stars, area points and complex labels re-render only when their own content
   or the set shown changes; the marks' declutter runs only when the marks or the rounded zoom change.
5. **NF5** The phone's line sources (fog, walked, alternates, the route's grades, the route, gap links, faint, rides,
   the trace's history, tail and link, and a way being drawn: the web's own list) use the same simplification as the
   web's (`tolerance: 1, buffer: 64`), from one shared definition.
6. ~~**NF6** Everything the map draws and every tap on it is unchanged~~ (retired by the owner, Nov 17: a
   no-regression promise with no failing state to show first, so it could never pass `check:test-first`; its source
   scan stays as a guard, `native-map-frames guard: every tap…`, and the taps are device checks).
7. **NF7** (device) On a phone, during a walk with fog and at least 30 pins, React's profiler shows the map's static
   part rendering no more than once per fix, and the glide part at its frame rate.
8. **NF8** On an exploring walk, a fix that changes no "?" mark (the same marks, at the same places, in the same
   states, with the same names) re-renders no mark and works out no declutter again; a mark revealed, found, moved
   or renamed does (audit 3, taken up when NF6 was retired, Nov 17).

## Record

Built 2026-11-16 on `claude/bold-hawking-dx3pc8`, the plan approved by the owner first.

- **Tests:** `src/lib/__tests__/map/mapFrames.test.ts` (NF1-NF6; NF1-NF5 read the source with the TypeScript
  compiler API and failed before the code, NF6 a regression guard that passed before and after). Test-first by
  history: 5 of 6 (`check:test-first`); NF6 was written passing, as a guard, so it was never a todo.
  `endsPaint.test.ts`'s two native regexes follow the ends into their own source.
- **Checks:** typecheck, lint, `npm test` (2605), docs, vision, records; the ten journeys `check:affected` named
  (`qol`, `replay`, `days`, `layers`, `walkability`, `dense`, `switches`, `carousel`, `freelook`, `snap`), once each, all
  green (526 checks). `scripts/perf-walk.js` did not run: it waits for Start on `/`, which now opens Chronicle (the
  harness predates the home's change; the slice changes nothing on the web's walk screen).
- **NF7** is device-only (`UNTESTED`); four checks in `docs/NATIVE_UNVERIFIED.md`. Native has never run on a device.
- **Deferred** (`docs/DEFERRED.md`, "Native map frames"): the React Compiler (the owner's own slice), the replay
  screen's own 30 fps render, the hidden `omt-query` source on every map, a native follow camera.
- Not audited; no screen changed, so no UI review.

## Audit (2026-11-17, at the owner's request)

The auditor alone: no screen changed what it shows or how it is used, so no pictures, no `ux-reviewer` and no cold
find; the gate said no surface, so no steward. 4 findings from the auditor plus its UI note, triaged:

1. NF1's test no longer guarded what it named (the hook it banned is gone; frame state could come back unseen): accept.
   `native-map-frames audit 1` scans for a frame read or a state setter in WalkMap; it passed the correct code and
   failed a mutation that gave the glide a `useState` setter again.
2. The ends' and gap links' link to the trace's opacity was no longer checked on native: accept. `native-map-frames
   audit 2`; failed a mutation that handed `EndsSource` `opacity={1}`.
3. On an exploring walk the "?" marks declutter and re-render on every fix (`useExplore`'s `shown` is new per fix,
   ~28 marks once a second, within NF7; the zoom is already in 0.25 steps): defer, the cause is in `useExplore`
   (DEFERRED, "Native map frames").
4. The press handlers were filled in a passive effect, so a pin made pressable in the same render (the replay's card
   beat, any first mount) could take a tap that did nothing: accept. `native-map-frames audit 4` failed, then the
   handlers are filled in a layout effect.
5. The auditor's UI note, NF5 is visible on the phone against the gate's "nothing a person sees changes": reject as a
   defect (NF5 is the web's look, on the device list); the Decisions now say so.

5 findings, 3 fixed, 1 deferred, 1 rejected. Tests: `native-map-frames audit 1, 2, 4` in `mapFrames.test.ts`.
