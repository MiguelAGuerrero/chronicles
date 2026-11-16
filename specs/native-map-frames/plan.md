# Native map frames: plan (NF1-NF7)

**As built (Nov 16):** the glide is not one `GlideLayer`: native layer order is mount order, and the cone and the dot
sit at different depths, so the frames run into a store and three memo leaves read it (`ConeSource`, `PointsSource`,
`GlideFollow`). `WalkMap.native.tsx` stays one file (the source scans read it). `glideShown` was pulled out of the hook
as a pure function so a unit test reaches `useGlidingWalker.ts`. `endsPaint.test.ts`'s two native regexes follow the
ends into their own source.

For the owner's review before any code. Native only, apart from one shared constant and, if the check below finds one,
a memo in the replay screens. No screen changes, no data, no migration, no new dependency.

## The shape of the change

Today `WalkMap.native.tsx` (724 lines) is one component: the glide's state, ~25 inline `GeoJSONSource`s and six inline
`Marker` lists all re-render together, ~15 times a second on a walk and ~30 in a replay. After:

```
WalkMap (forwardRef)          refs, camera fit, view buckets, the props' derived data (useMemo, as today)
├─ <Map>
│  ├─ base / omt-query        unchanged
│  ├─ StaticSources (memo)    one memo component per source (or per group sharing a `data`):
│  │                          borders, veil, walkability, pockets, strips, fog, walked, alternates,
│  │                          route-grades, route, gap-links, drawing, ends, ring, ground, complexes,
│  │                          found-pins, waiting-dots, marks, storefront-names; TraceSource as today
│  ├─ GlideLayer (memo)       owns useGlidingWalker: the `points` and `cone` sources and the follow jumpTo
│  └─ MarkerLists (memo)      memory pins, pins, "?" marks, complex labels, area points, stars
└─ ScaleBar, cover            unchanged
```

- A source component takes only its `data` (already `useMemo`'d in `WalkMap`, keyed as today) and primitive props
  (`opacity`, `beforeId`, `minzoom`); its `<Layer>` paint and layout objects are module constants or built inside it.
  So the library's own `memo` and ours both hold until the data changes (NF3).
- `GlideLayer` gets `walker`, `walkerHeading`, `glideWalker`, `walkerSource`, `follow`, `followZoom`, `zoom` and the
  camera ref. Only it re-renders per frame (NF1). The camera's follow effect moves into it unchanged.
- Marker lists take their arrays and the reaction and reminder sets; press handlers reach them through one ref of the
  latest props (`handlersRef`, updated in an effect, the rule for callbacks passed down), so a new `onPinPress` closure
  from a screen never re-renders the lists (NF4). `pinReactions` is computed once per pin in a `useMemo`;
  `declutterMarks` in a `useMemo` on `[discoveries, roundedZoom]`.
- `LINE_SOURCE = { tolerance: 1, buffer: 64 }` in `components/map/types.ts`, spread into every line source on both
  platforms; the web's literal values are replaced by it (NF5).
- **Replay and day replay (NF2):** their map props are already `useMemo`'d (`drawn`, `fog`, `clocks`, `faint`, `links`,
  `whole`), except two to verify: `pinned` (`useRevealed`) must keep its identity between ticks that reveal nothing new,
  and the day's `borders` input (`dayWalks`). If either is a new array per tick, it gets the memo; nothing else in the
  screens changes. `walker`, `follow` and `followZoom` still change per tick by design and reach only `GlideLayer`.

## Files

- `src/components/map/WalkMap.native.tsx`: the split above. It stays one file unless it passes ~800 lines, then the
  source components move to `components/map/nativeSources.tsx`.
- `src/components/map/types.ts`: `LINE_SOURCE`.
- `src/components/map/WalkMap.web.tsx`: uses `LINE_SOURCE` (same values; no behaviour change).
- `src/components/ceremony/useRevealed.ts`, `src/app/day/[key].tsx`: only if the identity check finds a new array per tick.
- `.claude/rules/map-reactivity.md`: the native rule as built (replaces "does not set them yet").

## Tests (feature `map`, `src/lib/__tests__/map/mapFrames.test.ts`)

Native can't render under `npm test` (nothing a test imports may import React Native), so NF1-NF5 are held by reading
the source with the TypeScript compiler API, as `endsPaint.test.ts` and `hoodAudit.test.ts` already read
`WalkMap.native.tsx`. Each test fails on today's file:

| Id | Test |
|---|---|
| NF1 | `useGlidingWalker` is called only inside `GlideLayer`, which is wrapped in `memo`; `WalkMap`'s own body calls no glide hook and renders the `points` and `cone` sources nowhere else |
| NF2 | every array or object prop the replay and day replay pass to `WalkMap` is an identifier bound by `useMemo`, `useState`, a hook or route data, never an inline literal or a call (`scaleInset`, `fitPadding` and `initialCenter` are listed exceptions: they reach only `ScaleBar` and the fit, which are cheap); and NF1's test covers the map's side |
| NF3 | every `<GeoJSONSource>` in the file is inside a component wrapped in `memo`, and none is rendered directly in `WalkMap`'s body; no source component receives an inline object or array prop |
| NF4 | every `<Marker>` is inside a `memo` component; no `Marker` list receives a `props.on*` closure (handlers come from `handlersRef`); `declutterMarks` and `pinReactions` are called only inside `useMemo` |
| NF5 | both map files spread `LINE_SOURCE` into each line source by id (the list in the criterion), and `LINE_SOURCE` is `{ tolerance: 1, buffer: 64 }` |
| NF6 | the existing tests that read the native map (`endsPaint`, `pinReactions`, `pins`, `hoodAudit`, `complexes/audit`) still pass, adjusted only where they name a moved line; the e2e journeys covering `WalkMap.web.tsx` and the replay (`qol`, `walk`, the replay's) run once at the end. NF6 on the phone is device items below |
| NF7 | `device:` in `UNTESTED` (`scripts/features.js`), with an item in `docs/NATIVE_UNVERIFIED.md` |

A source scan proves the structure, not the frame rate; NF7 is where the frame rate is checked.

## Cost (`.claude/rules/performance.md`)

- n: the fog and walked sources (hundreds to thousands of segments), strips and pockets (up to a dense downtown's
  ~16k features before thinning), 0-200 pins and marks.
- How often: per glide frame (66 ms) on a walk, per tick (33 ms) in a replay, today; after, per data change.
- Harness: none on native. The web harness (`scripts/perf-walk.js`) measures nothing here, since the web glides outside
  React; it runs once to show the web is unchanged (render rates as before, a `LINE_SOURCE` no-op). The number that
  matters is NF7's, on a device.

## Deferred, and why

- **The React Compiler**: the owner's call, its own measured slice.
- **The replay screen's own re-render at 30 fps** (`useCeremonyClock` sets state on the screen): after this slice it no
  longer reaches the map's sources; the rest of the screen (the stage, the overlays) is the ceremony's own and is left
  for a measurement on a device.
- **The hidden `omt-query` source on every map** (findings v2): a separate fix (mount it only where its reads are used).
- **Markers as symbol layers** (`docs/DEFERRED.md`, the owner's next round "if a drag still stutters").
- **`trackUserLocation` / a native follow**: it follows the OS fix, not the filtered one (`docs/research-reactivity.md`).

## Native paths that will not run on a device

All of `WalkMap.native.tsx`. Items for `docs/NATIVE_UNVERIFIED.md` (`npm run records -- native item add`):

- **Do:** walk 10 min with fog and 30+ pins, React DevTools profiler on. **Expect:** the static sources and marker lists
  render at most once per fix; `GlideLayer` at ~15 fps; the dot glides as before. (NF1, NF7)
- **Do:** watch a walk's replay and a day's replay. **Expect:** the same split; the trace grows in 66 ms steps; pins
  appear as the story reaches them. (NF2)
- **Do:** tap a pin, a memory pin, a "?" mark and a star, on a walk, on Chronicle and on Explore. **Expect:** each opens
  what it opened before this slice. (NF6)
- **Do:** zoom from 12 to 17 along a walked trace. **Expect:** lines look as before (no gaps at tile edges with
  `buffer: 64`). (NF5)

## Steward

Skipped: the gate said no surface.
