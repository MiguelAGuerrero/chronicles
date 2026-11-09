# Plan: Memories, in context and under your control

Spec: `specs/memories-context/spec.md` (MC1-MC15). Branch `claude/memories-context`, from `main`.

Read this, then say go (or what to change). No code has been written.

## Shape

The shipped Memories reads moments and the owner's choices. This slice adds one more read (the context of the moments on screen) and widens the choices. Pure decisions go in core with a test first; the one effect, reading streets and pauses, goes in the existing shell.

```
visible moment ids ──► shell.contextFor(ids) ──► street_segment cache (getSegmentsIn, 40 m), pauses (getPauses)
                           │                     (cached per moment for this open)
                           ▼
              core: arrivalLine({ street, town, minutesIn, partOfDay, justAfter }) ──► one line of words
```

## Files

New, pure (`// @layer core`) in `src/lib/resurface/`:

| File | Holds |
|---|---|
| `context.ts` | `partOfDay` (reusing `walkTitle`'s boundaries), `minutesInLine`, `justAfter(prev, c, walkedMs)`, `nearestStreet(fix, segments, snappedId)` (40 m for the snapped street too), `placeLine`, `arrivalLine`; a context is `pending`, `failed` or a line (MC1-MC5, MC7, MC17, MC16) |
| `copy.ts` | the toast, empty-state and label sentences as functions and constants (MC11, MC14), so a unit test reads every one |

Touched:

- `types.ts`, `prefs.ts`: `Prefs.off`; `unhideMoment`, `unremoveThread`, `unlessTerms`, `forgetChoices`; `parsePrefs` reads `off` (MC9, MC10, MC12).
- `feed.ts`: `lately(moments, now, limit)` strictly newest first; the `threads` and last-day rules go (MC13). `compose` drops the off switch's top card (`off` empties `order`).
- `shell.ts`: `contextFor(ids)` (a `Map` cached per open, one read per moment, a failed read not cached so the next render asks again, MC6, MC17), `restore` methods, `setOff`, `forget` (keeps `off`); `ResurfaceState.context: Record<string, { state: 'pending' | 'failed' | 'done'; line?: string }>`.
- `useResurface.ts`: asks `contextFor` for the ids on screen.
- Components in `src/components/chronicle/`: `MemoriesMenu.tsx` (the header menu: Hidden, Bring moments back, Forget my choices, with its one confirmation inside the sheet), `HiddenScreen.tsx`; `MomentCard.tsx` and `Resurfaced.tsx` show the context line; `MemoriesScreen.tsx` the header, the copy, the italics (MC15).
- `lines.ts`: the "Newest first" sub-line stays; nothing else.

## Data

- No new truth or cache, no migration, no IndexedDB version. The only stored change is the `off` field in the existing meta key `resurface_prefs` (JSON; `parsePrefs` tolerates its absence).
- Context is derived, never stored (RM23 holds): recomputed from captures, walks, pauses and the street cache each open, for the moments on screen only.
- If the tile build changes and a snapped segment id is gone from the cache, `nearestStreet` falls back to the closest segment within 40 m (MC2). It never writes.

## Tests, one failing todo per criterion first, then the code

| Criterion | Test |
|---|---|
| MC1 | `context.test.ts`: street and town; street alone outside a walk; town alone; "No place kept"; never blank; never "No place kept" with a known town |
| MC2 | `context.test.ts`: snapped id wins only within 40 m, else nearest within 40 m, else none; an unnamed street is none |
| MC3 | `context.test.ts`: "At the start", minutes in words, hours, pauses excluded; "On its own" |
| MC4 | `context.test.ts`: part of day at the boundaries; weekday wording through `whenLine` |
| MC5 | `context.test.ts`: the immediately previous capture within 10 walked minutes by kind; an intervening capture names that one; not at 11; a deleted one never; never its words |
| MC6 | `shell.test.ts`: `contextFor(['a'])` reads for `a` only, once per open; a repeat call, a re-render and Another read nothing |
| MC17 | `shell.test.ts`: pending and failed (a rejecting `getSegmentsIn`) make no place claim; the next call asks again |
| MC7 | `context.test.ts`: no digit in the walk-time clause or any sentence written here across a range of durations; a street with a digit is passed through |
| MC8 | `shell.test.ts` (restore moment, thread, word) + e2e: the Hidden list, a row with no picture or words until opened, Bring back |
| MC9 | `shell.test.ts` (off empties the order, kept in meta, survives a reload) + e2e: the quiet line, no top card, no Another |
| MC10 | `shell.test.ts` (forget clears the lists and renames, keeps `off`, not moments) + e2e: one confirmation in the sheet, naming what returns |
| MC11 | `copy.test.ts`: "Fewer like this: harbor" (at most one word) and the bare form; the words appear in Hidden (shell test) |
| MC12 | `shell.test.ts`: a pre-slice stored value, and a non-boolean `off`, read as on; nothing restored |
| MC13 | `feed.test.ts`: strictly newest first with a thread present, ties by id; replaces RM17's thread-first test |
| MC14 | `copy.test.ts`: every string in `copy.ts` asserted verbatim; e2e: the empty state reads "Nothing kept yet." |
| MC15 | e2e: an owner's note is italic, a placeholder is upright (computed style) |
| MC16 | `context.test.ts` + `copy.test.ts`: the no-place and on-its-own wording |

RM17's thread-leads test (`feed.test.ts`) changes with MC13, as the owner chose; `specs/resurfaced-moments` gets a line in its record.

## Order of work

1. IN_PROGRESS entry in `scripts/features.js`, `docs/STATUS.md` row, the todos committed first (`check:test-first`).
2. Pure modules (`context`, `copy`, `prefs`), then `feed`, then the shell's `contextFor` and the restores.
3. Views and the header menu; the journey; docs; `/docs-gc`.

## Not in this slice, and why

Owner-made threads, a share for unworded moments, visible stop words, lows and finds, search and the map lens, a dwell register: each is its own slice and the first needs a decision about who may start a thread. A stored place label: a migration for little that the street cache does not already answer.

## Native

Nothing native is added. The per-moment `getSegmentsIn` read over SQLite and the new screens have not run on a device; they go in `docs/NATIVE_UNVERIFIED.md` in Do/Expect form.

## Steward findings, triaged (Nov 5)

The steward read the spec and plan with no code. Two breaches, five drifts, one tone issue, eight plan gaps; all accepted.

1. A card could show no context while it loads, or "Not placed" when the read failed: **accepted**, MC17 (pending and failed make no place claim).
2. The snapped street was stated with no distance check: **accepted**, MC2 (40 m for the snapped street too).
3. "just after a photo" when it was not adjacent: **accepted**, MC5 (the immediately previous capture, walked minutes, not deleted).
4. Forget my choices also reset the switch: **accepted**, MC10 (the switch keeps its state; the confirmation names what returns).
5. The off state was silent: **accepted**, MC9 (a quiet line; scope is the top card and Another only; an empty Memories shows the empty state).
6. Old walks lose their place after a tile-build change: **accepted in part**, MC1 (the walk's town alone, never "No place kept" when the town is known). Re-deriving a street from the trace is deferred, and is for the owner (below).
7. "Not placed" reads as a failure: **accepted**, "No place kept" and MC16.
8. Hidden shows hidden moments openly: **accepted**, MC8 (kind and context line, no picture or words until opened; no copy says "private"; no gate, since hiding was never privacy).
9. Plan gaps: the town's source (MC1), the timezone and part-of-day boundaries (MC4), MC7's digits in street names, MC6's tests that cannot fail, MC11's tally and "as the owner wrote them", MC14's coverage, MC12's non-boolean, MC13's tiebreak: **all accepted** and written into the criteria and the test table above.

## For you to confirm

- **Missing street:** the town alone is shown, and a street is not re-derived from the trace on a read. Say if you would rather have it re-derived (a cache write from the screen).
- **The switch's scope:** the top card and Another only. Say if it should also quiet the faint revisit pins on a walk.
- **Hidden is not gated.** Anyone who opens the phone and the menu sees that moments were hidden, as kind and context only.
