# Plan: resurfaced moments

Spec: `specs/resurfaced-moments/spec.md` (RM1-RM25). Mock: https://claude.ai/artifact/HqApXsfK4HsvKdvnEXn9gR

Read this, then say go (or what to change). No code has been written.

## Shape

A new feature, `resurface`, with its own folder of pure modules and one shell. The Chronicle route stays; the current map-and-sheet screen becomes three of its four sections.

```
captures (db.capturesBetween)  +  text source (notes, captions, later transcripts)
        │                              │
        └──── MomentView[] ────────────┘          core, pure
                  │
        SignalExtractor[]  ──►  Signal[]           the extension point
                  │
        deriveThreads(signals)  ──►  Thread[]
                  │
   pickResurfaced / buildFeed (+ prefs, seed, now)  ──►  hero, rail, Lately
                  │
        createResurface(ports)  (shell: reads, applies prefs, writes meta)
                  │
        useResurface()  (view hook)  ──►  Memories components
```

The API an intelligence layer plugs into is two small interfaces and nothing else:

```ts
interface MomentView { id; t; kind; walkId; place; words: string | null; media: ... }
interface Signal { term: string; weight: number; source: 'note' | 'caption' | 'transcript' | string }
interface SignalExtractor { id: string; extract(m: MomentView): Signal[] }
```

A transcriber later fills `words` for memos (through a `TextSource` port), or an image tagger adds an extractor. `deriveThreads`, the feed and the shell do not change. A signal's `weight` and `source` are never shown.

## Files

New, pure (`// @layer core`), all in `src/lib/resurface/`:

| File | Holds |
|---|---|
| `types.ts` | `MomentView`, `Signal`, `SignalExtractor`, `Thread`, `Prefs`, `Feed` |
| `terms.ts` | fold, tokenize, drop common words, aliases (RM12) |
| `extractors.ts` | `noteExtractor`, `captionExtractor`, `DEFAULT_EXTRACTORS` (RM13) |
| `threads.ts` | `deriveThreads` (RM11) |
| `pick.ts` | `pickResurfaced`, `nextResurfaced` (RM7, RM8, RM10) |
| `feed.ts` | `buildFeed`: hero, rail, Lately paged (RM17, RM19) |
| `lines.ts` | `whenLine`, `labelFor`, `threadLine`, number words (RM6, RM14, RM22) |
| `prefs.ts` | prefs shape, apply/undo, codec (RM16, RM20, RM21) |

New, shell/view:

| File | Holds |
|---|---|
| `src/lib/resurface/shell.ts` | `createResurface(ports)`: load, hide, less, rename, remove thread, undo; `index.ts` is the app instance (`@layer shell`) |
| `src/lib/resurface/useResurface.ts` | the view hook (`@layer view`), re-reads on `useOnDeleted` and `captureBus` |
| `src/components/chronicle/{SectionBar,Resurfaced,ThreadsRail,ThreadScreen,MomentCard,MemoryMenu}.tsx` | the views |
| `src/components/chronicle/MemoriesScreen.tsx` | the Memories section |

Touched:

- `src/app/(tabs)/chronicle.tsx`: renders `SectionBar` and `MemoriesScreen`, and the current map screen for Walks, Days and Map. To keep the diff small, the existing body stays in place and gets a `section` prop that sets the sheet's mode and height; it is only mounted for those three sections. I will check at the code that this keeps the map's focus and camera handling (`useTabMap`) working; if it does not, the body moves to `components/chronicle/MapSections.tsx` and the route becomes a thin container.
- `src/lib/meta.ts`: one new key, `resurface_prefs`, JSON codec (RM21).
- `src/lib/ports/` and `fakes`: no change expected; `shell.ts` takes `db` and `meta` as ports like the other shells.
- `scripts/features.js`: a new `resurface` feature (source `src/lib/resurface/**`, `src/components/chronicle/**`; journey `resurface`; spec `resurfaced-moments`; rule `resurface`), and `chronicle` keeps its files.

## Data

- No new truth, no new cache, no SQLite migration, no IndexedDB version bump.
- Derived threads are computed on open and not stored. `THREAD_RULES` (a version string in `threads.ts`) exists for the day a cache is added; changing a derivation rule bumps it.
- One meta key: `resurface_prefs`. It holds ids and terms only, not text from moments.

## Tests, one failing test per criterion, written before the code

| Criterion | Test |
|---|---|
| RM1 | e2e `resurface`: opens on Memories, four tabs, tab-list roles |
| RM2 | e2e `chronicle`, `days`, `tabs` re-run (their Map/Walks/Days steps updated to pick the section) |
| RM3 | e2e `replay`: first replay ends on Chronicle's Memories, the walk's moments newest |
| RM4 | `feed.test.ts`: empty → empty feed; e2e: the quiet line and Navigate |
| RM5 | e2e `resurface`: hero shows the note's words and place |
| RM6 | `lines.test.ts`: anniversary, last month-year, thread, plain; `pick.test.ts` label chosen |
| RM7 | `pick.test.ts`: determinism, exclusions (last day, Not this one, deleted, no media), preference order |
| RM8 | `pick.test.ts`: Another cycle, not twice in a row, differs across opens |
| RM9 | e2e: Relive it opens `/replay/<walk>` or `/day/<key>` |
| RM10 | `pick.test.ts`: nothing eligible → null; e2e: no hero card |
| RM11 | `threads.test.ts`: 3 moments / 2 days; one walk repeated is not a thread; order by recurrence |
| RM12 | `terms.test.ts`: fold, plurals, stop words, aliases, display form |
| RM13 | `threads.test.ts`: a fake extractor and a fake transcript add a thread, `deriveThreads` untouched |
| RM14 | `lines.test.ts`: lines contain no digits; e2e: rail absent with none, quiet line |
| RM15 | e2e: tap a thread, quotes, moments newest first, Back |
| RM16 | `shell.test.ts` over `fakePorts()`: rename and remove persist, moments untouched |
| RM17 | `feed.test.ts`: newest first, thread members first within a week, paging by twenty |
| RM18 | e2e: card contents, tap → viewer, tap From → replay |
| RM19 | `shell.test.ts` + e2e: delete hides at once, Undo, thread falls below three |
| RM20 | `prefs.test.ts` + e2e: menu options, effects, toast with Undo |
| RM21 | `shell.test.ts`: one meta key, read before the first pick, survives a reload |
| RM22 | `lines.test.ts` + e2e: the screen's text has no digits outside dates and times |
| RM23 | `shell.test.ts`: only the meta key is written; layer check proves no ports in views |
| RM24 | `perf.test.ts`: 5,000 moments under 1 s |
| RM25 | e2e: roles and names of the hero's buttons, the rail as a list; reduce motion |

New journey: `scripts/e2e/journeys/resurface.js`, seeded through the same fixtures as `chronicle.js` (adds notes across several days so one thread exists).

## Docs

- `docs/decisions/0094-chronicle-opens-on-memories.md` (the owner's calls above).
- `.claude/rules/resurface.md` (traps: no counts shown, signals are the extension point, prefs hold ids not text).
- `docs/PRODUCT.md` (Chronicle section), `docs/ARCHITECTURE.md` (code map and the meta key), `docs/STATUS.md` (a row), `docs/DEFERRED.md` (the deferred list in the spec), `docs/NATIVE_UNVERIFIED.md` (the new views).

## Order of work

0. `npm install` (this container has no `node_modules`), then `npm run check:affected` for a baseline.
1. Pure modules, test first, in this order: `terms`, `extractors`, `threads`, `lines`, `pick`, `feed`, `prefs`.
2. `shell.ts` over `fakePorts()`, the meta key.
3. Views and `useResurface`, then the route and the section bar.
4. The `resurface` journey; update `chronicle`, `days`, `tabs` for the sections.
5. Docs, `/docs-gc`, then typecheck, lint, `npm test`, and the journeys `check:affected` names.

## Not in this slice, and why

Search and the map lens (next, same signals); transcription (needs a native module and a development build); Replay this thread (the replay is built around one walk); finds and lows in the feed (derived rows, not captures). The mock's search bar, "Replay this thread" button, and the "Passed by" card are therefore not built here.

## Native

Nothing native is added. The views are React Native and have only ever been verified on the web build. I will add them to `docs/NATIVE_UNVERIFIED.md`.

## Open assumptions

- The rails and sections look like the mock, in the app's own colors and system font (the mock used them).
- "Stronger moments near the top" in Lately is only the rule in RM17 (thread members first within a week); there is no other ranking.
- Down-weighting ("Show less like this") lowers a term's chance of being picked for the top card and its order in the rail. It does not hide anything.
