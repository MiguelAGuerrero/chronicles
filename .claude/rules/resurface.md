---
paths:
  - "src/lib/resurface/**"
  - "src/components/chronicle/**"
  - "src/lib/__tests__/resurface/**"
---
# Resurfaced moments (Chronicle's Memories)

Chronicle opens on Memories: one resurfaced moment, the threads the user keeps coming back to, and Lately. The spec is `specs/resurfaced-moments/spec.md` (RM1-RM25); the owner's calls are in `docs/decisions/0098-chronicle-opens-on-memories.md`. The codemap is in `docs/ARCHITECTURE.md`.

- **Nothing is a score.** Threads are ranked internally (`Thread.score`), and nothing ranked, weighted or counted is ever shown. Every sentence comes from `lib/resurface/lines.ts`, which writes numbers as words; a test checks no digit leaves it (RM22). Dates and a memo's length are the only digits on Memories.
- **Signals are the extension point** (`types.ts`, `extractors.ts`). `deriveThreads`, the feed and the shell read `Signal`s and nothing else. A transcriber fills a memo's `MomentView.words` (through `ResurfaceOptions.transcript`), or a new `SignalExtractor` is added to `DEFAULT_EXTRACTORS`; neither touches the feed. Never read `Capture` fields in `threads.ts`, `pick.ts` or `feed.ts`.
- **Not the owner's threads.** Owner-made threads (`lib/threads`, decision 0102) are stored and separate: this module never imports them, and they never import this one. A Chronicle thread can be copied into one with **Keep as my thread**.
- **Derived, never stored** (RM23). Threads are recomputed from the captures each time Memories reads them; the only write is meta `resurface_prefs` (ids and terms, never text from a moment). A derivation rule change bumps `THREAD_RULES`.
- **Pure core, one shell.** `compose` takes the clock, the seed and the hidden ids as arguments. A delete runs it again (the view passes `useHidden`), so a thread under three moments leaves the rail at once (RM19).
- **The top card must not reshuffle itself.** `prefs.lastShown` changes as soon as a card is shown; the order is composed with `state.lastShownAtOpen`, fixed at load (RM8).
- **A thread is a term in three moments on two days** (`THREAD_MIN_MOMENTS`, `THREAD_MIN_DAYS`), and not one in more than 40% of all moments once there are ten (`THREAD_MAX_SHARE`). English only: the stop-word list is in `terms.ts`.
- **Chronicle opens on Memories** (RM1): `chronicleSection` (store) is told of every route by the root layout, and resets unless the route is a replay, a day or Chronicle. The first replay after a walk sets Memories as it mounts (RM3). Map, Walks and Days mount the old `ChronicleMap` with `key={section}`, under a `SafeAreaInsetsContext` whose top is 0 (the section bar took it).
- **Views never import `db`.** A note edited in the viewer goes through `resurface.saveNote`; an edit through `captureEdits` and then `resurface.patch`.
- **E2E:** older journeys that expect the map open Chronicle with `tabTo(pg, 'chronicle')`, which now clicks Map when Memories is up; `tabTo(pg, 'chronicle', 'memories')` stays on Memories.
- **A tapped reminder opens on Memories too** (NV13): `MemoriesScreen` carries the same `onRecallOpen` handler and cold-start `takeRecallOpen` as the map's screen, since only one of the two is mounted. If you change one, change both.
- **Choices are written in a chain and Undo is per choice** (audit 2, 3, 10): each choice returns a `PrefsChange { before, after, saved }`; `undo(change)` removes only what that change added (`revertChange`), so a later rename or hide stays. A read waits for pending writes, and the newest read wins.
- **A new open and a refresh differ** (audit 4): `load()` starts a new open (a new seed, the top card first); `refresh()` reads again and keeps the open's seed, order and place. `useResurface` loads when `chronicleSection.visit()` changed (the app was elsewhere), else refreshes.
- **The Map keeps its view** (audit 8): `ChronicleMap` saves its camera and framed places into `chronicleSection.keepMap` as it unmounts and starts from them.
- **Lately** puts what was kept in the last day first (the owner's call), then week by week with threads leading.
