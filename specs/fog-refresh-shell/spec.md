<!-- Fog refresh, the first shell. Written in the repo first (2026-11-04) from the owner's go-ahead in session; an
     engineering slice (functional core, the walk screen moved one effect cluster at a time, decision 0073). -->

# Fog refresh: the first shell (FR)

The walk screen's fog refresh is one effect in `src/app/walk.tsx` that reads the map, writes streets and places, reads streets and credited ids back, decides which pieces are fog and which are walked, and sets state, guarded by refs. Its rules can only be tested by the e2e. This slice moves it out: the decisions to a core module with unit tests, the effects to the app's first shell, tested against `fakePorts()`, and the screen keeps only the call and the drawing. The rules for shells land with it. Nothing changes for the walker: the same fog, at the same moments.

## Criteria

1. **FR1 · When the fog is read.** On the walk's first fix, then once the walker is 100 m from where the last read began. Never while riding, before the tile build is known, or while a read is under way (a fix during one is dropped, not queued).
2. **FR2 · Fog and walked.** Of the cached street pieces within 1 km of the walker, by distance to the line: credited pieces are walked; the rest are fog, except pieces whose middle this walk's trace passed within 20 m.
3. **FR3 · Reading the map.** A complete read (z14) with roads, under a known build, stores its streets before the fog is read, and its places without the fog waiting for them. An incomplete read stores nothing, and the next fix reads again even within 100 m. Under the `unknown` build nothing is stored; the fog still comes from what is cached.
4. **FR4 · Credited streets** are read once per walk screen (they change only at a stop).
5. **FR5 · Failures.** A failed street or place write still draws the fog from the cache. A failed read of the cache leaves the fog as it was, and the next read waits for the next 100 m.
6. **FR6 · A closed screen.** A read that ends after the walk screen has closed changes nothing.
7. **FR7 · The screen holds no fog logic.** `walk.tsx` neither reads nor writes streets, places or credited ids for the fog: it hands each fix to the fog shell and draws the shell's fog and walked.
8. **FR8 · Rules for shells.** A shell module that imports the `db`, `recorder` or `notifier` singletons fails lint, with a message naming the fix (take `ports`, or the part you use, as an argument). The composition root (`lib/ports/index.ts`) is exempt. Shells that import one today are recorded at landing, with their own ceiling.
9. **FR9 · A fog journey.** `E2E_ONLY=fog`: the fog is drawn after the first read, a move under 100 m reads nothing, and a move past 100 m reads once.
10. **FR10 · Nothing changes for the walker.** The `tabs`, `gaps` and `fog` journeys pass, with the render budget the `tabs` journey checks.

## Tests

- Unit (`fog.test.ts`): FR1, FR2 on the core rules; FR3-FR6 on the shell with `fakePorts()` and a fake map read; FR7 over `walk.tsx`'s source. FR8 in `functionalCoreAudit.test.ts`'s style: lint over a snippet in a shell, and the real config.
- E2E: the new `fog` journey (FR9); `tabs` and `gaps` (FR10).
- Native: the shell runs on the phone through `ports` (SQLite) and the native map's `collectView`; neither has run on a device.

## Decisions

- 2026-11-04: the owner said proceed with the next functional-core step: the fog refresh as the first shell.
- Carried from slice 1 (decision 0073): a shell exports a factory taking `ports` (tested with fakes) and the app's constructor built from the real `ports`; views never import `ports`. A view-owned handle (the map's `collectView`) is passed in as a function.
