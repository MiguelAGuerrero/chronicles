---
paths:
  - "src/**"
---
# Performance: what a change costs

A checklist for writing and reviewing code anywhere in `src/`. The area rules hold the detail
(`map-reactivity.md` for the map, `storage.md` for queries, `streets-fog-snapping.md` and `landing.md` for
derivation); this file says what to ask. Restraint applies here too: measure before tuning, and a cost that
is already a recorded trade-off is reopened with a number, not rediscovered.

## Before calling something slow

- **Check `docs/DEFERRED.md` first.** Several costs are owner's calls or recorded trade-offs (the live trace
  re-read, Chronicle and the gallery reading every moment, DOM pins, "?" pins as layers). Name the entry and
  the measurement that reopens it; don't file it as new.
- **Say the realistic n and when it runs.** A cost is n × how often × which thread:

  | What | Realistic n |
  |---|---|
  | Fixes in a walk | 1k-30k (1 Hz, up to 8 h) |
  | Moments in a library | hundreds to a few thousand, growing for years |
  | Features in a dense 1.5 km read | ~16k; segments after derivation ~15k; places ~5k |
  | "?" pins and marks on a map | tens to a few hundred |

  When: at launch, on a tab's focus, per fix (~1 s), per publish (2 s), per frame (16-66 ms), at Stop.
  A per-frame or per-fix cost over n is worth more than a once-at-Stop one over the same n.
- **Measured or inferred, said so.** The harnesses are web-only: `scripts/perf-walk.js` (a long walk,
  `PERF_SEED`, `PERF_PROFILE`), `scripts/perf-explore.js` (a dense city) and `perfCount` counts under
  `window.__perf` (`docs/TESTING.md`). No check runs the harnesses: one that fails to reach its screen is
  fixed before its numbers are trusted. On a device, the native map counts `render:map` and `render:glide`
  once a dev build's console sets `globalThis.__perf = {}`. **The reactivity budget measures the web build only**; native glides
  and draws through other code (`WalkMap.native.tsx`), so a native cost claim is a device check in
  `docs/NATIVE_UNVERIFIED.md`, never a pass.

## Reads and writes

- No whole-table read to find one row, learn a count or test emptiness: add a narrow `Db` method
  (`getX(id)`, a `LIMIT 1`, a `COUNT`), held to the stores by the contract suite. New code doesn't add
  `momentsBetween(0, Number.MAX_SAFE_INTEGER)` reads; page by time where a list grows with the library.
- Independent reads go in one `Promise.all`, and their results reach React in **one** state update: each
  `setX(await …)` is a render of its own, and on a map screen each render redraws the pins.
- Refetch on focus only when something was written since the last read.
- Writes inside a loop use one prepared statement (`prepareAsync`, finalize in `finally`), as
  `appendPoints` does; a large write is chunked (`SEGMENT_BATCH`) so trace points never wait behind it.

## Rendering

- **Nothing memoizes what the code doesn't.** The React Compiler is not on (`app.json` has no
  `experiments.reactCompiler`; only its lint rules run, DEFERRED), so an inline object, array or closure is
  new on every render and breaks every `memo` below it, the libraries' own included.
- **No React state at frame rate above a costly subtree.** A value that changes per frame or per fix lives
  in a ref, an `Animated.Value` (native driver for opacity and transforms) or a small leaf component that
  owns it (`Ticking`, `WalkStats`). The parent never re-renders per frame.
- **On native, a GeoJSON source re-serializes its data on every render** (MapLibre RN): a source whose data
  doesn't change per frame is a `memo` component, as `TraceSource` is. Inline sources under a per-frame
  parent are the most expensive shape the app can take.
- Set state only when the value changed; derived values over n go in `useMemo` keyed on what they read,
  never recomputed in the body of a component that renders per frame.
- Long lists that grow with the library are virtualized (`FlatList` with `keyExtractor` and
  `getItemLayout`, as `gallery/MediaScreen.tsx` does), not a `ScrollView` over `map()`.
- A media player is created when it is played, not for every row that could be (`useAudioPlayer` per row
  holds a native player each). Timers and subscriptions on a tab stop while it is unfocused: an effect on
  `isFocused` that returns before its `setInterval` (Memories' clock rendered the whole journal twice a minute
  under the walk; `journal/hiddenTick.test.ts`).

## Async loads

- **Find the path before tuning it.** Measure where the work really runs: a focus effect inside a component
  that mounts per section runs on that mount and on returns over it, not on every tab focus (Chronicle's map;
  fix chronicle-focus-reload). Check the instrument moves on a control path first (`render:explore` did,
  `render:home` stayed 0 until the right section was open).
- **Batching keeps what the load did.** Moving reads into one `Promise.all` changes when state is set, never
  whether: don't add a guard (`live`, `cancelled`) the load didn't have. Chronicle's map goes on to the end
  while a replay is open over it, so its places count as framed and a taken recall is shown; a tidy-looking
  `if (!live) return` after the reads lost both (fix chronicle-focus-reload audit 1, 2).

## Testing a cost

- A screen or native file can't run under `npm test`, so its cost is held by a source scan (TypeScript's
  syntax tree, as `mapFrames.test.ts` and `chronicleLoad.test.ts` do). A scan is **shown to fail**: run it on
  hand-written snippets of each regression it exists for (moved, added, written another way) or on a
  mutation of the file, not only on today's file, which it passes by construction. Never skip a match by its
  position ("allow the first check"): name what is allowed by its place in the syntax (fix
  chronicle-focus-reload audit 4, native-map-frames audit 1).
- A scan also fails when it finds nothing to check: a load that sets no state, a file with no sources.

## Algorithms

- Anything over features is O(n log n) or better: index with `EdgeGrid` or `Buckets`
  (`landing/spatial.ts`, numeric keys), never `some`/`find` inside a loop over the same n.
- **A tile is fetched once for every reader of it.** In-code reads go through `fetchTileBodies`/`fetchTiles`
  (`discovery/tileFetch.ts`), which share a fetch in flight and keep the last 16 bodies (`createTileBodies`,
  `discovery/tileBodies.ts`); a new reader of tiles uses them, never its own `fetch`. A reader's cancel stops
  the download only once no other reader waits on it.
- **Filter a tile's features before decoding their geometry.** A vector tile gives a feature's properties
  without decoding its shape (`toGeoJSON` is the cost): read what decides whether it is kept first, as the
  complexes reader keeps only named buildings of thousands (`namedBuilding`, performance review, Nov 18).
- Native has no worker: a computation over a read (deriving streets, analysing an area) yields every
  ~16 ms, not only between stages (`landing.md`).
- Recompute from the trace (truth vs cache), but not every tick: cache by a key that changes when the input
  does, and keep array identity when nothing changed so the map does not resend.
