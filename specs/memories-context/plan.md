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
| `context.ts` | `partOfDay`, `minutesInLine`, `justAfter(prev, c)`, `nearestStreet(fix, segments, snappedId)`, `placeLine`, `arrivalLine` (MC1-MC5, MC7) |
| `copy.ts` | the toast, empty-state and label sentences as functions and constants (MC11, MC14), so a unit test reads every one |

Touched:

- `types.ts`, `prefs.ts`: `Prefs.off`; `unhideMoment`, `unremoveThread`, `unlessTerms`, `forgetChoices`; `parsePrefs` reads `off` (MC9, MC10, MC12).
- `feed.ts`: `lately(moments, now, limit)` strictly newest first; the `threads` and last-day rules go (MC13). `compose` drops the off switch's top card (`off` empties `order`).
- `shell.ts`: `contextFor(ids)` (a `Map` cached per open, one read per moment, MC6), `restore` methods, `setOff`, `forget`; `ResurfaceState.context: Record<string, string>`.
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
| MC1 | `context.test.ts`: street and town, town alone, "Not placed"; never blank |
| MC2 | `context.test.ts`: snapped id wins, else nearest within 40 m, else none; an unnamed street is none |
| MC3 | `context.test.ts`: "At the start", minutes in words, hours, pauses excluded; "On its own" |
| MC4 | `context.test.ts`: part of day at the boundaries; weekday wording through `whenLine` |
| MC5 | `context.test.ts`: previous capture within 10 minutes by kind, not at 11, absent at the start; never its words |
| MC6 | `shell.test.ts`: `contextFor(['a'])` reads for `a` only, once per open; a second call reads nothing |
| MC7 | `context.test.ts`: no digit in any arrival line across a range of durations |
| MC8 | `shell.test.ts` (restore moment, thread, words) + e2e: the Hidden list and Bring back |
| MC9 | `shell.test.ts` (off empties the order, kept in meta, survives a reload) + e2e: no top card, no Another |
| MC10 | `shell.test.ts` (forget clears the lists and renames, not moments) + e2e: one confirmation in the sheet |
| MC11 | `copy.test.ts`: "Fewer like this: harbor" and the bare form; the words appear in Hidden (shell test) |
| MC12 | `shell.test.ts`: a pre-slice stored value reads as on, nothing restored |
| MC13 | `feed.test.ts`: strictly newest first with a thread present; replaces RM17's thread-first test |
| MC14 | `copy.test.ts`: no "Okay,", no imperative empty state; e2e: the empty state reads "Nothing kept yet." |
| MC15 | e2e: an owner's note is italic, a placeholder is upright (computed style) |

RM17's thread-leads test (`feed.test.ts`) changes with MC13, as the owner chose; `specs/resurfaced-moments` gets a line in its record.

## Order of work

1. IN_PROGRESS entry in `scripts/features.js`, `docs/STATUS.md` row, the todos committed first (`check:test-first`).
2. Pure modules (`context`, `copy`, `prefs`), then `feed`, then the shell's `contextFor` and the restores.
3. Views and the header menu; the journey; docs; `/docs-gc`.

## Not in this slice, and why

Owner-made threads, a share for unworded moments, visible stop words, lows and finds, search and the map lens, a dwell register: each is its own slice and the first needs a decision about who may start a thread. A stored place label: a migration for little that the street cache does not already answer.

## Native

Nothing native is added. The per-moment `getSegmentsIn` read over SQLite and the new screens have not run on a device; they go in `docs/NATIVE_UNVERIFIED.md` in Do/Expect form.
