# Native map frames (NF1-NF7)

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
6. **NF6** Everything the map draws and every tap on it is unchanged: pins, memory pins, marks and stars open what
   they opened, the scale bar, the blank-map check and the fit behave as before.
7. **NF7** (device) On a phone, during a walk with fog and at least 30 pins, React's profiler shows the map's static
   part rendering no more than once per fix, and the glide part at its frame rate.

## Record

Not built yet.
