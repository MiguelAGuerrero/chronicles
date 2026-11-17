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
  `window.__perf` (`docs/TESTING.md`). **The reactivity budget measures the web build only**; native glides
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
  holds a native player each). Timers and subscriptions on a tab stop while it is unfocused.

## Algorithms

- Anything over features is O(n log n) or better: index with `EdgeGrid` or `Buckets`
  (`landing/spatial.ts`, numeric keys), never `some`/`find` inside a loop over the same n.
- Native has no worker: a computation over a read (deriving streets, analysing an area) yields every
  ~16 ms, not only between stages (`landing.md`).
- Recompute from the trace (truth vs cache), but not every tick: cache by a key that changes when the input
  does, and keep array identity when nothing changed so the map does not resend.
